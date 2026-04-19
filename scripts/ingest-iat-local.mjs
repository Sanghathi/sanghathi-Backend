import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import XLSX from "xlsx";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const SCRIPT_NAME = "iat-ingest-local";
const DEFAULT_SEMESTER = 6;
const LOG_DIR = path.join(process.cwd(), "logs", "iat-ingest");
const MAX_REPORT_ERRORS = 500;

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

const normalizeHeader = (value = "") =>
  String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

const toCellString = (value) => String(value ?? "").trim();

const isUsnHeader = (header) => header.includes("USN");
const isSemesterHeader = (header) =>
  ["SEM", "SEMESTER", "SEMNO", "SEMNUMBER"].includes(header);
const isSubjectCodeHeader = (header) =>
  header.includes("SUBJECTCODE") || header === "SUBCODE" || header.includes("COURSECODE");
const isSubjectNameHeader = (header) =>
  header.includes("SUBJECTNAME") || header.includes("COURSENAME");
const isIat1Header = (header) =>
  header === "IAT1" || header === "IA1" || header === "TEST1" || header.includes("IAT1");
const isIat2Header = (header) =>
  header === "IAT2" || header === "IA2" || header === "TEST2" || header.includes("IAT2");
const isAverageHeader = (header) =>
  header === "AVG" || header.includes("AVERAGE") || header.includes("IAFINALMARKS") || header.includes("FINALMARKS");

const parseSemester = (value, fallbackSemester) => {
  const raw = toCellString(value);
  if (!raw) {
    return fallbackSemester;
  }

  const numeric = Number(raw);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
};

const parseMarkValue = (value) => {
  const raw = toCellString(value);
  if (!raw) {
    return undefined;
  }

  const upper = raw.toUpperCase();
  if (["NA", "N/A", "NULL", "-"].includes(upper)) {
    return undefined;
  }

  if (["AB", "ABSENT", "NE"].includes(upper)) {
    return upper;
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return String(numeric);
  }

  return raw;
};

const detectHeaderRowIndex = (rows) => {
  const maxRowsToInspect = Math.min(rows.length, 30);

  for (let index = 0; index < maxRowsToInspect; index += 1) {
    const headers = (rows[index] || []).map(normalizeHeader);
    const hasUsn = headers.some(isUsnHeader);
    const hasSubjectCode = headers.some(isSubjectCodeHeader);

    if (hasUsn && hasSubjectCode) {
      return index;
    }
  }

  return 0;
};

const buildColumnLayout = (headerCells) => {
  const headers = headerCells.map(normalizeHeader);

  const usnIndex = headers.findIndex(isUsnHeader);
  const semesterIndex = headers.findIndex(isSemesterHeader);
  const subjectCodeIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => isSubjectCodeHeader(header))
    .map(({ index }) => index);

  if (usnIndex === -1) {
    throw new Error("Could not detect USN column in the uploaded sheet.");
  }

  if (!subjectCodeIndexes.length) {
    throw new Error("Could not detect any SubjectCode columns in the uploaded sheet.");
  }

  const isWide = subjectCodeIndexes.length > 1;
  const groups = [];

  for (let i = 0; i < subjectCodeIndexes.length; i += 1) {
    const codeIndex = subjectCodeIndexes[i];
    const nextCodeIndex = subjectCodeIndexes[i + 1] ?? headers.length;

    let nameIndex = -1;
    let iat1Index = -1;
    let iat2Index = -1;
    let avgIndex = -1;

    for (let cursor = codeIndex + 1; cursor < nextCodeIndex; cursor += 1) {
      const header = headers[cursor];

      if (nameIndex === -1 && isSubjectNameHeader(header)) {
        nameIndex = cursor;
      }

      if (iat1Index === -1 && isIat1Header(header)) {
        iat1Index = cursor;
      }

      if (iat2Index === -1 && isIat2Header(header)) {
        iat2Index = cursor;
      }

      if (avgIndex === -1 && isAverageHeader(header)) {
        avgIndex = cursor;
      }
    }

    if (nameIndex === -1 && codeIndex + 1 < nextCodeIndex) {
      nameIndex = codeIndex + 1;
    }

    groups.push({
      codeIndex,
      nameIndex,
      iat1Index,
      iat2Index,
      avgIndex,
    });
  }

  return {
    usnIndex,
    semesterIndex,
    isWide,
    groups,
    headers,
  };
};

