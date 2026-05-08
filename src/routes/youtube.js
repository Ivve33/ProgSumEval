const express = require("express");

const router = express.Router();

const MIN_DURATION_SECONDS = 10 * 60;
const MAX_DURATION_SECONDS = 15 * 60;
const EDUCATIONAL_KEYWORDS = [
  "tutorial",
  "learn",
  "explained",
  "programming",
  "coding",
  "java",
  "python",
  "c",
  "c++",
  "javascript",
  "sql",
];
const EXCLUDED_TITLE_WORDS = ["shorts", "live", "podcast", "music", "interview", "news"];

function parseIsoDuration(duration) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration || "");

  if (!match) {
    return 0;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function containsEducationalKeyword(text) {
  const normalizedText = text.toLowerCase();

  return EDUCATIONAL_KEYWORDS.some((keyword) => {
    if (keyword === "c") {
      return /\bc\b/.test(normalizedText);
    }

    return normalizedText.includes(keyword);
  });
}

function hasExcludedTitleWord(title) {
  const normalizedTitle = title.toLowerCase();
  return EXCLUDED_TITLE_WORDS.some((word) => normalizedTitle.includes(word));
}

function isUsefulTutorialVideo(video) {
  const title = video.snippet ? video.snippet.title || "" : "";
  const description = video.snippet ? video.snippet.description || "" : "";
  const durationSeconds = parseIsoDuration(video.contentDetails ? video.contentDetails.duration : "");

  if (durationSeconds < MIN_DURATION_SECONDS || durationSeconds > MAX_DURATION_SECONDS) {
    return false;
  }

  if (hasExcludedTitleWord(title)) {
    return false;
  }

  return containsEducationalKeyword(`${title} ${description}`);
}

async function fetchYoutubeJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : "YouTube request failed.";
    throw new Error(message);
  }

  return data;
}

router.get("/search", async (req, res) => {
  const query = req.query.q ? req.query.q.trim() : "";
  const language = req.query.language ? req.query.language.trim() : "";
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  if (!youtubeApiKey) {
    return res.status(500).json({
      error: "YouTube search is not configured. Manual URL submission is still available.",
    });
  }

  const searchText = language
    ? `${language} ${query} programming tutorial`
    : `${query} programming tutorial`;

  try {
    const searchParams = new URLSearchParams({
      key: youtubeApiKey,
      part: "snippet",
      type: "video",
      maxResults: "10",
      videoDuration: "medium",
      videoEmbeddable: "true",
      q: searchText,
    });
    const searchData = await fetchYoutubeJson(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
    const videoIds = (searchData.items || [])
      .map((item) => item.id && item.id.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return res.json([]);
    }

    const videoParams = new URLSearchParams({
      key: youtubeApiKey,
      part: "contentDetails,snippet",
      id: videoIds.join(","),
    });
    const videoData = await fetchYoutubeJson(`https://www.googleapis.com/youtube/v3/videos?${videoParams}`);

    const results = (videoData.items || [])
      .filter(isUsefulTutorialVideo)
      .map((video) => {
        const durationSeconds = parseIsoDuration(video.contentDetails.duration);
        const thumbnailSet = video.snippet.thumbnails || {};
        const thumbnail = thumbnailSet.medium || thumbnailSet.default || thumbnailSet.high || {};

        return {
          videoId: video.id,
          title: video.snippet.title,
          channelTitle: video.snippet.channelTitle,
          description: video.snippet.description,
          thumbnail: thumbnail.url || "",
          duration: formatDuration(durationSeconds),
          youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
        };
      });

    return res.json(results);
  } catch (error) {
    return res.status(502).json({
      error: "YouTube search is currently unavailable. You can still paste a YouTube URL manually.",
    });
  }
});

module.exports = router;
