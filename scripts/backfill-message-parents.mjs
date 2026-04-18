import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const PARENT_SOURCES = [
  { collection: "threads", parentType: "thread" },
  { collection: "privateconversations", parentType: "private" },
  { collection: "groupconversations", parentType: "group" },
];

const MISSING_PARENT_FILTER = {
  $or: [
    { parentType: { $exists: false } },
    { parentType: null },
    { parentId: { $exists: false } },
    { parentId: null },
  ],
};

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

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

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

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/backfill-message-parents.mjs [options]

Options:
  --source-uri <uri>         MongoDB URI (defaults to MONGODB_URI)
  --source-db <name>         Database name (defaults to URI path or cmrit)
  --batch-size <number>      Batch size for message updates (default 500)
  --apply                    Execute updates (default is dry run)
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
const batchSize = Math.max(parseInt(args["batch-size"], 10) || 500, 1);
const applyChanges = toBoolean(args.apply, false);

const reportPath = path.resolve(
  args["out-file"] ||
    path.join(
      process.cwd(),
      "logs",
      `message-parent-backfill-${toTimestamp()}.json`
    )
);

const report = {
  generatedAt: new Date().toISOString(),
  database: sourceDbName,
  mode: applyChanges ? "apply" : "dry-run",
  stats: {
    scannedParents: 0,
    scannedMessageLinks: 0,
    uniqueReferencedMessages: 0,
    conflicts: 0,
    missingParentCandidates: 0,
    plannedUpdates: 0,
    appliedUpdates: 0,
  },
  missingCollections: [],
  conflictSamples: [],
};

const client = new MongoClient(sourceUri);

try {
  console.log(`[backfill] Connecting to ${sourceDbName}...`);
  await client.connect();

  const db = client.db(sourceDbName);
  const availableCollections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name
    )
  );

  if (!availableCollections.has("messages")) {
    throw new Error("messages collection is missing in the target database.");
  }

  const assignments = new Map();
  const conflictSamples = [];

  for (const source of PARENT_SOURCES) {
    if (!availableCollections.has(source.collection)) {
      report.missingCollections.push(source.collection);
      console.log(`[backfill] Skipping missing collection: ${source.collection}`);
      continue;
    }

    console.log(`[backfill] Scanning ${source.collection}...`);

    const cursor = db.collection(source.collection).find(
      {
        messages: {
          $exists: true,
          $type: "array",
          $ne: [],
        },
      },
      {
        projection: { _id: 1, messages: 1 },
      }
    );

    for await (const parentDoc of cursor) {
      report.stats.scannedParents += 1;

      for (const messageId of parentDoc.messages || []) {
        if (!messageId) {
          continue;
        }

        report.stats.scannedMessageLinks += 1;

        const messageKey = String(messageId);
        const nextAssignment = {
          parentType: source.parentType,
          parentId: parentDoc._id,
          sourceCollection: source.collection,
        };

        const existing = assignments.get(messageKey);
        if (!existing) {
          assignments.set(messageKey, nextAssignment);
          continue;
        }

        const isSameAssignment =
          existing.parentType === nextAssignment.parentType &&
          String(existing.parentId) === String(nextAssignment.parentId);

        if (!isSameAssignment) {
          if (conflictSamples.length < 20) {
            conflictSamples.push({
              messageId: messageKey,
              first: {
                parentType: existing.parentType,
                parentId: String(existing.parentId),
                sourceCollection: existing.sourceCollection,
              },
              second: {
                parentType: nextAssignment.parentType,
                parentId: String(nextAssignment.parentId),
                sourceCollection: nextAssignment.sourceCollection,
              },
            });
          }
        }
      }
    }
  }

  report.stats.uniqueReferencedMessages = assignments.size;
  report.stats.conflicts = conflictSamples.length;
  report.conflictSamples = conflictSamples;

  const messageCollection = db.collection("messages");
  const assignmentEntries = [...assignments.entries()];
  const entryChunks = chunkArray(assignmentEntries, batchSize);

  for (const chunk of entryChunks) {
    const assignmentMap = new Map(chunk);
    const messageIds = chunk.map(([messageId]) => new ObjectId(messageId));

    const candidates = await messageCollection
      .find(
        {
          _id: { $in: messageIds },
          ...MISSING_PARENT_FILTER,
        },
        {
          projection: { _id: 1 },
        }
      )
      .toArray();

    report.stats.missingParentCandidates += candidates.length;

    if (candidates.length === 0) {
      continue;
    }

    const operations = [];
    for (const messageDoc of candidates) {
      const assignment = assignmentMap.get(String(messageDoc._id));
      if (!assignment) {
        continue;
      }

      operations.push({
        updateOne: {
          filter: {
            _id: messageDoc._id,
            ...MISSING_PARENT_FILTER,
          },
          update: {
            $set: {
              parentType: assignment.parentType,
              parentId: assignment.parentId,
            },
          },
        },
      });
    }

    report.stats.plannedUpdates += operations.length;

    if (!applyChanges || operations.length === 0) {
      continue;
    }

    const result = await messageCollection.bulkWrite(operations, {
      ordered: false,
    });
    report.stats.appliedUpdates += result.modifiedCount || 0;
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n[backfill] Complete");
  console.log(`[backfill] Mode: ${report.mode}`);
  console.log(`[backfill] Report: ${reportPath}`);
  console.log(`[backfill] Missing parent candidates: ${report.stats.missingParentCandidates}`);
  console.log(`[backfill] Planned updates: ${report.stats.plannedUpdates}`);
  console.log(`[backfill] Applied updates: ${report.stats.appliedUpdates}`);
  if (report.stats.conflicts > 0) {
    console.log(
      `[backfill] Conflicts detected: ${report.stats.conflicts} (see report conflictSamples)`
    );
  }
} finally {
  await client.close();
}
