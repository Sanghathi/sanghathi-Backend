import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const TARGET_COLLECTIONS = [
  "academicdetails",
  "activitydatas",
  "admissiondetails",
  "careercounsellings",
  "clubevents",
  "clubs",
  "complaints",
  "contactdetails",
  "facultyprofiles",
  "feedbackdetails",
  "hobbies",
  "localguardians",
  "miniprojectdatas",
  "moocdatas",
  "parentdetails",
  "pbevents",
  "placementdetails",
  "proffessionalbodies",
  "ptmrecords",
  "studentprofiles",
].sort();

const USER_KEY = { userId: 1 };
const USER_PARTIAL_FILTER = { userId: { $type: "objectId" } };

const parseArgs = (argv) => {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    i += 1;
  }

  return parsed;
};

const getDbNameFromUri = (uri) => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, "").trim();
    return dbName || null;
  } catch {
    return null;
  }
};

const toTimestamp = () => new Date().toISOString().replace(/[.:]/g, "-");

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (value === true) {
    return true;
  }

  return ["1", "true", "yes", "on"].includes(
    String(value).trim().toLowerCase()
  );
};

const normalizedJson = (value) => JSON.stringify(value || {});

const isUserKeyIndex = (index) =>
  normalizedJson(index.key) === normalizedJson(USER_KEY);

const getUserKeyIndexes = (indexes) => indexes.filter(isUserKeyIndex);

const getUniqueUserKeyIndex = (indexes) =>
  indexes.find((index) => isUserKeyIndex(index) && Boolean(index.unique));

const getNonUniqueUserKeyIndexes = (indexes) =>
  indexes.filter((index) => isUserKeyIndex(index) && !Boolean(index.unique));

const chooseIndexName = (collectionName, nonUniqueIndexes) => {
  if (nonUniqueIndexes.length === 1 && nonUniqueIndexes[0].name) {
    return nonUniqueIndexes[0].name;
  }
  return `uniq_${collectionName}_userId`;
};

