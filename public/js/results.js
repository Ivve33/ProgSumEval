const overviewCards = document.getElementById("overviewCards");
const keyInsightHeading = document.getElementById("keyInsightHeading");
const keyInsightSummary = document.getElementById("keyInsightSummary");
const keyInsightComparisons = document.getElementById("keyInsightComparisons");
const keyInsightDifference = document.getElementById("keyInsightDifference");
const keyInsightNote = document.getElementById("keyInsightNote");
const engineTable = document.getElementById("engineTable");
const videoTable = document.getElementById("videoTable");
const rawTable = document.getElementById("rawTable");

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = formatValue(value);
  row.appendChild(cell);
}

function renderOverview(overview) {
  overviewCards.innerHTML = "";
  [
    ["Total videos", overview.total_videos],
    ["Total summaries", overview.total_summaries],
    ["Total quiz questions", overview.total_quiz_questions],
    ["Total participants", overview.participants],
    ["Total evaluation records", overview.total_evaluation_records],
  ].forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "stat-card";
    const number = document.createElement("strong");
    number.textContent = formatValue(value);
    const caption = document.createElement("span");
    caption.textContent = label;
    card.appendChild(number);
    card.appendChild(caption);
    overviewCards.appendChild(card);
  });
}

function formatInsightValue(value, unit) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return `${Number(value).toFixed(2)}${unit || ""}`;
}

function createInsightRow(comparison, className) {
  const row = document.createElement("div");
  row.className = className;

  const label = document.createElement("strong");
  label.textContent = comparison.metric;
  row.appendChild(label);

  if (!Array.isArray(comparison.values) || comparison.values.length === 0) {
    const emptyValue = document.createElement("span");
    emptyValue.textContent = "No available values";
    row.appendChild(emptyValue);
    return row;
  }

  comparison.values.forEach((item) => {
    const value = document.createElement("span");
    value.textContent = `${item.model} ${formatInsightValue(item.value, item.unit)}`;
    row.appendChild(value);
  });

  return row;
}

function renderKeyInsight(insight) {
  const fallbackInsight = {
    title: "Key Insight",
    summary: "No evaluation records are currently available for comparison.",
    comparisons: [],
    difference_score: null,
    note: "Descriptive averages only. No statistical significance testing was performed.",
  };
  const insightToRender = insight || fallbackInsight;

  keyInsightHeading.textContent = insightToRender.title || fallbackInsight.title;
  keyInsightSummary.textContent = insightToRender.summary || fallbackInsight.summary;
  keyInsightComparisons.replaceChildren();
  keyInsightDifference.replaceChildren();
  keyInsightNote.textContent = insightToRender.note || fallbackInsight.note;

  if (!Array.isArray(insightToRender.comparisons) || insightToRender.comparisons.length === 0) {
    return;
  }

  insightToRender.comparisons.forEach((comparison) => {
    keyInsightComparisons.appendChild(createInsightRow(comparison, "key-insight-row"));
  });

  if (insightToRender.difference_score) {
    keyInsightDifference.appendChild(createInsightRow(insightToRender.difference_score, "key-insight-row secondary"));
  }
}

function renderEngineRows(rows) {
  engineTable.innerHTML = "";
  rows.forEach((item) => {
    const row = document.createElement("tr");
    [
      item.model,
      item.count,
      item.avg_quiz_score,
      item.avg_difference_score,
      item.avg_completeness,
      item.avg_clarity,
      item.avg_coherence,
    ].forEach((value) => addCell(row, value));
    engineTable.appendChild(row);
  });
}

function renderVideoRows(rows) {
  videoTable.innerHTML = "";
  rows.forEach((item) => {
    const row = document.createElement("tr");
    [
      `${item.video_code} - ${item.title || "Untitled"}`,
      item.topic,
      item.model,
      item.count,
      item.avg_quiz_score,
      item.avg_difference_score,
      item.avg_completeness,
      item.avg_clarity,
      item.avg_coherence,
    ].forEach((value) => addCell(row, value));
    videoTable.appendChild(row);
  });
}

function renderRawRows(rows) {
  rawTable.innerHTML = "";
  rows.forEach((item) => {
    const row = document.createElement("tr");
    [
      item.participant,
      item.form,
      item.video_code,
      item.video_type,
      item.model,
      item.quiz_score,
      item.difference_score,
      item.completeness,
      item.clarity,
      item.coherence,
    ].forEach((value) => addCell(row, value));
    rawTable.appendChild(row);
  });
}

fetch("/api/results")
  .then((response) => response.json())
  .then((data) => {
    renderOverview(data.overview);
    renderKeyInsight(data.key_insight);
    renderEngineRows(data.by_engine);
    renderVideoRows(data.by_video);
    renderRawRows(data.raw_records);
  })
  .catch(() => {
    overviewCards.innerHTML = "<p class=\"empty-message\">Could not load benchmark results.</p>";
  });
