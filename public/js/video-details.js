const videoContainer = document.getElementById("videoContainer");
const summariesContainer = document.getElementById("summariesContainer");
const quizContainer = document.getElementById("quizContainer");
const transcriptContainer = document.getElementById("transcriptContainer");
const videoId = window.location.pathname.split("/").pop();

function addText(parent, tagName, text, className) {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) {
    element.className = className;
  }
  parent.appendChild(element);
  return element;
}

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function createMetadata(video) {
  const list = document.createElement("dl");
  list.className = "meta-list compact";
  [
    ["Code", video.video_code],
    ["Channel", video.channel],
    ["Language", video.language],
    ["Topic", video.topic],
    ["Duration", video.duration || "Not specified"],
    ["Difficulty", video.difficulty || "Not specified"],
  ].forEach(([label, value]) => {
    addText(list, "dt", label);
    addText(list, "dd", value);
  });
  return list;
}

function getYouTubeEmbedUrl(youtubeUrl) {
  try {
    const url = new URL(youtubeUrl);
    let youtubeId = "";

    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      youtubeId = url.pathname.split("/").filter(Boolean)[0];
    }

    if (url.hostname.includes("youtube.com")) {
      youtubeId = url.searchParams.get("v") || "";
    }

    return youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : "";
  } catch {
    return "";
  }
}

function getSummaryEvaluation(evaluation, engineName) {
  if (!evaluation) {
    return null;
  }

  return evaluation[engineName] || null;
}

function renderOriginalVideo(video, evaluation) {
  const heading = document.createElement("div");
  heading.className = "section-heading";
  addText(heading, "p", "Original Tutorial", "eyebrow");
  addText(heading, "h1", video.title);
  videoContainer.appendChild(heading);
  videoContainer.appendChild(createMetadata(video));

  const originalAverage = evaluation && evaluation.original
    ? formatValue(evaluation.original.avg_quiz_score)
    : "-";
  addText(videoContainer, "p", `Original average quiz score: ${originalAverage}`, "note");

  const embedUrl = getYouTubeEmbedUrl(video.youtube_url);

  if (embedUrl) {
    const iframe = document.createElement("iframe");
    iframe.className = "youtube-player";
    iframe.src = embedUrl;
    iframe.title = video.title;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    videoContainer.appendChild(iframe);
  } else {
    addText(videoContainer, "p", "YouTube embed is unavailable for this URL.");
  }

  const youtubeLink = document.createElement("a");
  youtubeLink.href = video.youtube_url;
  youtubeLink.target = "_blank";
  youtubeLink.rel = "noopener noreferrer";
  youtubeLink.textContent = "Open on YouTube";
  youtubeLink.className = "button secondary";
  videoContainer.appendChild(youtubeLink);
}

function renderSummaryMetrics(card, summaryEvaluation) {
  if (!summaryEvaluation || summaryEvaluation.count === 0) {
    addText(card, "p", "Not available yet.", "empty-inline");
    return;
  }

  const metrics = document.createElement("dl");
  metrics.className = "metric-list";
  [
    ["Avg Quiz Score", summaryEvaluation.avg_quiz_score],
    ["Avg Difference Score", summaryEvaluation.avg_difference_score],
    ["Avg Completeness", summaryEvaluation.avg_completeness],
    ["Avg Clarity", summaryEvaluation.avg_clarity],
    ["Avg Coherence", summaryEvaluation.avg_coherence],
    ["Evaluation Count", summaryEvaluation.count],
  ].forEach(([label, value]) => {
    addText(metrics, "dt", label);
    addText(metrics, "dd", formatValue(value));
  });
  card.appendChild(metrics);
}

function renderSummaries(summaries, evaluation) {
  const heading = document.createElement("div");
  heading.className = "section-heading";
  addText(heading, "p", "Side-by-side comparison", "eyebrow");
  addText(heading, "h2", "Summary Comparison");
  summariesContainer.appendChild(heading);

  if (summaries.length === 0) {
    addText(summariesContainer, "p", "No summaries available yet.");
    return;
  }

  const grid = document.createElement("div");
  grid.className = "comparison-grid";

  summaries.forEach((summary) => {
    const article = document.createElement("article");
    article.className = "card summary-card";
    addText(article, "h3", summary.engine_name);

    const player = document.createElement("video");
    player.controls = true;
    player.src = summary.summary_video_url || summary.summary_video_path;
    player.className = "video-player";
    article.appendChild(player);

    if (summary.summary_duration) {
      addText(article, "p", `Summary duration: ${summary.summary_duration}`);
    }

    if (summary.summary_text) {
      addText(article, "p", summary.summary_text);
    }

    renderSummaryMetrics(article, getSummaryEvaluation(evaluation, summary.engine_name));
    grid.appendChild(article);
  });

  summariesContainer.appendChild(grid);
}

function renderQuiz(quizzes) {
  const heading = document.createElement("div");
  heading.className = "section-heading";
  addText(heading, "p", "Assessment items", "eyebrow");
  addText(heading, "h2", "Quiz");
  quizContainer.appendChild(heading);

  if (quizzes.length === 0) {
    addText(quizContainer, "p", "No quiz questions available yet.");
    return;
  }

  quizzes.forEach((quiz, index) => {
    const article = document.createElement("article");
    article.className = "quiz-item";
    addText(article, "h3", `Q${index + 1}. ${quiz.question}`);
    addText(article, "p", `A. ${quiz.option_a}`);
    addText(article, "p", `B. ${quiz.option_b}`);
    addText(article, "p", `C. ${quiz.option_c}`);
    addText(article, "p", `D. ${quiz.option_d}`);
    addText(article, "p", `Correct answer: ${quiz.correct_answer}`, "answer-label");
    quizContainer.appendChild(article);
  });
}

function renderTranscript(transcript) {
  const heading = document.createElement("div");
  heading.className = "section-heading";
  addText(heading, "p", "Source material", "eyebrow");
  addText(heading, "h2", "Transcript");
  transcriptContainer.appendChild(heading);
  addText(transcriptContainer, "p", transcript || "Transcript not added yet.");
}

fetch(`/api/videos/${videoId}`)
  .then((response) => {
    if (!response.ok) {
      throw new Error("Video not found.");
    }

    return response.json();
  })
  .then((data) => {
    renderOriginalVideo(data.video, data.evaluation);
    renderSummaries(data.summaries, data.evaluation);
    renderQuiz(data.quizzes);
    renderTranscript(data.video.transcript);
  })
  .catch(() => {
    addText(videoContainer, "p", "Video not found.");
  });
