import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const INDEX_SPECS = [
  {
    collection: "attendances",
    key: { userId: 1 },
    options: { name: "idx_attendances_userId" },
  },
  {
    collection: "attendances",
    key: { userId: 1, "semesters.semester": 1 },
    options: { name: "idx_attendances_user_semester" },
  },
  {
    collection: "iats",
    key: { userId: 1 },
    options: { name: "idx_iats_userId" },
  },
  {
    collection: "iats",
    key: { userId: 1, "semesters.semester": 1 },
    options: { name: "idx_iats_user_semester" },
  },
  {
    collection: "externals",
    key: { userId: 1 },
    options: { name: "idx_externals_userId" },
  },
  {
    collection: "externals",
    key: { userId: 1, "semesters.semester": 1 },
    options: { name: "idx_externals_user_semester" },
  },
  {
    collection: "tylscores",
    key: { userId: 1 },
    options: { name: "idx_tylscores_userId" },
  },
  {
    collection: "tylscores",
    key: { userId: 1, "semesters.semester": 1 },
    options: { name: "idx_tylscores_user_semester" },
  },
  {
    collection: "poattainments",
    key: { userId: 1 },
    options: { name: "idx_poattainments_userId" },
  },
  {
    collection: "poattainments",
    key: { userId: 1, "semesters.semester": 1 },
    options: { name: "idx_poattainments_user_semester" },
  },
  {
    collection: "projects",
    key: { userId: 1 },
    options: { name: "idx_projects_userId" },
  },
  {
    collection: "ptmrecords",
    key: { userId: 1 },
    options: { name: "idx_ptmrecords_userId" },
  },
  {
    collection: "parentdetails",
    key: { userId: 1 },
    options: { name: "idx_parentdetails_userId" },
  },
  {
    collection: "contactdetails",
    key: { userId: 1 },
    options: { name: "idx_contactdetails_userId" },
  },
  {
    collection: "complaints",
    key: { userId: 1 },
    options: { name: "idx_complaints_userId" },
  },
  {
    collection: "feedbackdetails",
    key: { userId: 1 },
    options: { name: "idx_feedbackdetails_userId" },
  },
  {
    collection: "conversations",
    key: { mentorId: 1, menteeId: 1, date: -1 },
    options: { name: "idx_conversations_mentor_mentee_date" },
  },
  {
    collection: "conversations",
    key: { conversationId: 1 },
    options: {
      name: "uniq_conversations_conversationId",
      unique: true,
      partialFilterExpression: {
        conversationId: { $type: "string" },
      },
    },
  },
  {
    collection: "messages",
    key: { senderId: 1, createdAt: -1 },
    options: { name: "idx_messages_sender_createdAt_desc" },
  },
  {
    collection: "messages",
    key: { parentType: 1, parentId: 1, createdAt: 1 },
    options: { name: "idx_messages_parent_createdAt_asc" },
  },
  {
    collection: "messages",
    key: { parentType: 1, parentId: 1, createdAt: -1 },
    options: { name: "idx_messages_parent_createdAt_desc" },
  },
];

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

const hasEquivalentIndex = (indexes, spec) => {
  return indexes.some((index) => {
    const sameKey = normalizedJson(index.key) === normalizedJson(spec.key);
    if (!sameKey) {
      return false;
    }

    const sameUnique = Boolean(index.unique) === Boolean(spec.options?.unique);
    if (!sameUnique) {
      return false;
    }

    if (spec.options?.partialFilterExpression) {
      return (
        normalizedJson(index.partialFilterExpression) ===
        normalizedJson(spec.options.partialFilterExpression)
      );
    }

    return true;
  });
};

const hasConflictingNonUnique = (indexes, spec) => {
  if (!spec.options?.unique) {
    return false;
  }

  return indexes.some((index) => {
    const sameKey = normalizedJson(index.key) === normalizedJson(spec.key);
    if (!sameKey) {
      return false;
    }

    return !index.unique;
  });
};

