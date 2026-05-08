const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const sql = `
    SELECT
      id,
      youtube_url,
      requester_email,
      video_title,
      channel_title,
      duration,
      status,
      created_at
    FROM submit_requests
    ORDER BY created_at DESC
  `;

  db.all(sql, (error, rows) => {
    if (error) {
      return res.status(500).json({ error: "Could not load requests." });
    }

    return res.json(rows);
  });
});

router.post("/", (req, res) => {
  const youtubeUrl = req.body.youtube_url ? req.body.youtube_url.trim() : "";
  const requesterEmail = req.body.requester_email ? req.body.requester_email.trim() : null;
  const videoTitle = req.body.video_title ? req.body.video_title.trim() : null;
  const channelTitle = req.body.channel_title ? req.body.channel_title.trim() : null;
  const duration = req.body.duration ? req.body.duration.trim() : null;

  if (!youtubeUrl) {
    return res.status(400).json({ error: "youtube_url is required." });
  }

  const sql = `
    INSERT INTO submit_requests (
      youtube_url,
      requester_email,
      video_title,
      channel_title,
      duration,
      status
    )
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;

  db.run(sql, [youtubeUrl, requesterEmail, videoTitle, channelTitle, duration], function insertRequest(error) {
    if (error) {
      return res.status(500).json({ error: "Could not save request." });
    }

    return res.status(201).json({
      message: "Your request has been submitted for offline review.",
      requestId: this.lastID,
    });
  });
});

module.exports = router;
