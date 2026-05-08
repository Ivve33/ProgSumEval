const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.post("/", (req, res) => {
  const youtubeUrl = req.body.youtube_url ? req.body.youtube_url.trim() : "";
  const requesterEmail = req.body.requester_email ? req.body.requester_email.trim() : null;

  if (!youtubeUrl) {
    return res.status(400).json({ error: "youtube_url is required." });
  }

  const sql = `
    INSERT INTO submit_requests (youtube_url, requester_email, status)
    VALUES (?, ?, 'pending')
  `;

  db.run(sql, [youtubeUrl, requesterEmail], function insertRequest(error) {
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
