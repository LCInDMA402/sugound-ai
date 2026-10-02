# Sugound AI

A GitHub/Railway-ready multimedia AI web app powered by the OpenAI API.

## Features

- Chat interface using the OpenAI Responses API
- Image generation using OpenAI image generation
- Image uploads and local previews
- Video/audio/image uploads and browser previews
- Basic client-side image/video preview filters
- Transcript/slur-censor pipeline
- Confirmed slurs can be replaced with exactly `You're grounded.`
- Ordinary swear words are not intentionally censored
- Railway health endpoint
- API key kept server-side

## Important censoring note

This repository deliberately does **not** include a hard-coded list of real slurs. The server provides a safe hook for a reviewed classifier/lexicon. Set `ENABLE_DEMO_SLUR_FILTER=true` only if you want the small demo detector enabled; it is intentionally conservative and incomplete.

For production moderation, connect a maintained, context-aware multilingual classifier and have it return character spans. The replacement configured by default is:

`You're grounded.`

## Local setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Put your OpenAI API key in `.env`.
4. Install dependencies:

```bash
npm install
```

5. Start:

```bash
npm start
```

6. Open `http://localhost:3000`.

## GitHub

```bash
git init
git add .
git commit -m "Initial Sugound AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Railway

1. Create a Railway project.
2. Choose **Deploy from GitHub Repo**.
3. Select this repository.
4. Add `OPENAI_API_KEY` in Railway Variables.
5. Deploy.

Railway reads the `start` script from `package.json`. `railway.toml` also defines the health check.

## API endpoints

- `GET /api/health`
- `POST /api/chat` JSON `{ "message": "..." }`
- `POST /api/images` multipart field `image` plus `prompt`
- `POST /api/censor` JSON `{ "text": "...", "mode": "strict" }`

## Security

- Never commit `.env`.
- Never put `OPENAI_API_KEY` in browser JavaScript.
- Add authentication, rate limiting, upload scanning, storage controls, and usage limits before making the service public at scale.


## Free Demo Mode

Set `DEMO_MODE=true` in Render Environment Variables to test the Sugound AI interface without making OpenAI API calls. Chat returns local demo responses and image generation returns a local demo image card. This mode does not use OpenAI credits. Set `DEMO_MODE=false` later to use the real OpenAI API.
