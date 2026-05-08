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

function ensureSubmitRequestMetadataColumns(callback) {
  db.all("PRAGMA table_info(submit_requests)", (error, rows) => {
    if (error) {
      callback(error);
      return;
    }

    const existingColumns = rows.map((row) => row.name);
    const optionalColumns = [
      ["video_title", "TEXT"],
      ["channel_title", "TEXT"],
      ["duration", "TEXT"],
    ];

    function addNextColumn(index) {
      if (index >= optionalColumns.length) {
        callback();
        return;
      }

      const [columnName, columnType] = optionalColumns[index];

      if (existingColumns.includes(columnName)) {
        addNextColumn(index + 1);
        return;
      }

      db.run(`ALTER TABLE submit_requests ADD COLUMN ${columnName} ${columnType}`, (alterError) => {
        if (alterError) {
          callback(alterError);
          return;
        }

        addNextColumn(index + 1);
      });
    }

    addNextColumn(0);
  });
}

function initializeDatabase(callback) {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
      CREATE TABLE IF NOT EXISTS videos (
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

    db.run(`
      CREATE TABLE IF NOT EXISTS summaries (
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
      CREATE TABLE IF NOT EXISTS evaluation_records (
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
    `
    );

    db.run(
      `
      CREATE TABLE IF NOT EXISTS submit_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_url TEXT NOT NULL,
        requester_email TEXT,
        video_title TEXT,
        channel_title TEXT,
        duration TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (error) => {
        if (error) {
          callback(error);
          return;
        }

        ensureSubmitRequestMetadataColumns(callback);
      }
    );
  });
}

module.exports = {
  db,
  initializeDatabase,
  databasePath,
};
