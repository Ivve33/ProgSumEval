const videoContainer = document.getElementById("videoContainer");
const summariesContainer = document.getElementById("summariesContainer");
const quizContainer = document.getElementById("quizContainer");
const transcriptContainer = document.getElementById("transcriptContainer");
const videoId = window.location.pathname.split("/").pop();
const quizOptions = [
  ["A", "option_a"],
  ["B", "option_b"],
  ["C", "option_c"],
  ["D", "option_d"],
];

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

function createQuizChoice(quiz, optionValue, optionField) {
  const choiceId = `quiz-${quiz.id}-${optionValue}`;
  const label = document.createElement("label");
  label.className = "quiz-choice";
  label.setAttribute("for", choiceId);

  const input = document.createElement("input");
  input.id = choiceId;
  input.type = "radio";
  input.name = `quiz-${quiz.id}`;
  input.value = optionValue;
  input.dataset.quizId = String(quiz.id);

  const choiceText = document.createElement("span");
  choiceText.textContent = `${optionValue}. ${quiz[optionField]}`;

  label.appendChild(input);
  label.appendChild(choiceText);
  return label;
}

function collectQuizAnswers(quizzes) {
  const answers = {};
  const missingQuizIds = [];

  quizzes.forEach((quiz) => {
    const selectedInput = quizContainer.querySelector(`input[name="quiz-${quiz.id}"]:checked`);

    if (!selectedInput) {
      missingQuizIds.push(quiz.id);
      return;
    }

    answers[String(quiz.id)] = selectedInput.value;
  });

  return { answers, missingQuizIds };
}

function setQuizMessage(messageElement, text, type) {
  messageElement.textContent = text;
  messageElement.className = type ? `quiz-message ${type}` : "quiz-message";
}

function showQuizResults(gradingResult, scoreElement, messageElement, submitButton) {
  const inputs = quizContainer.querySelectorAll("input[type=\"radio\"]");

  inputs.forEach((input) => {
    input.disabled = true;
  });

  gradingResult.results.forEach((result) => {
    const article = quizContainer.querySelector(`[data-quiz-id="${result.quiz_id}"]`);

    if (!article) {
      return;
    }

    const selectedInput = article.querySelector(`input[value="${result.selected_answer}"]`);
    const correctInput = article.querySelector(`input[value="${result.correct_answer}"]`);
    const feedback = article.querySelector(".quiz-feedback");

    if (selectedInput) {
      selectedInput.closest(".quiz-choice").classList.add(
        result.is_correct ? "is-correct-answer" : "is-incorrect-answer"
      );
    }

    if (!result.is_correct && correctInput) {
      correctInput.closest(".quiz-choice").classList.add("is-correct-answer", "is-actual-correct");
    }

    if (feedback) {
      feedback.className = result.is_correct ? "quiz-feedback success" : "quiz-feedback error";
      feedback.textContent = result.is_correct
        ? `Correct. Selected answer ${result.selected_answer} is the correct answer.`
        : `Incorrect. You selected ${result.selected_answer}. Correct answer: ${result.correct_answer}.`;
    }
  });

  scoreElement.textContent = `Score: ${gradingResult.score}/${gradingResult.total}`;
  scoreElement.className = "quiz-score-summary";
  setQuizMessage(messageElement, "", "");
  submitButton.textContent = "Quiz Submitted";
  submitButton.disabled = true;
}

function submitQuiz(quizzes, messageElement, scoreElement, submitButton) {
  const { answers, missingQuizIds } = collectQuizAnswers(quizzes);

  if (missingQuizIds.length > 0) {
    setQuizMessage(messageElement, "Please answer all questions before submitting.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";
  setQuizMessage(messageElement, "", "");

  fetch(`/api/videos/${videoId}/quiz/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers }),
  })
    .then((response) => {
      return response.json().then((data) => {
        if (!response.ok) {
          throw new Error(data.error || "Could not grade quiz.");
        }

        return data;
      });
    })
    .then((data) => {
      showQuizResults(data, scoreElement, messageElement, submitButton);
    })
    .catch((error) => {
      setQuizMessage(messageElement, error.message || "Could not grade quiz.", "error");
      submitButton.disabled = false;
      submitButton.textContent = "Submit Quiz";
    });
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
    article.dataset.quizId = String(quiz.id);
    addText(article, "h3", `Q${index + 1}. ${quiz.question}`);

    const optionsGroup = document.createElement("div");
    optionsGroup.className = "quiz-options";
    optionsGroup.setAttribute("role", "radiogroup");
    optionsGroup.setAttribute("aria-label", `Question ${index + 1} answer choices`);

    quizOptions.forEach(([optionValue, optionField]) => {
      optionsGroup.appendChild(createQuizChoice(quiz, optionValue, optionField));
    });

    article.appendChild(optionsGroup);
    addText(article, "p", "", "quiz-feedback");
    quizContainer.appendChild(article);
  });

  const scoreElement = addText(quizContainer, "p", "", "quiz-score-summary is-hidden");
  const messageElement = addText(quizContainer, "p", "", "quiz-message");
  messageElement.setAttribute("aria-live", "polite");

  const actions = document.createElement("div");
  actions.className = "quiz-actions";

  const submitButton = document.createElement("button");
  submitButton.type = "button";
  submitButton.textContent = "Submit Quiz";
  submitButton.addEventListener("click", () => submitQuiz(quizzes, messageElement, scoreElement, submitButton));
  actions.appendChild(submitButton);
  quizContainer.appendChild(actions);
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
