import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const SCRIPT_NAME = "iat-rollback-local";
const INGEST_SCRIPT_NAME = "iat-ingest-local";
const LOG_DIR = path.join(process.cwd(), "logs", "iat-ingest");

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

const toTimestamp = () => new Date().toISOString().replace(/[.:]/g, "-");

const getDbNameFromUri = (uri) => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, "").trim();
    return dbName || null;
  } catch {
    return null;
  }
};

const maskMongoUri = (uri) => {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return "[unparseable-uri]";
  }
};

const writeJson = async (filePath, payload) => {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
};

const deserializeIatDoc = (serializedDoc) => ({
  ...serializedDoc,
  _id: new ObjectId(serializedDoc._id),
  userId: new ObjectId(serializedDoc.userId),
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const applyChanges = toBoolean(args.apply, false);

  if (!args.manifest) {
    throw new Error(
      "Missing --manifest argument. Example: node scripts/rollback-iat-local.mjs --manifest ./logs/iat-ingest/iat-ingest-manifest-<timestamp>.json"
    );
  }

  const manifestPath = path.resolve(process.cwd(), String(args.manifest));
  const manifestRaw = await fs.readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw);

  if (manifest.script !== INGEST_SCRIPT_NAME) {
    throw new Error(`Unexpected manifest script value: ${manifest.script || "unknown"}`);
  }

  if (!Array.isArray(manifest.operations) || manifest.operations.length === 0) {
    throw new Error("Manifest has no operations to rollback.");
  }

  const sourceUri =
    args["source-uri"] || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!sourceUri) {
    throw new Error("Missing MongoDB URI. Set MONGODB_URI or pass --source-uri.");
  }

  const sourceDb =
    args["source-db"] || manifest.sourceDb || getDbNameFromUri(sourceUri) || "cmrit";

  const client = new MongoClient(sourceUri, {
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 20,
  });

  await client.connect();
  const db = client.db(sourceDb);

  let wouldDelete = 0;
  let wouldRestore = 0;
  let appliedDelete = 0;
  let appliedRestore = 0;
  const failures = [];

  for (const operation of manifest.operations) {
    try {
      if (!operation.previousDoc) {
        wouldDelete += 1;

        if (applyChanges) {
          await db.collection("iats").deleteOne({ userId: new ObjectId(operation.userId) });
          appliedDelete += 1;
        }

        continue;
      }

      wouldRestore += 1;

      if (applyChanges) {
        const previousDoc = deserializeIatDoc(operation.previousDoc);
        await db
          .collection("iats")
          .replaceOne({ _id: previousDoc._id }, previousDoc, { upsert: true });
        appliedRestore += 1;
      }
    } catch (error) {
      failures.push({
        action: operation.action,
        userId: operation.userId,
        usn: operation.usn,
        error: error?.message || String(error),
      });
    }
  }

  await fs.mkdir(LOG_DIR, { recursive: true });
  const timestamp = toTimestamp();

  const report = {
    script: SCRIPT_NAME,
    mode: applyChanges ? "apply" : "dry-run",
    generatedAt: new Date().toISOString(),
    sourceManifest: manifestPath,
    sourceDb,
    sourceUriMasked: maskMongoUri(sourceUri),
    counts: {
      operationsInManifest: manifest.operations.length,
      wouldDelete,
      wouldRestore,
      appliedDelete,
      appliedRestore,
      failedOperations: failures.length,
    },
    failures,
  };

  const reportPath = path.join(LOG_DIR, `iat-rollback-report-${timestamp}.json`);
  await writeJson(reportPath, report);

  await client.close();

  console.log(`[${SCRIPT_NAME}] mode: ${report.mode}`);
  console.log(`[${SCRIPT_NAME}] source manifest: ${manifestPath}`);
  console.log(`[${SCRIPT_NAME}] would delete: ${wouldDelete}`);
  console.log(`[${SCRIPT_NAME}] would restore: ${wouldRestore}`);

  if (applyChanges) {
    console.log(`[${SCRIPT_NAME}] applied delete: ${appliedDelete}`);
    console.log(`[${SCRIPT_NAME}] applied restore: ${appliedRestore}`);
  }

  console.log(`[${SCRIPT_NAME}] failed operations: ${failures.length}`);
  console.log(`[${SCRIPT_NAME}] report: ${reportPath}`);

  if (applyChanges && failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT_NAME}] failed:`, error?.message || error);
  process.exit(1);
});
