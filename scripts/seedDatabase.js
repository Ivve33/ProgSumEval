const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { db, initializeDatabase } = require("../src/db");

const benchmarkPath = path.join(__dirname, "..", "data", "benchmark.json");
const resultsPath = path.join(__dirname, "..", "data", "results.xlsx");
const videosDirectory = path.join(__dirname, "..", "public", "videos");

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });
}

function readBenchmarkData() {
  const fileContent = fs.readFileSync(benchmarkPath, "utf8");
  const benchmarkData = JSON.parse(fileContent);

  if (!Array.isArray(benchmarkData.videos)) {
    throw new Error("data/benchmark.json must contain a videos array.");
  }

  return benchmarkData;
}

function readEvaluationRows() {
  if (!fs.existsSync(resultsPath)) {
    console.warn("Warning: data/results.xlsx was not found. No evaluation records imported.");
    return [];
  }

  const workbook = xlsx.readFile(resultsPath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function normalizeModel(value, videoType) {
  const model = String(value || "").trim();

  if (videoType === "Original" || model === "-" || model === "") {
    return null;
  }

  if (model.toLowerCase() === "veed") {
    return "VEED";
  }

  if (model.toLowerCase() === "notebooklm") {
    return "NotebookLM";
  }

  return model;
}

async function recreateBenchmarkTables() {
  await run("PRAGMA foreign_keys = OFF");
  await run("DROP TABLE IF EXISTS quizzes");
  await run("DROP TABLE IF EXISTS summaries");
  await run("DROP TABLE IF EXISTS videos");
  await run("DROP TABLE IF EXISTS evaluation_records");
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      channel TEXT,
      language TEXT,
      topic TEXT,
      duration TEXT,
      difficulty TEXT,
      youtube_url TEXT NOT NULL,
      transcript TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      engine_name TEXT NOT NULL,
      summary_text TEXT,
      summary_video_path TEXT NOT NULL,
      summary_video_url TEXT,
      summary_duration TEXT,
      completeness_rating REAL,
      clarity_rating REAL,
      coherence_rating REAL,
      FOREIGN KEY(video_id) REFERENCES videos(id)
    )
  `);

  await run(`
    CREATE TABLE quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      FOREIGN KEY(video_id) REFERENCES videos(id)
    )
  `);

  await run(`
    CREATE TABLE evaluation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant TEXT NOT NULL,
      form TEXT NOT NULL,
      video_type TEXT NOT NULL,
      video_code TEXT NOT NULL,
      model TEXT,
      quiz_score REAL,
      completeness REAL,
      clarity REAL,
      coherence REAL,
      difference_score REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function insertVideo(video) {
  return run(
    `
      INSERT INTO videos (
        video_code,
        title,
        channel,
        language,
        topic,
        duration,
        difficulty,
        youtube_url,
        transcript
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      video.video_code,
      video.title,
      video.channel || null,
      video.language || null,
      video.topic || null,
      video.duration || null,
      video.difficulty || null,
      video.youtube_url,
      video.transcript ?? "",
    ]
  );
}

async function insertSummary(videoId, summary) {
  const summaryVideoUrl = summary.summary_video_url || "";
  const summaryVideoPath = `/videos/${summary.summary_video_filename}`;

  return run(
    `
      INSERT INTO summaries (
        video_id,
        engine_name,
        summary_text,
        summary_video_path,
        summary_video_url,
        summary_duration,
        completeness_rating,
        clarity_rating,
        coherence_rating
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      videoId,
      summary.engine_name,
      summary.summary_text ?? "",
      summaryVideoPath,
      summaryVideoUrl || null,
      summary.summary_duration || null,
      summary.completeness_rating ?? null,
      summary.clarity_rating ?? null,
      summary.coherence_rating ?? null,
    ]
  );
}

async function insertQuizQuestion(videoId, quizQuestion) {
  return run(
    `
      INSERT INTO quizzes (
        video_id,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      videoId,
      quizQuestion.question,
      quizQuestion.option_a,
      quizQuestion.option_b,
      quizQuestion.option_c,
      quizQuestion.option_d,
      quizQuestion.correct_answer,
    ]
  );
}

async function insertEvaluationRecord(record) {
  return run(
    `
      INSERT INTO evaluation_records (
        participant,
        form,
        video_type,
        video_code,
        model,
        quiz_score,
        completeness,
        clarity,
        coherence,
        difference_score
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.participant,
      record.form,
      record.video_type,
      record.video_code,
      record.model,
      record.quiz_score,
      record.completeness,
      record.clarity,
      record.coherence,
      record.difference_score,
    ]
  );
}

function prepareEvaluationRecords(rows) {
  const baselineByParticipantForm = new Map();

  for (const row of rows) {
    const videoType = String(row["Video Type"] || "").trim();

    if (videoType === "Original") {
      const key = `${row.Participant}::${row.Form}`;
      baselineByParticipantForm.set(key, toNumber(row["Quiz Score"]));
    }
  }

  return rows.map((row) => {
    const videoType = String(row["Video Type"] || "").trim();
    const key = `${row.Participant}::${row.Form}`;
    const quizScore = toNumber(row["Quiz Score"]);
    const baseline = baselineByParticipantForm.get(key);
    const differenceScore = videoType === "Summary" && quizScore !== null && baseline !== null && baseline !== undefined
      ? quizScore - baseline
      : null;

    return {
      participant: String(row.Participant || "").trim(),
      form: String(row.Form || "").trim(),
      video_type: videoType,
      video_code: String(row["Video ID"] || "").trim(),
      model: normalizeModel(row.Model, videoType),
      quiz_score: quizScore,
      completeness: toNumber(row.Completeness),
      clarity: toNumber(row.Clarity),
      coherence: toNumber(row.Coherence),
      difference_score: differenceScore,
    };
  });
}

async function seedDatabase() {
  const benchmarkData = readBenchmarkData();
  const evaluationRows = prepareEvaluationRecords(readEvaluationRows());

  let videosInserted = 0;
  let summariesInserted = 0;
  let quizQuestionsInserted = 0;
  let evaluationRecordsInserted = 0;
  const missingSummaryFiles = [];

  await recreateBenchmarkTables();

  for (const video of benchmarkData.videos) {
    const videoResult = await insertVideo(video);
    const videoId = videoResult.lastID;
    videosInserted += 1;

    if (Array.isArray(video.summaries)) {
      for (const summary of video.summaries) {
        const summaryFilename = summary.summary_video_filename || "";
        const summaryVideoUrl = summary.summary_video_url || "";
        const summaryFilePath = path.join(videosDirectory, summaryFilename);

        if (!summaryVideoUrl && (!summaryFilename || !fs.existsSync(summaryFilePath))) {
          missingSummaryFiles.push(summaryFilename || "No filename provided");
        }

        await insertSummary(videoId, summary);
        summariesInserted += 1;
      }
    }

    if (Array.isArray(video.quiz)) {
      for (const quizQuestion of video.quiz) {
        await insertQuizQuestion(videoId, quizQuestion);
        quizQuestionsInserted += 1;
      }
    }
  }

  for (const record of evaluationRows) {
    await insertEvaluationRecord(record);
    evaluationRecordsInserted += 1;
  }

  for (const filename of missingSummaryFiles) {
    console.warn(`Warning: Missing summary MP4 file in public/videos/: ${filename}`);
  }

  console.log(`Original videos inserted: ${videosInserted}`);
  console.log(`Summary records inserted: ${summariesInserted}`);
  console.log(`Quiz questions inserted: ${quizQuestionsInserted}`);
  console.log(`Evaluation records inserted: ${evaluationRecordsInserted}`);
  console.log(`Missing local summary files: ${missingSummaryFiles.length}`);
}

initializeDatabase(async (error) => {
  if (error) {
    console.error("Database initialization failed:", error.message);
    db.close();
    process.exit(1);
  }

  try {
    await seedDatabase();
  } catch (seedError) {
    console.error("Seed failed:", seedError.message);
    db.close();
    process.exit(1);
  }

  db.close();
});