const extractSubjectFromGroup = (row, group, rowNumber) => {
  const code = toCellString(row[group.codeIndex]);
  const name = group.nameIndex >= 0 ? toCellString(row[group.nameIndex]) : "";

  const iat1 = group.iat1Index >= 0 ? parseMarkValue(row[group.iat1Index]) : undefined;
  const iat2 = group.iat2Index >= 0 ? parseMarkValue(row[group.iat2Index]) : undefined;
  const avg = group.avgIndex >= 0 ? parseMarkValue(row[group.avgIndex]) : undefined;

  const hasAnyData = Boolean(code || name || iat1 !== undefined || iat2 !== undefined || avg !== undefined);
  if (!hasAnyData) {
    return { subject: null, error: null };
  }

  if (!code || !name) {
    return {
      subject: null,
      error: `Row ${rowNumber}: SubjectCode/SubjectName missing for one of the subject blocks.`,
    };
  }

  const subject = {
    subjectCode: code,
    subjectName: name,
  };

  if (iat1 !== undefined) {
    subject.iat1 = iat1;
  }
  if (iat2 !== undefined) {
    subject.iat2 = iat2;
  }
  if (avg !== undefined) {
    subject.avg = avg;
  }

  return { subject, error: null };
};

const collectInputRecords = ({ rows, headerRowIndex, layout, targetSemester }) => {
  const grouped = new Map();
  const validationErrors = [];
  let skippedDifferentSemester = 0;

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const rowNumber = rowIndex + 1;

    const usn = toCellString(row[layout.usnIndex]).toUpperCase();
    if (!usn) {
      continue;
    }

    const semester = parseSemester(
      layout.semesterIndex >= 0 ? row[layout.semesterIndex] : undefined,
      targetSemester
    );

    if (!semester) {
      validationErrors.push(`Row ${rowNumber}: Semester is missing or invalid for USN ${usn}.`);
      continue;
    }

    if (semester !== targetSemester) {
      skippedDifferentSemester += 1;
      continue;
    }

    const extractedSubjects = [];

    for (const group of layout.groups) {
      const { subject, error } = extractSubjectFromGroup(row, group, rowNumber);
      if (error) {
        validationErrors.push(error);
      }
      if (subject) {
        extractedSubjects.push(subject);
      }

      if (!layout.isWide) {
        break;
      }
    }

    if (!extractedSubjects.length) {
      continue;
    }

    const recordKey = `${usn}::${semester}`;

    if (!grouped.has(recordKey)) {
      grouped.set(recordKey, {
        usn,
        semester,
        sourceRows: [],
        subjectsByCode: new Map(),
      });
    }

    const record = grouped.get(recordKey);
    record.sourceRows.push(rowNumber);

    for (const subject of extractedSubjects) {
      record.subjectsByCode.set(subject.subjectCode.toUpperCase(), subject);
    }
  }

  const records = Array.from(grouped.values()).map((entry) => ({
    usn: entry.usn,
    semester: entry.semester,
    sourceRows: entry.sourceRows,
    subjects: Array.from(entry.subjectsByCode.values()),
  }));

  return {
    records,
    validationErrors,
    skippedDifferentSemester,
  };
};

const serializeIatDoc = (doc) => ({
  ...JSON.parse(JSON.stringify(doc)),
  _id: String(doc._id),
  userId: String(doc.userId),
});

const resolveMongoUri = (args) =>
  args["source-uri"] || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

const resolveSourceDb = (args, uri) => args["source-db"] || getDbNameFromUri(uri) || "cmrit";

