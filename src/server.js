require("dotenv").config();

const express = require("express");
const path = require("path");
const { initializeDatabase } = require("./db");
const videoRoutes = require("./routes/videos");
const requestRoutes = require("./routes/requests");
const resultRoutes = require("./routes/results");
const youtubeRoutes = require("./routes/youtube");

const app = express();
const PORT = process.env.PORT || 3000;

const publicDirectory = path.join(__dirname, "..", "public");
const videosDirectory = path.join(publicDirectory, "videos");
const viewsDirectory = path.join(__dirname, "..", "views");

app.use(express.json());
app.use(express.static(publicDirectory));
app.use("/videos", express.static(videosDirectory));

app.get("/", (req, res) => {
  res.sendFile(path.join(viewsDirectory, "index.html"));
});

app.get("/browse", (req, res) => {
  res.sendFile(path.join(viewsDirectory, "browse.html"));
});

app.get("/results", (req, res) => {
  res.sendFile(path.join(viewsDirectory, "results.html"));
});

app.get("/submit", (req, res) => {
  res.sendFile(path.join(viewsDirectory, "submit.html"));
});

app.get("/video/:id", (req, res) => {
  res.sendFile(path.join(viewsDirectory, "video-details.html"));
});

app.use("/api/videos", videoRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/youtube", youtubeRoutes);

initializeDatabase((error) => {
  if (error) {
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`VidSumEval server is running at http://localhost:${PORT}`);
  });
});
