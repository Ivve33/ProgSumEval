# Artifact Status

VidSumEval is public, functional, and reusable.

- Demo: https://progsumeval.onrender.com
- Source: https://github.com/Ivve33/VidSumEval
- Dataset DOI: https://doi.org/10.5281/zenodo.21763079

## Reproduction Status

The artifact can be run locally by installing npm dependencies, seeding the SQLite database, and starting the Express server.

## Tested Platforms

- Windows 11
- Ubuntu 22.04 LTS
- Node.js 20.18.0
- npm 10+

## Optional Services

YouTube Data API v3 is optional and only required for YouTube search on the Submit page.

## Core Functionality Without API Keys

The following pages work without any API key:

- /
- /browse
- /video/1
- /results

## Current Benchmark Behavior

- `/video/:id` displays quiz questions as an interactive multiple-choice quiz.
- Correct quiz answers are hidden until the quiz is submitted.
- Quiz grading is performed server-side after submission.
- Interactive quiz attempts are not persisted.
- `/results` includes a dynamically generated Key Insight.
- The Key Insight compares Quiz Score, Completeness, Clarity, Coherence, and Difference Score from stored evaluation records.
- The Key Insight is descriptive only. No statistical significance testing is performed.

## Offline Boundary

VidSumEval does not generate VEED or NotebookLM summaries live. Benchmark data, summary media references, quizzes, and evaluation records are prepared offline.

Submit mode stores tutorial requests for offline review. YouTube Data API v3 remains optional and is only used for YouTube search on the Submit page.
