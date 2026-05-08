const express = require("express");
const { db } = require("../db");

const router = express.Router();

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function roundValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(Number(value).toFixed(2));
}

function roundAggregateRows(rows) {
  return rows.map((row) => ({
    ...row,
    avg_quiz_score: roundValue(row.avg_quiz_score),
    avg_difference_score: roundValue(row.avg_difference_score),
    avg_completeness: roundValue(row.avg_completeness),
    avg_clarity: roundValue(row.avg_clarity),
    avg_coherence: roundValue(row.avg_coherence),
  }));
}

router.get("/", async (req, res) => {
  try {
    const overview = await get(`
      SELECT
        (SELECT COUNT(*) FROM videos) AS total_videos,
        (SELECT COUNT(*) FROM summaries) AS total_summaries,
        (SELECT COUNT(*) FROM quizzes) AS total_quiz_questions,
        (SELECT COUNT(*) FROM evaluation_records) AS total_evaluation_records,
        (SELECT COUNT(DISTINCT participant) FROM evaluation_records) AS participants
    `);

    const byEngine = await all(`
      SELECT
        model,
        COUNT(*) AS count,
        AVG(quiz_score) AS avg_quiz_score,
        AVG(difference_score) AS avg_difference_score,
        AVG(completeness) AS avg_completeness,
        AVG(clarity) AS avg_clarity,
        AVG(coherence) AS avg_coherence
      FROM evaluation_records
      WHERE video_type = 'Summary'
      GROUP BY model
      ORDER BY model ASC
    `);

    const byVideo = await all(`
      SELECT
        e.video_code,
        v.title,
        v.topic,
        COALESCE(e.model, 'Original') AS model,
        COUNT(*) AS count,
        AVG(e.quiz_score) AS avg_quiz_score,
        CASE WHEN e.video_type = 'Original' THEN NULL ELSE AVG(e.difference_score) END AS avg_difference_score,
        CASE WHEN e.video_type = 'Original' THEN NULL ELSE AVG(e.completeness) END AS avg_completeness,
        CASE WHEN e.video_type = 'Original' THEN NULL ELSE AVG(e.clarity) END AS avg_clarity,
        CASE WHEN e.video_type = 'Original' THEN NULL ELSE AVG(e.coherence) END AS avg_coherence
      FROM evaluation_records e
      LEFT JOIN videos v ON v.video_code = e.video_code
      GROUP BY e.video_code, e.video_type, e.model
      ORDER BY CAST(SUBSTR(e.video_code, 2) AS INTEGER) ASC,
        CASE COALESCE(e.model, 'Original')
          WHEN 'Original' THEN 0
          WHEN 'VEED' THEN 1
          WHEN 'NotebookLM' THEN 2
          ELSE 3
        END
    `);

    const rawRecords = await all(`
      SELECT
        id,
        participant,
        form,
        video_type,
        video_code,
        COALESCE(model, 'Original') AS model,
        quiz_score,
        difference_score,
        completeness,
        clarity,
        coherence,
        created_at
      FROM evaluation_records
      ORDER BY id ASC
    `);

    return res.json({
      overview,
      by_engine: roundAggregateRows(byEngine),
      by_video: roundAggregateRows(byVideo),
      raw_records: rawRecords,
    });
  } catch {
    return res.status(500).json({ error: "Could not load benchmark results." });
  }
});

module.exports = router;
