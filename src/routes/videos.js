const express = require("express");
const { db } = require("../db");

const router = express.Router();
const VALID_ANSWERS = new Set(["A", "B", "C", "D"]);

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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeAnswer(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();
  return VALID_ANSWERS.has(normalizedValue) ? normalizedValue : null;
}

function createPlaceholders(values) {
  return values.map(() => "?").join(", ");
}

function normalizeAggregate(row) {
  if (!row || !row.count) {
    return {
      avg_quiz_score: null,
      avg_difference_score: null,
      avg_completeness: null,
      avg_clarity: null,
      avg_coherence: null,
      count: 0,
    };
  }

  return {
    avg_quiz_score: roundValue(row.avg_quiz_score),
    avg_difference_score: roundValue(row.avg_difference_score),
    avg_completeness: roundValue(row.avg_completeness),
    avg_clarity: roundValue(row.avg_clarity),
    avg_coherence: roundValue(row.avg_coherence),
    count: row.count,
  };
}

function videoSelectSql() {
  return `
    SELECT
      id,
      video_code,
      title,
      channel,
      language,
      topic,
      duration,
      difficulty,
      youtube_url,
      transcript
    FROM videos
  `;
}

async function getVideoEvaluation(videoCode) {
  const original = await get(
    `
      SELECT AVG(quiz_score) AS avg_quiz_score, COUNT(*) AS count
      FROM evaluation_records
      WHERE video_code = ? AND video_type = 'Original'
    `,
    [videoCode]
  );

  const summaries = await all(
    `
      SELECT
        model,
        COUNT(*) AS count,
        AVG(quiz_score) AS avg_quiz_score,
        AVG(difference_score) AS avg_difference_score,
        AVG(completeness) AS avg_completeness,
        AVG(clarity) AS avg_clarity,
        AVG(coherence) AS avg_coherence
      FROM evaluation_records
      WHERE video_code = ? AND video_type = 'Summary'
      GROUP BY model
    `,
    [videoCode]
  );

  const summaryLookup = new Map(summaries.map((row) => [row.model, row]));

  return {
    original: {
      avg_quiz_score: roundValue(original ? original.avg_quiz_score : null),
      count: original ? original.count : 0,
    },
    VEED: normalizeAggregate(summaryLookup.get("VEED")),
    NotebookLM: normalizeAggregate(summaryLookup.get("NotebookLM")),
  };
}

router.get("/", async (req, res) => {
  const search = req.query.search ? req.query.search.trim() : "";

  try {
    if (search) {
      const searchText = `%${search}%`;
      const rows = await all(
        `
          ${videoSelectSql()}
          WHERE title LIKE ?
            OR video_code LIKE ?
            OR channel LIKE ?
            OR language LIKE ?
            OR topic LIKE ?
            OR difficulty LIKE ?
          ORDER BY id ASC
        `,
        [searchText, searchText, searchText, searchText, searchText, searchText]
      );

      return res.json(rows);
    }

    const rows = await all(`${videoSelectSql()} ORDER BY id ASC`);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Could not load videos." });
  }
});

router.get("/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const video = await get(`${videoSelectSql()} WHERE id = ?`, [videoId]);

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    const summaries = await all(
      `
        SELECT
          id,
          video_id,
          engine_name,
          summary_text,
          summary_video_path,
          summary_video_url,
          summary_duration,
          completeness_rating,
          clarity_rating,
          coherence_rating
        FROM summaries
        WHERE video_id = ?
        ORDER BY id ASC
      `,
      [videoId]
    );

    const quizzes = await all(
      `
        SELECT
          id,
          video_id,
          question,
          option_a,
          option_b,
          option_c,
          option_d
        FROM quizzes
        WHERE video_id = ?
        ORDER BY id ASC
      `,
      [videoId]
    );
    const evaluation = await getVideoEvaluation(video.video_code);

    return res.json({
      video,
      summaries,
      quizzes,
      evaluation,
    });
  } catch {
    return res.status(500).json({ error: "Could not load video details." });
  }
});

