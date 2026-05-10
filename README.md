# VidSumEval

VidSumEval is a Node.js, Express, and SQLite benchmark browser for evaluating AI-generated summaries of programming tutorial videos.

The public tool name used in the paper and user interface is VidSumEval. The GitHub repository and deployment URL may still use ProgSumEval for continuity.

This is not a live summarization tool. It is an offline benchmark browser. The benchmark data, summary videos, quizzes, and evaluation results are prepared offline and then browsed through the website.

## Tech Stack

- Node.js
- Express
- SQLite
- Plain HTML, CSS, and JavaScript

## Data Model

- 10 original YouTube videos
- 20 local summary MP4 files
- 50 quiz questions
- 60 evaluation records

Each original tutorial has two summary videos: one VEED summary and one NotebookLM summary.

## Install

```powershell
npm.cmd install
```

## Seed

```powershell
npm.cmd run seed
```

The seed script reads:

- `data/benchmark.json`
- `data/results.xlsx`

It seeds videos, summaries, quizzes, and evaluation records. It does not delete `submit_requests`.

## Run

```powershell
npm.cmd start
```

## YouTube Search Setup

YouTube search is only used to help users find and select public tutorial videos. Submitted videos are stored for offline review. No live summarization is performed.

1. Enable YouTube Data API v3 in Google Cloud.
2. Create an API key restricted to YouTube Data API v3.
3. Create a `.env` file in the project root:

```text
YOUTUBE_API_KEY=your_key_here
```

4. Run the app:

```powershell
npm.cmd start
```

The API key is read by the Express backend and is not exposed to frontend JavaScript.

## Summary Videos

Place local MP4 files in:

```text
public/videos/
```

Required naming convention:

```text
original_001_veed.mp4
original_001_notebooklm.mp4
...
original_010_veed.mp4
original_010_notebooklm.mp4
```

MP4 files are ignored by Git. For deployment, `summary_video_url` can point to externally hosted MP4 files.

## Results Calculation

Difference Score = Summary Quiz Score - Original Quiz Score within the same participant/form.

Original rows have no difference score. Summary rows are aggregated by model and video in the website API.

## Main Routes

- `/`
- `/browse`
- `/results`
- `/submit`
- `/video/1`

The Home page includes a Paper Citation section and one representative Evaluation Form example link:

```text
https://forms.gle/Ai6e4LxgehtDUZXx5
```

The Video Details and Results pages include Metric Definitions panels for the quiz, difference, completeness, clarity, and coherence metrics. Missing display values are shown as `-`.

## API Routes

- `/api/videos`
- `/api/videos/:id`
- `/api/results`
- `/api/requests`
