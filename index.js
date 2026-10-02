import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import OpenAI from "openai";
import { censorText } from "./censor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 50);
const demoMode = String(process.env.DEMO_MODE || "false").toLowerCase() === "true";

const uploadDir = path.join(__dirname, "..", "uploads");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: maxUploadMb * 1024 * 1024 }
});

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function demoChatReply(message) {
  const text = String(message).trim();
  const lower = text.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hi! 👋 Sugound AI is running in Free Demo Mode. No OpenAI credits are being used.";
  }
  if (lower.includes("image")) {
    return "🎨 Free Demo Mode: I can preview your image-generation request, but real AI image generation requires an API with available credits.";
  }
  if (lower.includes("video")) {
    return "🎬 Free Demo Mode: your video workflow can be planned here. Real AI video generation is not connected in this demo.";
  }
  return `🧪 Free Demo Mode: I received your request — "${text.slice(0, 180)}${text.length > 180 ? "…" : ""}". The Sugound AI interface is working without using OpenAI credits.`;
}

function demoImageData(prompt, size) {
  const [w, h] = String(size || "1024x1024").split("x").map(Number);
  const width = Number.isFinite(w) ? w : 1024;
  const height = Number.isFinite(h) ? h : 1024;
  const safe = String(prompt).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0"/><stop offset="1" stop-color="#444"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="44%" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="52" font-weight="700">SUGOUND AI</text>
    <text x="50%" y="52%" text-anchor="middle" fill="#ddd" font-family="Arial,sans-serif" font-size="30">FREE DEMO MODE</text>
    <text x="50%" y="60%" text-anchor="middle" fill="#bbb" font-family="Arial,sans-serif" font-size="22">${safe.slice(0, 100)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function requireOpenAI(res) {
  if (!client) {
    res.status(503).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
    return false;
  }
  return true;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    openaiConfigured: Boolean(client),
    demoMode,
    censorReplacement: "You're grounded."
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "Message is required." });
    if (demoMode) return res.json({ text: demoChatReply(message), demo: true });
    if (!requireOpenAI(res)) return;

    const model = process.env.OPENAI_CHAT_MODEL || "gpt-5-mini";
    const response = await client.responses.create({
      model,
      instructions:
        "You are Sugound AI, a helpful multimedia creation assistant. " +
        "Help users plan image, video, audio, editing, and subtitle workflows. " +
        "Do not claim that a media operation happened unless the server actually performed it.",
      input: message
    });

    res.json({ text: response.output_text || "No response was returned." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Chat request failed." });
  }
});

app.post("/api/images", upload.single("image"), async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });
    if (demoMode) return res.json({ image: demoImageData(prompt, req.body?.size), demo: true });
    if (!requireOpenAI(res)) return;

    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const result = await client.images.generate({
      model,
      prompt,
      size: req.body?.size || "1024x1024"
    });

    const item = result.data?.[0];
    if (!item) return res.status(502).json({ error: "No image was returned." });

    if (item.b64_json) {
      res.json({ image: `data:image/png;base64,${item.b64_json}` });
    } else if (item.url) {
      res.json({ image: item.url });
    } else {
      res.status(502).json({ error: "The image response had no usable image data." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Image generation failed." });
  }
});

app.post("/api/censor", (req, res) => {
  try {
    const text = String(req.body?.text || "");
    if (!text) return res.status(400).json({ error: "Text is required." });

    const result = censorText(text);
    res.json({
      original: text,
      censored: result.text,
      detections: result.detections,
      replacement: "You're grounded."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Censor request failed." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Sugound AI listening on port ${port}`);
});
