require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");

const benchmarkPath = path.join(__dirname, "..", "data", "benchmark.json");
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

function extractYouTubeVideoId(youtubeUrl) {
  try {
    const url = new URL(youtubeUrl);

    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v") || "";
    }

    return "";
  } catch {
    return "";
  }
}

function parseIsoDuration(duration) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration || "");

  if (!match) {
    return "";
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function readBenchmarkData() {
  const fileContent = fs.readFileSync(benchmarkPath, "utf8");
  const benchmarkData = JSON.parse(fileContent);

  if (!Array.isArray(benchmarkData.videos)) {
    throw new Error("data/benchmark.json must contain a videos array.");
  }

  return benchmarkData;
}

async function fetchVideoMetadata(videoId) {
  const params = new URLSearchParams({
    part: "contentDetails,snippet",
    id: videoId,
    key: youtubeApiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  const data = await response.json();

  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : "YouTube metadata request failed.";
    throw new Error(message);
  }

  return data.items && data.items.length > 0 ? data.items[0] : null;
}

async function updateVideoMetadata() {
  if (!youtubeApiKey) {
    console.error("YOUTUBE_API_KEY is missing. Create a .env file before running this script.");
    process.exitCode = 1;
    return;
  }

  if (typeof fetch !== "function") {
    console.error("This script requires a Node.js version with built-in fetch support.");
    process.exitCode = 1;
    return;
  }

  const benchmarkData = readBenchmarkData();
  for (const video of benchmarkData.videos) {
    const videoCode = video.video_code || "Unknown video";
    const videoId = extractYouTubeVideoId(video.youtube_url);

    if (!videoId) {
      console.warn(`Warning: Could not extract YouTube video ID for ${videoCode}.`);
      continue;
    }

    try {
      const metadata = await fetchVideoMetadata(videoId);

      if (!metadata || !metadata.contentDetails) {
        console.warn(`Warning: No YouTube metadata found for ${videoCode}.`);
        continue;
      }

      const parsedDuration = parseIsoDuration(metadata.contentDetails.duration);

      if (!parsedDuration) {
        console.warn(`Warning: Could not parse YouTube duration for ${videoCode}.`);
        continue;
      }

      video.duration = parsedDuration;
      video.difficulty = "Medium";
      console.log(`Updated ${videoCode} duration: ${parsedDuration}`);
    } catch (error) {
      console.warn(`Warning: Could not update ${videoCode}: ${error.message}`);
    }
  }

  fs.writeFileSync(benchmarkPath, `${JSON.stringify(benchmarkData, null, 2)}\n`, "utf8");
  console.log("Metadata update complete.");
}

updateVideoMetadata().catch((error) => {
  console.error(`Metadata update failed: ${error.message}`);
  process.exit(1);
});
