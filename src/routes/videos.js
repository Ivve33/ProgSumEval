const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const search = req.query.search ? req.query.search.trim() : "";
  const selectVideos = `
    SELECT
      id,
      title,
      language,
      topic,
      duration,
      difficulty,
      youtube_url,
      transcript
    FROM videos
  `;

  if (search) {
    const searchText = `%${search}%`;
    const sql = `
      ${selectVideos}
      WHERE title LIKE ?
        OR language LIKE ?
        OR topic LIKE ?
        OR difficulty LIKE ?
      ORDER BY id ASC
    `;

    db.all(sql, [searchText, searchText, searchText, searchText], (error, rows) => {
      if (error) {
        return res.status(500).json({ error: "Could not load videos." });
      }

      return res.json(rows);
    });

    return;
  }

  db.all(`${selectVideos} ORDER BY id ASC`, (error, rows) => {
    if (error) {
      return res.status(500).json({ error: "Could not load videos." });
    }

    return res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  const videoId = req.params.id;
  const videoSql = `
    SELECT
      id,
      title,
      language,
      topic,
      duration,
      difficulty,
      youtube_url,
      transcript
    FROM videos
    WHERE id = ?
  `;

  db.get(videoSql, [videoId], (videoError, video) => {
    if (videoError) {
      return res.status(500).json({ error: "Could not load video." });
    }

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    const summariesSql = `
      SELECT
        id,
        video_id,
        engine_name,
        summary_text,
        summary_video_path,
        summary_duration,
        completeness_rating,
        clarity_rating,
        coherence_rating
      FROM summaries
      WHERE video_id = ?
      ORDER BY id ASC
    `;

    db.all(summariesSql, [videoId], (summaryError, summaries) => {
      if (summaryError) {
        return res.status(500).json({ error: "Could not load summaries." });
      }

      db.all("SELECT * FROM quizzes WHERE video_id = ? ORDER BY id ASC", [videoId], (quizError, quizzes) => {
        if (quizError) {
          return res.status(500).json({ error: "Could not load quizzes." });
        }

        return res.json({
          video,
          summaries,
          quizzes,
        });
      });
    });
  });
});

module.exports = router;
