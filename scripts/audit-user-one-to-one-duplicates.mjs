import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const DEFAULT_COLLECTIONS = [
  "studentprofiles",
  "facultyprofiles",
  "admissiondetails",
  "academicdetails",
  "contactdetails",
  "localguardians",
  "parentdetails",
  "ptmrecords",
  "careercounsellings",
  "hobbies",
  "clubs",
  "clubevents",
  "moocdatas",
  "miniprojectdatas",
  "activitydatas",
  "proffessionalbodies",
  "pbevents",
  "placementdetails",
  "complaints",
  "feedbackdetails",
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

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/audit-user-one-to-one-duplicates.mjs [options]

Options:
  --source-uri <uri>         MongoDB URI (defaults to MONGODB_URI)
  --source-db <name>         Database name (defaults to URI path or cmrit)
  --collections <csv>        Comma-separated collection names to audit
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

const targetCollections = (
  args.collections
    ? String(args.collections)
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : DEFAULT_COLLECTIONS
).sort();

const reportPath = path.resolve(
  args["out-file"] ||
    path.join(
      process.cwd(),
      "logs",
      `user-one-to-one-duplicate-audit-${toTimestamp()}.json`
    )
);

const report = {
  generatedAt: new Date().toISOString(),
  database: sourceDbName,
  targetCollections,
  summary: {
    scannedCollections: 0,
    missingCollections: 0,
    collectionsWithDuplicates: 0,
    duplicateUserGroups: 0,
    duplicateExtraDocuments: 0,
  },
  results: [],
};

const client = new MongoClient(sourceUri);

try {
  console.log(`[audit] Connecting to ${sourceDbName}...`);
  await client.connect();

  const db = client.db(sourceDbName);
  const availableCollections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name
    )
  );

  for (const collectionName of targetCollections) {
    if (!availableCollections.has(collectionName)) {
      report.summary.missingCollections += 1;
      report.results.push({
        collection: collectionName,
        status: "missing",
      });
      console.log(`[audit] ${collectionName}: missing`);
      continue;
    }

    const collection = db.collection(collectionName);
    const duplicateGroups = await collection
      .aggregate([
        {
          $match: {
            userId: { $exists: true, $ne: null },
          },
        },
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
      ])
      .toArray();

    const [totalDocs, userScopedDocs, distinctUsers] = await Promise.all([
      collection.estimatedDocumentCount(),
      collection.countDocuments({ userId: { $exists: true, $ne: null } }),
      collection.distinct("userId", { userId: { $exists: true, $ne: null } }),
    ]);

    const duplicateExtraDocuments = duplicateGroups.reduce(
      (sum, group) => sum + (group.count - 1),
      0
    );

    report.summary.scannedCollections += 1;
    report.summary.duplicateUserGroups += duplicateGroups.length;
    report.summary.duplicateExtraDocuments += duplicateExtraDocuments;

    if (duplicateGroups.length > 0) {
      report.summary.collectionsWithDuplicates += 1;
    }

    report.results.push({
      collection: collectionName,
      status: "ok",
      totalDocs,
      userScopedDocs,
      distinctUsers: distinctUsers.length,
      duplicateUserGroups: duplicateGroups.length,
      duplicateExtraDocuments,
      sampleDuplicateUsers: duplicateGroups.slice(0, 10).map((group) => ({
        userId: String(group._id),
        count: group.count,
        docIds: group.docIds.map((id) => String(id)),
      })),
    });

    console.log(
      `[audit] ${collectionName}: duplicateUsers=${duplicateGroups.length}, extraDocs=${duplicateExtraDocuments}`
    );
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n[audit] Complete");
  console.log(`[audit] Report: ${reportPath}`);
  console.log(
    `[audit] Collections with duplicates: ${report.summary.collectionsWithDuplicates}`
  );
  console.log(
    `[audit] Duplicate user groups: ${report.summary.duplicateUserGroups}`
  );
  console.log(
    `[audit] Duplicate extra documents: ${report.summary.duplicateExtraDocuments}`
  );
} finally {
  await client.close();
}
