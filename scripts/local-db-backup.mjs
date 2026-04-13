import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const parseArgs = (argv) => {
  const result = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
    i += 1;
  }

  return result;
};

const getDbNameFromUri = (uri) => {
  try {
    const url = new URL(uri);
    const name = url.pathname.replace(/^\//, "").trim();
    return name || null;
  } catch {
    return null;
  }
};

const toSafeName = (value) => value.replace(/[^a-zA-Z0-9_-]/g, "_");

const detectType = (value) => {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (value instanceof Date) {
    return "date";
  }

  if (value && typeof value === "object" && value._bsontype) {
    return String(value._bsontype).toLowerCase();
  }

  return typeof value;
};

const addType = (map, fieldPath, type) => {
  if (!map.has(fieldPath)) {
    map.set(fieldPath, new Set());
  }

  map.get(fieldPath).add(type);
};

const collectSchema = (value, prefix, map) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }

  Object.entries(value).forEach(([key, fieldValue]) => {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const fieldType = detectType(fieldValue);

    addType(map, fieldPath, fieldType);

    if (fieldType === "object") {
      collectSchema(fieldValue, fieldPath, map);
    }

    if (fieldType === "array") {
      const sampleItems = fieldValue.slice(0, 5);

      sampleItems.forEach((item) => {
        const itemType = detectType(item);
        addType(map, `${fieldPath}[]`, itemType);

        if (itemType === "object") {
          collectSchema(item, `${fieldPath}[]`, map);
        }
      });
    }
  });
};

const inferSchema = (sampleDocs) => {
  const schemaMap = new Map();

  sampleDocs.forEach((doc) => {
    collectSchema(doc, "", schemaMap);
  });

  return Object.fromEntries(
    [...schemaMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([field, types]) => [field, [...types].sort()])
  );
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/local-db-backup.mjs [options]

Options:
  --source-uri <uri>       Source MongoDB URI (defaults to MONGODB_URI)
  --source-db <name>       Source database name (defaults to URI path)
  --local-uri <uri>        Local MongoDB URI (defaults to LOCAL_MONGODB_URI or mongodb://127.0.0.1:27018)
  --local-db <name>        Local backup DB name (defaults to <source-db>_backup)
  --out-dir <path>         Backup output directory (defaults to ../database-backups)
  --sample-size <number>   Number of docs for schema inference per collection (default 100)
  --no-local-sync          Export files only; skip writing to local MongoDB
  --help                   Show this help message
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
const localUri =
  args["local-uri"] || process.env.LOCAL_MONGODB_URI || "mongodb://127.0.0.1:27018";
const localDbName = args["local-db"] || `${sourceDbName}_backup`;
const sampleSize = Math.max(parseInt(args["sample-size"], 10) || 100, 1);
const syncToLocal = !args["no-local-sync"];
const outDir = path.resolve(
  args["out-dir"] || path.join(process.cwd(), "..", "database-backups")
);

const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
const backupDir = path.join(outDir, `${toSafeName(sourceDbName)}-${timestamp}`);

await fsPromises.mkdir(backupDir, { recursive: true });

const sourceClient = new MongoClient(sourceUri);
const localClient = syncToLocal ? new MongoClient(localUri) : null;

const summary = {
  generatedAt: new Date().toISOString(),
  sourceDatabase: sourceDbName,
  localDatabase: syncToLocal ? localDbName : null,
  outputDirectory: backupDir,
  collections: [],
};

try {
  console.log(`[backup] Connecting to source database ${sourceDbName}...`);
  await sourceClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);

  let localDb = null;
  if (localClient) {
    console.log(`[backup] Connecting to local database ${localDbName}...`);
    await localClient.connect();
    localDb = localClient.db(localDbName);
  }

  const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();

  for (const { name } of collections) {
    const sourceCollection = sourceDb.collection(name);
    const collectionFilePath = path.join(backupDir, `${toSafeName(name)}.jsonl`);

    console.log(`[backup] Exporting collection: ${name}`);

    const [estimatedDocuments, indexes, sampleDocs] = await Promise.all([
      sourceCollection.estimatedDocumentCount(),
      sourceCollection.indexes(),
      sourceCollection.find({}, { limit: sampleSize }).toArray(),
    ]);

    const schema = inferSchema(sampleDocs);

    const writer = fs.createWriteStream(collectionFilePath, { encoding: "utf8" });
    const cursor = sourceCollection.find({});

    let exportedDocuments = 0;
    let localBatch = [];
    let localCollection = null;

    if (localDb) {
      localCollection = localDb.collection(name);
      await localCollection.deleteMany({});
    }

    for await (const document of cursor) {
      writer.write(`${JSON.stringify(document)}\n`);
      exportedDocuments += 1;

      if (localCollection) {
        localBatch.push(document);

        if (localBatch.length >= 500) {
          await localCollection.insertMany(localBatch, { ordered: false });
          localBatch = [];
        }
      }
    }

    await new Promise((resolve, reject) => {
      writer.end((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    if (localCollection && localBatch.length > 0) {
      await localCollection.insertMany(localBatch, { ordered: false });
    }

    if (localCollection) {
      for (const index of indexes) {
        if (index.name === "_id_") {
          continue;
        }

        const { key, v, ns, name: _indexName, ...indexOptions } = index;

        try {
          await localCollection.createIndex(key, indexOptions);
        } catch (error) {
          console.warn(
            `[backup] Skipped index ${index.name} on ${name}: ${error.message}`
          );
        }
      }
    }

    summary.collections.push({
      name,
      estimatedDocuments,
      exportedDocuments,
      indexes: indexes.map((index) => ({
        name: index.name,
        key: index.key,
        unique: Boolean(index.unique),
      })),
      schema,
      exportFile: path.basename(collectionFilePath),
    });
  }

  const summaryPath = path.join(backupDir, "schema-summary.json");
  await fsPromises.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`[backup] Backup completed: ${backupDir}`);
  console.log(`[backup] Schema summary: ${summaryPath}`);
  if (localDbName && syncToLocal) {
    console.log(`[backup] Local backup DB: ${localDbName} (${localUri})`);
  }
} finally {
  await sourceClient.close();
  if (localClient) {
    await localClient.close();
  }
}
