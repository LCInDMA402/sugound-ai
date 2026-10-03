import "dotenv/config";
import express from "express";
import multer from "multer";
import { censorText } from "./censor.js";

const app = express();

const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 50);

const DEMO_MODE = process.env.DEMO_MODE === "true";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";

const upload = multer({
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
  },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    demoMode: DEMO_MODE,
    openrouterConfigured: Boolean(OPENROUTER_API_KEY),
    model: OPENROUTER_MODEL,
    censorReplacement: "You're grounded.",
  });
});


// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    // Free Demo Mode
    if (DEMO_MODE) {
      return res.json({
        reply:
          `Sugound AI is currently running in Free Demo Mode. ` +
          `Your message was: "${message}"`,
      });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OpenRouter API key is not configured.",
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sugound-ai.onrender.com",
          "X-Title": "Sugound AI",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are Sugound AI, a helpful, friendly AI assistant.",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter request failed.",
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "The AI did not return a response.";

    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      error: "Chat request failed.",
    });
  }
});


// ─────────────────────────────────────────────
// IMAGE ENDPOINT
// ─────────────────────────────────────────────

app.post(
  "/api/images",
  upload.single("image"),
  async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || "").trim();

      if (!prompt) {
        return res.status(400).json({
          error: "Image prompt is required.",
        });
      }

      /*
       * OpenRouter's free router is being used for CHAT.
       * Image generation is kept as a demo placeholder here
       * so the app does not accidentally make paid image API calls.
       */

      const svg = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1024"
          height="1024"
          viewBox="0 0 1024 1024"
        >
          <rect width="1024" height="1024" fill="#111827"/>
          <text
            x="512"
            y="460"
            text-anchor="middle"
            fill="white"
            font-size="42"
            font-family="Arial, sans-serif"
          >
            Sugound AI
          </text>
          <text
            x="512"
            y="530"
            text-anchor="middle"
            fill="#9ca3af"
            font-size="28"
            font-family="Arial, sans-serif"
          >
            Image generation demo
          </text>
        </svg>
      `;

      const image = `data:image/svg+xml;base64,${Buffer.from(
        svg
      ).toString("base64")}`;

      res.json({
        image,
        demo: true,
        prompt,
      });
    } catch (error) {
      console.error("Image error:", error);

      res.status(500).json({
        error: "Image generation failed.",
      });
    }
  }
);


// ─────────────────────────────────────────────
// CENSOR
// ─────────────────────────────────────────────

app.post("/api/censor", async (req, res) => {
  try {
    const text = String(req.body?.text || "");

    if (!text) {
      return res.status(400).json({
        error: "Text is required.",
      });
    }

    const result = censorText(text);

    res.json({
      original: text,
      censored: result,
    });
  } catch (error) {
    console.error("Censor error:", error);

    res.status(500).json({
      error: "Censor request failed.",
    });
  }
});


// ─────────────────────────────────────────────
// FRONTEND
// ─────────────────────────────────────────────

app.get("*", (req, res) => {
  res.sendFile("index.html", {
    root: "public",
  });
});


// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Sugound AI running on port ${PORT}`);
  console.log(`Demo mode: ${DEMO_MODE}`);
  console.log(`OpenRouter configured: ${Boolean(OPENROUTER_API_KEY)}`);
  console.log(`Model: ${OPENROUTER_MODEL}`);
});