router.post("/:id/quiz/grade", async (req, res) => {
  const videoId = req.params.id;
  const submittedAnswers = req.body ? req.body.answers : null;

  try {
    const video = await get("SELECT id FROM videos WHERE id = ?", [videoId]);

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    const quizQuestions = await all(
      `
        SELECT
          id,
          video_id,
          correct_answer
        FROM quizzes
        WHERE video_id = ?
        ORDER BY id ASC
      `,
      [video.id]
    );

    if (quizQuestions.length === 0) {
      return res.status(400).json({ error: "No quiz questions are available for this video." });
    }

    if (!isPlainObject(submittedAnswers)) {
      return res.status(400).json({ error: "answers must be an object keyed by quiz ID." });
    }

    const submittedQuizIds = Object.keys(submittedAnswers);
    const invalidQuizIds = submittedQuizIds.filter((quizId) => !/^\d+$/.test(quizId));

    if (invalidQuizIds.length > 0) {
      return res.status(400).json({
        error: "Quiz IDs must be numeric strings.",
        invalid_quiz_ids: invalidQuizIds,
      });
    }

    const normalizedAnswers = new Map();
    const invalidAnswers = [];

    for (const quizId of submittedQuizIds) {
      const normalizedAnswer = normalizeAnswer(submittedAnswers[quizId]);

      if (!normalizedAnswer) {
        invalidAnswers.push(quizId);
        continue;
      }

      normalizedAnswers.set(Number(quizId), normalizedAnswer);
    }

    if (invalidAnswers.length > 0) {
      return res.status(400).json({
        error: "Answers must be one of A, B, C, or D.",
        invalid_quiz_ids: invalidAnswers,
      });
    }

    const expectedQuizIds = new Set(quizQuestions.map((quiz) => quiz.id));
    const submittedNumericIds = submittedQuizIds.map(Number);
    const unknownQuizIds = submittedNumericIds.filter((quizId) => !expectedQuizIds.has(quizId));
    const missingQuizIds = quizQuestions
      .filter((quiz) => !normalizedAnswers.has(quiz.id))
      .map((quiz) => quiz.id);

    if (unknownQuizIds.length > 0) {
      const existingRows = await all(
        `SELECT id, video_id FROM quizzes WHERE id IN (${createPlaceholders(unknownQuizIds)})`,
        unknownQuizIds
      );
      const existingQuizIds = new Set(existingRows.map((row) => row.id));
      const wrongVideoQuizIds = existingRows
        .filter((row) => row.video_id !== video.id)
        .map((row) => row.id);
      const notFoundQuizIds = unknownQuizIds.filter((quizId) => !existingQuizIds.has(quizId));

      return res.status(400).json({
        error: "Submitted quiz IDs are unknown or do not belong to this video.",
        wrong_video_quiz_ids: wrongVideoQuizIds,
        unknown_quiz_ids: notFoundQuizIds,
      });
    }

    if (missingQuizIds.length > 0 || submittedNumericIds.length !== quizQuestions.length) {
      return res.status(400).json({
        error: "Please answer every quiz question exactly once.",
        missing_quiz_ids: missingQuizIds,
      });
    }

    let score = 0;
    const results = quizQuestions.map((quiz) => {
      const selectedAnswer = normalizedAnswers.get(quiz.id);
      const isCorrect = selectedAnswer === quiz.correct_answer;

      if (isCorrect) {
        score += 1;
      }

      return {
        quiz_id: quiz.id,
        selected_answer: selectedAnswer,
        correct_answer: quiz.correct_answer,
        is_correct: isCorrect,
      };
    });

    return res.json({
      score,
      total: quizQuestions.length,
      results,
    });
  } catch {
    return res.status(500).json({ error: "Could not grade quiz." });
  }
});

module.exports = router;
