const express = require("express");
const { db } = require("../db");

const router = express.Router();
const PRIMARY_INSIGHT_METRICS = [
  {
    key: "avg_quiz_score",
    label: "Quiz Score",
    summaryLabel: "quiz performance",
    unit: "/5",
  },
  {
    key: "avg_completeness",
    label: "Completeness",
    summaryLabel: "completeness",
    unit: "/5",
  },
  {
    key: "avg_clarity",
    label: "Clarity",
    summaryLabel: "clarity",
    unit: "/5",
  },
  {
    key: "avg_coherence",
    label: "Coherence",
    summaryLabel: "coherence",
    unit: "/5",
  },
];
const DIFFERENCE_SCORE_METRIC = {
  key: "avg_difference_score",
  label: "Difference Score",
  unit: "",
};
const INSIGHT_NOTE = "Descriptive averages only. No statistical significance testing was performed.";

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

function formatList(items) {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function createComparison(metric, rows) {
  const values = rows
    .filter((row) => row.model && row[metric.key] !== null && row[metric.key] !== undefined)
    .map((row) => ({
      model: row.model,
      value: row[metric.key],
      unit: metric.unit,
    }));

  return {
    metric: metric.label,
    key: metric.key,
    values,
  };
}

function getMetricLeaders(comparison) {
  if (comparison.values.length === 0) {
    return [];
  }

  const highestValue = Math.max(...comparison.values.map((item) => item.value));
  return comparison.values.filter((item) => item.value === highestValue);
}

function createMetricPhrase(metrics) {
  const metricLabels = metrics.map((metric) => metric.summaryLabel);

  if (metricLabels.length === PRIMARY_INSIGHT_METRICS.length) {
    return "quiz performance and all three summary-quality dimensions";
  }

  return formatList(metricLabels);
}

function createSummary(comparisons, comparableRows) {
  const populatedComparisons = comparisons.filter((comparison) => comparison.values.length > 0);

  if (populatedComparisons.length === 0) {
    return "Summary engine records are available, but comparable quiz and quality averages are not currently available.";
  }

  if (comparableRows.length === 1) {
    return `Across the stored evaluation records, ${comparableRows[0].model} is the only summary engine with available aggregate data for these metrics.`;
  }

  const leaderGroups = new Map();

  populatedComparisons.forEach((comparison) => {
    const leaders = getMetricLeaders(comparison);
    const leaderKey = leaders.map((leader) => leader.model).join("|");

    if (!leaderGroups.has(leaderKey)) {
      leaderGroups.set(leaderKey, {
        leaders,
        metrics: [],
      });
    }

    leaderGroups.get(leaderKey).metrics.push(
      PRIMARY_INSIGHT_METRICS.find((metric) => metric.key === comparison.key)
    );
  });

  if (leaderGroups.size === 1) {
    const [group] = leaderGroups.values();
    const leaderNames = formatList(group.leaders.map((leader) => leader.model));
    const metricPhrase = createMetricPhrase(group.metrics);
    const isTie = group.leaders.length > 1;

    if (isTie) {
      return `${leaderNames} tied for the highest averages across ${metricPhrase} in the current benchmark.`;
    }

    if (comparableRows.length === 2) {
      const otherEngine = comparableRows.find((row) => row.model !== group.leaders[0].model);
      return `${leaderNames} recorded higher averages than ${otherEngine.model} across ${metricPhrase} in the current benchmark.`;
    }

    return `${leaderNames} recorded the highest averages across ${metricPhrase} among summary engines in the current benchmark.`;
  }

  const summaryParts = Array.from(leaderGroups.values()).map((group) => {
    const leaderNames = formatList(group.leaders.map((leader) => leader.model));
    const metricPhrase = createMetricPhrase(group.metrics);

    return `${leaderNames} led ${metricPhrase}`;
  });

  return `Across the current benchmark, ${summaryParts.join(", ")}.`;
}

function buildKeyInsight(byEngineRows) {
  const comparableRows = byEngineRows.filter((row) => row.count > 0);
  const comparisons = PRIMARY_INSIGHT_METRICS.map((metric) => createComparison(metric, comparableRows));
  const differenceScore = createComparison(DIFFERENCE_SCORE_METRIC, comparableRows);

  if (comparableRows.length === 0) {
    return {
      title: "Key Insight",
      summary: "No evaluation records are currently available for comparison.",
      comparisons: [],
      difference_score: {
        ...differenceScore,
        values: [],
      },
      note: INSIGHT_NOTE,
    };
  }

  return {
    title: "Key Insight",
    summary: createSummary(comparisons, comparableRows),
    comparisons,
    difference_score: differenceScore,
    note: INSIGHT_NOTE,
  };
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

    const roundedByEngine = roundAggregateRows(byEngine);

    return res.json({
      overview,
      key_insight: buildKeyInsight(roundedByEngine),
      by_engine: roundedByEngine,
      by_video: roundAggregateRows(byVideo),
      raw_records: rawRecords,
    });
  } catch {
    return res.status(500).json({ error: "Could not load benchmark results." });
  }
});

module.exports = router;