const ensureFileExists = async (filePath) => {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Input file does not exist: ${filePath}`);
  }
};

const writeJson = async (filePath, payload) => {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
};

const buildPlan = async ({ db, records, targetSemester }) => {
  const usns = Array.from(new Set(records.map((record) => record.usn)));

  const profileDocs = await db
    .collection("studentprofiles")
    .find({ usn: { $in: usns } }, { projection: { usn: 1, userId: 1 } })
    .collation({ locale: "en", strength: 2 })
    .toArray();

  const usnToUserId = new Map();

  for (const profile of profileDocs) {
    if (!profile?.usn || !profile?.userId) {
      continue;
    }

    usnToUserId.set(String(profile.usn).trim().toUpperCase(), String(profile.userId));
  }

  const unmatched = [];
  const mappedRecords = [];

  for (const record of records) {
    const userId = usnToUserId.get(record.usn);

    if (!userId) {
      unmatched.push({
        usn: record.usn,
        semester: record.semester,
        sourceRows: record.sourceRows,
      });
      continue;
    }

    mappedRecords.push({
      ...record,
      userId,
    });
  }

  const userIds = Array.from(new Set(mappedRecords.map((record) => record.userId))).map(
    (userId) => new ObjectId(userId)
  );

  const existingDocs = userIds.length
    ? await db.collection("iats").find({ userId: { $in: userIds } }).toArray()
    : [];

  const existingByUserId = new Map(
    existingDocs.map((doc) => [String(doc.userId), doc])
  );

  const plans = [];

  for (const record of mappedRecords) {
    const existing = existingByUserId.get(record.userId);

    if (!existing) {
      plans.push({
        action: "insert-user-doc",
        userId: record.userId,
        usn: record.usn,
        semester: targetSemester,
        sourceRows: record.sourceRows,
        subjects: record.subjects,
        previousDoc: null,
        nextDoc: {
          userId: new ObjectId(record.userId),
          semesters: [
            {
              semester: targetSemester,
              subjects: record.subjects,
            },
          ],
        },
      });
      continue;
    }

    const semesters = Array.isArray(existing.semesters)
      ? existing.semesters.map((semesterRecord) => ({
          semester: Number(semesterRecord.semester),
          subjects: Array.isArray(semesterRecord.subjects) ? semesterRecord.subjects : [],
        }))
      : [];

    const semesterIndex = semesters.findIndex(
      (semesterRecord) => Number(semesterRecord.semester) === targetSemester
    );

    if (semesterIndex === -1) {
      plans.push({
        action: "append-semester",
        userId: record.userId,
        usn: record.usn,
        semester: targetSemester,
        sourceRows: record.sourceRows,
        subjects: record.subjects,
        previousDoc: serializeIatDoc(existing),
        nextDoc: {
          _id: existing._id,
          userId: existing.userId,
          semesters: semesters.concat([
            {
              semester: targetSemester,
              subjects: record.subjects,
            },
          ]),
        },
      });
      continue;
    }

    const updatedSemesters = semesters.map((semesterRecord, index) => {
      if (index !== semesterIndex) {
        return semesterRecord;
      }

      return {
        semester: targetSemester,
        subjects: record.subjects,
      };
    });

    plans.push({
      action: "replace-semester",
      userId: record.userId,
      usn: record.usn,
      semester: targetSemester,
      sourceRows: record.sourceRows,
      subjects: record.subjects,
      previousDoc: serializeIatDoc(existing),
      nextDoc: {
        _id: existing._id,
        userId: existing.userId,
        semesters: updatedSemesters,
      },
    });
  }

  return {
    plans,
    unmatched,
  };
};

const applyPlans = async ({ db, plans }) => {
  const manifestOperations = [];
  const failures = [];

  for (const plan of plans) {
    try {
      if (plan.action === "insert-user-doc") {
        const insertResult = await db.collection("iats").insertOne(plan.nextDoc);

        manifestOperations.push({
          action: plan.action,
          userId: plan.userId,
          usn: plan.usn,
          semester: plan.semester,
          sourceRows: plan.sourceRows,
          previousDoc: null,
          insertedDocId: String(insertResult.insertedId),
        });
        continue;
      }

      await db
        .collection("iats")
        .updateOne({ _id: plan.nextDoc._id }, { $set: { semesters: plan.nextDoc.semesters } });

      manifestOperations.push({
        action: plan.action,
        userId: plan.userId,
        usn: plan.usn,
        semester: plan.semester,
        sourceRows: plan.sourceRows,
        previousDoc: plan.previousDoc,
      });
    } catch (error) {
      failures.push({
        action: plan.action,
        userId: plan.userId,
        usn: plan.usn,
        semester: plan.semester,
        sourceRows: plan.sourceRows,
        error: error?.message || String(error),
      });
    }
  }

  return {
    manifestOperations,
    failures,
  };
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const applyChanges = toBoolean(args.apply, false);

  if (!args.file) {
    throw new Error(
      "Missing --file argument. Example: node scripts/ingest-iat-local.mjs --file ./data/iat6.xlsx"
    );
  }

  const sourceFile = path.resolve(process.cwd(), String(args.file));
  await ensureFileExists(sourceFile);

  const sourceUri = resolveMongoUri(args);
  if (!sourceUri) {
    throw new Error("Missing MongoDB URI. Set MONGODB_URI or pass --source-uri.");
  }

  const sourceDb = resolveSourceDb(args, sourceUri);

  const targetSemester = Number(args.semester ?? DEFAULT_SEMESTER);
  if (!Number.isInteger(targetSemester) || targetSemester <= 0) {
    throw new Error("Invalid semester value. Pass a positive integer using --semester.");
  }

  const workbook = XLSX.readFile(sourceFile, {
    raw: false,
    cellDates: false,
  });

  const sheetName = args.sheet ? String(args.sheet) : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  if (!rows.length) {
    throw new Error("Input sheet is empty.");
  }

  const headerRowIndex = detectHeaderRowIndex(rows);
  const layout = buildColumnLayout(rows[headerRowIndex] || []);

  const { records, validationErrors, skippedDifferentSemester } = collectInputRecords({
    rows,
    headerRowIndex,
    layout,
    targetSemester,
  });

  const client = new MongoClient(sourceUri, {
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 20,
  });

  await client.connect();
  const db = client.db(sourceDb);

  const { plans, unmatched } = await buildPlan({
    db,
    records,
    targetSemester,
  });

  const actionCounts = plans.reduce(
    (accumulator, plan) => {
      accumulator[plan.action] = (accumulator[plan.action] || 0) + 1;
      return accumulator;
    },
    {}
  );

  await fs.mkdir(LOG_DIR, { recursive: true });
  const timestamp = toTimestamp();

  let manifestPath = null;
  let applyFailures = [];
  let appliedCount = 0;

  if (applyChanges) {
    const { manifestOperations, failures } = await applyPlans({ db, plans });

    applyFailures = failures;
    appliedCount = manifestOperations.length;

    const manifest = {
      script: SCRIPT_NAME,
      mode: "apply",
      generatedAt: new Date().toISOString(),
      sourceFile,
      sheetName,
      semester: targetSemester,
      sourceDb,
      sourceUriMasked: maskMongoUri(sourceUri),
      operations: manifestOperations,
    };

    manifestPath = path.join(LOG_DIR, `iat-ingest-manifest-${timestamp}.json`);
    await writeJson(manifestPath, manifest);
  }

  const report = {
    script: SCRIPT_NAME,
    mode: applyChanges ? "apply" : "dry-run",
    generatedAt: new Date().toISOString(),
    sourceFile,
    sheetName,
    semester: targetSemester,
    sourceDb,
    sourceUriMasked: maskMongoUri(sourceUri),
    counts: {
      rowsInSheet: rows.length,
      parsedStudentSemesters: records.length,
      skippedDifferentSemester,
      validationErrors: validationErrors.length,
      unmatchedUsns: unmatched.length,
      plannedWrites: plans.length,
      insertUserDoc: actionCounts["insert-user-doc"] || 0,
      appendSemester: actionCounts["append-semester"] || 0,
      replaceSemester: actionCounts["replace-semester"] || 0,
      appliedWrites: appliedCount,
      failedWrites: applyFailures.length,
    },
    unmatched,
    validationErrors: validationErrors.slice(0, MAX_REPORT_ERRORS),
    failedWrites: applyFailures,
    nextSteps: applyChanges
      ? [
          "Review failedWrites array if failedWrites > 0.",
          "Use the generated manifest with rollback script if you need to revert.",
        ]
      : [
          "Inspect plannedWrites/unmatchedUsns/validationErrors before applying.",
          "Re-run with --apply once the dry-run report looks correct.",
        ],
  };

  const reportPath = path.join(LOG_DIR, `iat-ingest-report-${timestamp}.json`);
  await writeJson(reportPath, report);

  await client.close();

  console.log(`[${SCRIPT_NAME}] mode: ${report.mode}`);
  console.log(`[${SCRIPT_NAME}] source file: ${sourceFile}`);
  console.log(`[${SCRIPT_NAME}] sheet: ${sheetName}`);
  console.log(`[${SCRIPT_NAME}] semester filter: ${targetSemester}`);
  console.log(`[${SCRIPT_NAME}] planned writes: ${report.counts.plannedWrites}`);
  console.log(`[${SCRIPT_NAME}] unmatched USNs: ${report.counts.unmatchedUsns}`);
  console.log(`[${SCRIPT_NAME}] validation errors: ${report.counts.validationErrors}`);

  if (applyChanges) {
    console.log(`[${SCRIPT_NAME}] applied writes: ${report.counts.appliedWrites}`);
    console.log(`[${SCRIPT_NAME}] failed writes: ${report.counts.failedWrites}`);
    console.log(`[${SCRIPT_NAME}] manifest: ${manifestPath}`);
  }

  console.log(`[${SCRIPT_NAME}] report: ${reportPath}`);

  if (applyChanges && applyFailures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT_NAME}] failed:`, error?.message || error);
  process.exit(1);
});