const hasUniqueDuplicates = async (collection, spec) => {
  if (!spec.options?.unique) {
    return false;
  }

  const fields = Object.keys(spec.key);
  const groupId = fields.reduce((acc, field) => {
    acc[field] = `$${field}`;
    return acc;
  }, {});

  const duplicates = await collection
    .aggregate([
      {
        $match: spec.options.partialFilterExpression || {},
      },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      { $limit: 1 },
    ])
    .toArray();

  return duplicates.length > 0;
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/apply-p0-indexes.mjs [options]

Options:
  --source-uri <uri>         MongoDB URI (defaults to MONGODB_URI)
  --source-db <name>         Database name (defaults to URI path or cmrit)
  --apply                    Execute index creation (default is dry run)
  --out-file <path>          JSON report output path
  --help                     Show this help message
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

const reportPath = path.resolve(
  args["out-file"] ||
    path.join(process.cwd(), "logs", `p0-index-enforcement-${toTimestamp()}.json`)
);

const report = {
  generatedAt: new Date().toISOString(),
  database: sourceDbName,
  mode: applyChanges ? "apply" : "dry-run",
  stats: {
    totalSpecs: INDEX_SPECS.length,
    missingCollections: 0,
    existingIndexes: 0,
    planned: 0,
    created: 0,
    skippedDuplicates: 0,
    skippedConflicts: 0,
    errors: 0,
  },
  results: [],
};

const client = new MongoClient(sourceUri);

try {
  console.log(`[indexes] Connecting to ${sourceDbName}...`);
  await client.connect();

  const db = client.db(sourceDbName);
  const availableCollections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name
    )
  );

  for (const spec of INDEX_SPECS) {
    if (!availableCollections.has(spec.collection)) {
      report.stats.missingCollections += 1;
      report.results.push({
        collection: spec.collection,
        key: spec.key,
        status: "missing-collection",
      });
      console.log(`[indexes] ${spec.collection} ${JSON.stringify(spec.key)}: missing`);
      continue;
    }

    const collection = db.collection(spec.collection);
    const indexes = await collection.indexes();

    if (hasEquivalentIndex(indexes, spec)) {
      report.stats.existingIndexes += 1;
      report.results.push({
        collection: spec.collection,
        key: spec.key,
        status: "already-exists",
      });
      console.log(`[indexes] ${spec.collection} ${JSON.stringify(spec.key)}: exists`);
      continue;
    }

    if (hasConflictingNonUnique(indexes, spec)) {
      report.stats.skippedConflicts += 1;
      report.results.push({
        collection: spec.collection,
        key: spec.key,
        status: "skipped-conflicting-non-unique-index",
      });
      console.log(
        `[indexes] ${spec.collection} ${JSON.stringify(spec.key)}: skipped (conflicting non-unique index)`
      );
      continue;
    }

    if (await hasUniqueDuplicates(collection, spec)) {
      report.stats.skippedDuplicates += 1;
      report.results.push({
        collection: spec.collection,
        key: spec.key,
        status: "skipped-duplicate-data",
      });
      console.log(
        `[indexes] ${spec.collection} ${JSON.stringify(spec.key)}: skipped (duplicate data)`
      );
      continue;
    }

    if (!applyChanges) {
      report.stats.planned += 1;
      report.results.push({
        collection: spec.collection,
        key: spec.key,
        status: "planned",
        options: spec.options,
      });
      console.log(`[indexes] ${spec.collection} ${JSON.stringify(spec.key)}: planned`);
      continue;
    }

    try {
      await collection.createIndex(spec.key, spec.options || {});
      report.stats.created += 1;
      report.results.push({
        collection: spec.collection,
        key: spec.key,
        status: "created",
        options: spec.options,
      });
      console.log(`[indexes] ${spec.collection} ${JSON.stringify(spec.key)}: created`);
    } catch (error) {
      report.stats.errors += 1;
      report.results.push({
        collection: spec.collection,
        key: spec.key,
        status: "error",
        error: error.message,
      });
      console.log(
        `[indexes] ${spec.collection} ${JSON.stringify(spec.key)}: error -> ${error.message}`
      );
    }
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n[indexes] Complete");
  console.log(`[indexes] Mode: ${report.mode}`);
  console.log(`[indexes] Report: ${reportPath}`);
  console.log(`[indexes] Planned: ${report.stats.planned}`);
  console.log(`[indexes] Created: ${report.stats.created}`);
  console.log(`[indexes] Skipped duplicates: ${report.stats.skippedDuplicates}`);
  console.log(`[indexes] Errors: ${report.stats.errors}`);
} finally {
  await client.close();
}