const getDuplicateStats = async (collection) => {
  const [summary] = await collection
    .aggregate([
      { $match: USER_PARTIAL_FILTER },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $group: {
          _id: null,
          duplicateUserGroups: { $sum: 1 },
          duplicateExtraDocuments: {
            $sum: { $subtract: ["$count", 1] },
          },
        },
      },
    ])
    .toArray();

  const sampleDuplicateUsers = await collection
    .aggregate([
      { $match: USER_PARTIAL_FILTER },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          docIds: { $push: "$_id" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])
    .toArray();

  return {
    duplicateUserGroups: summary?.duplicateUserGroups || 0,
    duplicateExtraDocuments: summary?.duplicateExtraDocuments || 0,
    sampleDuplicateUsers: sampleDuplicateUsers.map((group) => ({
      userId: String(group._id),
      count: group.count,
      docIds: group.docIds.map((id) => String(id)),
    })),
  };
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/enforce-one-to-one-unique-indexes.mjs [options]

Options:
  --source-uri <uri>             MongoDB URI (defaults to MONGODB_URI)
  --source-db <name>             Database name (defaults to URI path or cmrit)
  --apply                        Execute index creation (default is dry run)
  --allow-drop-non-unique        Allow drop/recreate of existing non-unique userId indexes
  --collections <csv>            Comma-separated collection names override
  --out-file <path>              JSON report output path
  --help                         Show this help message
`);
  process.exit(0);
}

const sourceUri = args["source-uri"] || process.env.MONGODB_URI;
if (!sourceUri) {
  throw new Error(
    "Missing source MongoDB URI. Set MONGODB_URI or pass --source-uri."
  );
}

const sourceDbName =
  args["source-db"] || getDbNameFromUri(sourceUri) || "cmrit";
const applyChanges = toBoolean(args.apply, false);
const allowDropNonUnique = toBoolean(args["allow-drop-non-unique"], false);

const targetCollections = (
  args.collections
    ? String(args.collections)
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : TARGET_COLLECTIONS
).sort();

const reportPath = path.resolve(
  args["out-file"] ||
    path.join(
      process.cwd(),
      "logs",
      `one-to-one-unique-index-enforcement-${toTimestamp()}.json`
    )
);

const report = {
  generatedAt: new Date().toISOString(),
  database: sourceDbName,
  mode: applyChanges ? "apply" : "dry-run",
  options: {
    allowDropNonUnique,
  },
  targetCollections,
  stats: {
    scannedCollections: 0,
    missingCollections: 0,
    alreadyUnique: 0,
    plannedCreate: 0,
    plannedUpgrade: 0,
    created: 0,
    upgraded: 0,
    droppedIndexes: 0,
    skippedDuplicates: 0,
    blockedConflicts: 0,
    errors: 0,
  },
  results: [],
};

const client = new MongoClient(sourceUri);

try {
  console.log(`[uniq] Connecting to ${sourceDbName}...`);
  await client.connect();

  const db = client.db(sourceDbName);
  const availableCollections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name
    )
  );

  for (const collectionName of targetCollections) {
    if (!availableCollections.has(collectionName)) {
      report.stats.missingCollections += 1;
      report.results.push({
        collection: collectionName,
        status: "missing-collection",
      });
      console.log(`[uniq] ${collectionName}: missing collection`);
      continue;
    }

    report.stats.scannedCollections += 1;
    const collection = db.collection(collectionName);
    const indexes = await collection.indexes();
    const userKeyIndexes = getUserKeyIndexes(indexes);
    const uniqueUserKeyIndex = getUniqueUserKeyIndex(userKeyIndexes);

    if (uniqueUserKeyIndex) {
      report.stats.alreadyUnique += 1;
      report.results.push({
        collection: collectionName,
        key: USER_KEY,
        status: "already-unique",
        index: uniqueUserKeyIndex.name,
      });
      console.log(`[uniq] ${collectionName}: already unique`);
      continue;
    }

    const duplicateStats = await getDuplicateStats(collection);
    if (duplicateStats.duplicateUserGroups > 0) {
      report.stats.skippedDuplicates += 1;
      report.results.push({
        collection: collectionName,
        key: USER_KEY,
        status: "skipped-duplicates",
        ...duplicateStats,
      });
      console.log(
        `[uniq] ${collectionName}: skipped (duplicates=${duplicateStats.duplicateUserGroups})`
      );
      continue;
    }

    const nonUniqueUserKeyIndexes = getNonUniqueUserKeyIndexes(userKeyIndexes);
    const requiresUpgrade = nonUniqueUserKeyIndexes.length > 0;
    const targetIndexName = chooseIndexName(
      collectionName,
      nonUniqueUserKeyIndexes
    );

    if (!applyChanges) {
      if (requiresUpgrade) {
        report.stats.plannedUpgrade += 1;
        report.results.push({
          collection: collectionName,
          key: USER_KEY,
          status: "planned-upgrade",
          dropRequired: true,
          dropIndexNames: nonUniqueUserKeyIndexes.map((idx) => idx.name),
          createOptions: {
            name: targetIndexName,
            unique: true,
            partialFilterExpression: USER_PARTIAL_FILTER,
          },
        });
        console.log(`[uniq] ${collectionName}: planned upgrade`);
      } else {
        report.stats.plannedCreate += 1;
        report.results.push({
          collection: collectionName,
          key: USER_KEY,
          status: "planned-create",
          createOptions: {
            name: targetIndexName,
            unique: true,
            partialFilterExpression: USER_PARTIAL_FILTER,
          },
        });
        console.log(`[uniq] ${collectionName}: planned create`);
      }
      continue;
    }

    if (requiresUpgrade && !allowDropNonUnique) {
      report.stats.blockedConflicts += 1;
      report.results.push({
        collection: collectionName,
        key: USER_KEY,
        status: "blocked-non-unique",
        message:
          "Non-unique userId index exists. Re-run with --allow-drop-non-unique to upgrade.",
        existingIndexes: nonUniqueUserKeyIndexes.map((idx) => idx.name),
      });
      console.log(`[uniq] ${collectionName}: blocked non-unique conflict`);
      continue;
    }

    try {
      if (requiresUpgrade) {
        for (const existingIndex of nonUniqueUserKeyIndexes) {
          await collection.dropIndex(existingIndex.name);
          report.stats.droppedIndexes += 1;
        }
      }

      await collection.createIndex(USER_KEY, {
        name: targetIndexName,
        unique: true,
        partialFilterExpression: USER_PARTIAL_FILTER,
      });

      if (requiresUpgrade) {
        report.stats.upgraded += 1;
        report.results.push({
          collection: collectionName,
          key: USER_KEY,
          status: "upgraded",
          droppedIndexes: nonUniqueUserKeyIndexes.map((idx) => idx.name),
          createdIndex: targetIndexName,
        });
        console.log(`[uniq] ${collectionName}: upgraded to unique`);
      } else {
        report.stats.created += 1;
        report.results.push({
          collection: collectionName,
          key: USER_KEY,
          status: "created",
          createdIndex: targetIndexName,
        });
        console.log(`[uniq] ${collectionName}: created unique index`);
      }
    } catch (error) {
      report.stats.errors += 1;
      report.results.push({
        collection: collectionName,
        key: USER_KEY,
        status: "error",
        error: error.message,
      });
      console.log(`[uniq] ${collectionName}: error (${error.message})`);
    }
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n[uniq] Complete");
  console.log(`[uniq] Mode: ${report.mode}`);
  console.log(`[uniq] Report: ${reportPath}`);
  console.log(`[uniq] Already unique: ${report.stats.alreadyUnique}`);
  console.log(`[uniq] Planned create: ${report.stats.plannedCreate}`);
  console.log(`[uniq] Planned upgrade: ${report.stats.plannedUpgrade}`);
  console.log(`[uniq] Created: ${report.stats.created}`);
  console.log(`[uniq] Upgraded: ${report.stats.upgraded}`);
  console.log(`[uniq] Dropped indexes: ${report.stats.droppedIndexes}`);
  console.log(`[uniq] Skipped duplicates: ${report.stats.skippedDuplicates}`);
  console.log(`[uniq] Blocked conflicts: ${report.stats.blockedConflicts}`);
  console.log(`[uniq] Errors: ${report.stats.errors}`);
} finally {
  await client.close();
}
