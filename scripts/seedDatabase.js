const fs = require("fs");
const path = require("path");
const { db, initializeDatabase } = require("../src/db");

const benchmarkPath = path.join(__dirname, "..", "data", "benchmark.json");
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

async function recreateBenchmarkTables() {
  await run("DROP TABLE IF EXISTS quizzes");
  await run("DROP TABLE IF EXISTS summaries");
  await run("DROP TABLE IF EXISTS videos");

  await run(`
    CREATE TABLE videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
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
}

async function insertVideo(video) {
  return run(
    `
      INSERT INTO videos (
        title,
        language,
        topic,
        duration,
        difficulty,
        youtube_url,
        transcript
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      video.title,
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
  const summaryVideoPath = `/videos/${summary.summary_video_filename}`;

  return run(
    `
      INSERT INTO summaries (
        video_id,
        engine_name,
        summary_text,
        summary_video_path,
        summary_duration,
        completeness_rating,
        clarity_rating,
        coherence_rating
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      videoId,
      summary.engine_name,
      summary.summary_text ?? "",
      summaryVideoPath,
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

async function seedDatabase() {
  const benchmarkData = readBenchmarkData();

  let videosInserted = 0;
  let summariesInserted = 0;
  let quizQuestionsInserted = 0;
  const missingSummaryFiles = [];

  await recreateBenchmarkTables();

  for (const video of benchmarkData.videos) {
    const videoResult = await insertVideo(video);
    const videoId = videoResult.lastID;
    videosInserted += 1;

    if (Array.isArray(video.summaries)) {
      for (const summary of video.summaries) {
        const summaryFilename = summary.summary_video_filename || "";
        const summaryFilePath = path.join(videosDirectory, summaryFilename);

        if (!summaryFilename || !fs.existsSync(summaryFilePath)) {
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

  for (const filename of missingSummaryFiles) {
    console.warn(`Warning: Missing summary MP4 file in public/videos/: ${filename}`);
  }

  console.log(`Original videos inserted: ${videosInserted}`);
  console.log(`Summary videos inserted: ${summariesInserted}`);
  console.log(`Quiz questions inserted: ${quizQuestionsInserted}`);
  console.log(`Missing summary MP4 files: ${missingSummaryFiles.length}`);
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
