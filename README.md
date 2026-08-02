# VidSumEval

## Short Description

VidSumEval is a Node.js, Express, and SQLite benchmark browser for evaluating AI-generated summaries of programming tutorial videos.

The public tool name used in the paper and UI is VidSumEval. The GitHub repository and deployment URL may still use ProgSumEval for continuity.

This is not a live summarization tool. It is an offline benchmark browser. Benchmark data, summary videos, quizzes, and evaluation results are prepared offline.

## Artifact Status

- Public and available
- Functional deployed demo
- Reusable source code and dataset

Deployed demo: https://progsumeval.onrender.com

Source repository: https://github.com/Ivve33/ProgSumEval

Dataset archive / DOI: https://doi.org/10.5281/zenodo.20076164

The deployed demo can be used directly without local installation. Local installation is provided for reviewers who want to rebuild the database and run the tool from source.

## Requirements

Tested environment:

- Windows 11
- Ubuntu 22.04 LTS
- Node.js 20.18.0
- npm 10+
- Modern browser: Chrome, Edge, or Firefox

Recommended resources:

- 4 GB RAM minimum
- 2 GB free disk space without local MP4 files
- Around 10 GB free disk space if using local summary MP4 files

## Repository / Artifact Contents

- `package.json`: npm metadata and scripts for installing, seeding, and starting the app.
- `package-lock.json`: locked dependency versions for reproducible npm installs.
- `data/benchmark.json`: benchmark metadata, original video references, summary records, and quiz questions.
- `data/results.xlsx`: offline evaluation results imported into SQLite.
- `scripts/seedDatabase.js`: seed script that builds `database/vidsumeval.db` from the data files.
- `src/`: Express server, database setup, and API routes.
- `views/`: plain HTML pages served by Express.
- `public/`: CSS, JavaScript, and static assets.
- `public/videos/`: optional local MP4 location for summary videos.
- `README.md`: artifact setup and inspection instructions.
- `LICENSE`: source code and dataset/documentation license notes.

## Quick Start

All commands must be run from the project root directory, the directory that contains `package.json`.

After downloading and extracting the artifact:

For Windows PowerShell:

```powershell
cd ProgSumEval
dir package.json
npm.cmd install
npm.cmd run seed
npm.cmd start
```

For macOS/Linux:

```bash
cd ProgSumEval
ls package.json
npm install
npm run seed
npm start
```

Then open:

```text
http://localhost:3000
```

## Install

Windows:

```powershell
npm.cmd install
```

macOS/Linux:

```bash
npm install
```

## Seed the SQLite Database

The SQLite database is generated locally by the seed script. If `database/vidsumeval.db` is missing, run the seed command.

The seed script reads:

- `data/benchmark.json`
- `data/results.xlsx`

Windows:

```powershell
npm.cmd run seed
```

macOS/Linux:

```bash
npm run seed
```

Expected seed output should include:

```text
Connected to SQLite database.
Original videos inserted: 10
Summary records inserted: 20
Quiz questions inserted: 50
Evaluation records inserted: 60
```

The seed script does not delete `submit_requests`.

## Run the Web App

Windows:

```powershell
npm.cmd start
```

macOS/Linux:

```bash
npm start
```

Expected output:

```text
VidSumEval server is running at http://localhost:3000
```

The server should print a local URL such as:

```text
http://localhost:3000
```

Then open:

```text
http://localhost:3000
```

By default, the server uses port 3000. To run on a custom port, set the `PORT` environment variable before starting the app.

Windows:

```powershell
$env:PORT="3100"
npm.cmd start
```

macOS/Linux:

```bash
PORT=3100 npm start
```

## Main Pages to Check

- `/`: Home page with project overview, citation information, and benchmark entry points.
- `/browse`: Browse the original programming tutorial videos in the benchmark.
- `/video/1`: Inspect one original tutorial, its summaries, quiz questions, and evaluation details.
- `/results`: View aggregated offline evaluation results by model and video.
- `/submit`: Submit candidate tutorial requests for offline review; YouTube search is optional.

## YouTube Search Setup Optional

`YOUTUBE_API_KEY` is optional for core artifact evaluation.

Without `YOUTUBE_API_KEY`, these pages still work:

- `/`
- `/browse`
- `/video/1`
- `/results`

The key is only required for YouTube search on `/submit`. Manual URL submission and the core benchmark browser do not require the key.

If the reviewer wants to enable YouTube search:

1. Enable YouTube Data API v3 in Google Cloud.
2. Create an API key restricted to YouTube Data API v3.
3. Create a `.env` file in the project root:

```text
YOUTUBE_API_KEY=your_key_here
```

The API key is read only by the Express backend and is not exposed to frontend JavaScript.

## Summary Videos

Each original tutorial has two AI-generated summaries:

- VEED
- NotebookLM

Local MP4 files are optional and can be placed in:

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

MP4 files are ignored by Git. For deployment, the app can use external `summary_video_url` links instead of local files.

## Data Model

- 10 original YouTube video references
- 20 AI-generated summary MP4 videos
- 50 quiz questions
- 60 evaluation records

## Results Calculation

Difference Score = Summary Quiz Score - Original Quiz Score within the same participant/form.

Original rows have no difference score. Summary rows are aggregated by model and video in the website API.

## API Routes

- `/api/videos`
- `/api/videos/:id`
- `/api/results`
- `/api/requests`
- `/api/youtube/search?q=<query>&language=<language>` (requires `YOUTUBE_API_KEY`)

## Troubleshooting

### A. npm.cmd does not work on macOS/Linux

Use `npm` instead:

```bash
npm install
npm run seed
npm start
```

### B. package.json is not found

You are not in the project root directory. Change into the folder that contains `package.json`.

### C. SQLite database is missing

Run:

```bash
npm run seed
```

### D. YouTube search does not work

Set `YOUTUBE_API_KEY` in `.env`. This affects only YouTube search on `/submit`. The core benchmark pages still work without it.

### E. sqlite3 installation issue

Use Node.js 20.18.0. If needed, run:

```bash
npm install --build-from-source=sqlite3
```

### F. Port already in use

Stop the process using port 3000 or run the app with a different `PORT` environment variable.

## License

Source code: MIT License.

Dataset and documentation: CC BY 4.0 unless otherwise noted.

Original YouTube videos are referenced by URL only and are not redistributed. They remain under their original owners' terms.

## Notes for Artifact Reviewers

The easiest way to inspect the artifact is:

1. Open the deployed demo.
2. Review `/browse`, `/video/1`, and `/results`.
3. For local reproduction, run install, seed, and start from the project root.

The YouTube API key is not required for reviewing the main benchmark functionality.
