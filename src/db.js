const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const databaseDirectory = path.join(__dirname, "..", "database");
const databasePath = path.join(databaseDirectory, "vidsumeval.db");

fs.mkdirSync(databaseDirectory, { recursive: true });

const db = new sqlite3.Database(databasePath, (error) => {
  if (error) {
    console.error("Could not connect to SQLite database:", error.message);
    return;
  }

  console.log("Connected to SQLite database.");
});

function initializeDatabase(callback) {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
      CREATE TABLE IF NOT EXISTS videos (
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

    db.run(`
      CREATE TABLE IF NOT EXISTS summaries (
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

    db.run(`
      CREATE TABLE IF NOT EXISTS quizzes (
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

    db.run(
      `
      CREATE TABLE IF NOT EXISTS submit_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_url TEXT NOT NULL,
        requester_email TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
      callback
    );
  });
}

module.exports = {
  db,
  initializeDatabase,
  databasePath,
};
