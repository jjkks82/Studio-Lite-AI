const express = require("express");
const fetch   = require("node-fetch");
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.json({ limit: "4mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Studio-Lite-AI", ts: Date.now() });
});

app.post("/chat", async (req, res) => {
  const body    = req.body || {};
  const message = (body.message || body.prompt || "").toString().trim();
  if (!message) return res.status(400).json({ ok: false, error: "message is required" });

  const GROQ_KEY   = process.env.GROQ_API_KEY  || "";
  const OPENAI_KEY = process.env.OPENAI_API_KEY || "";

  let apiKey, apiUrl, modelName;

  if (GROQ_KEY) {
    apiKey    = GROQ_KEY;
    apiUrl    = "https://api.groq.com/openai/v1/chat/completions";
    modelName = "llama-3.1-8b-instant";   // ✅ الموديل الجديد الشغال
  } else if (OPENAI_KEY) {
    apiKey    = OPENAI_KEY;
    apiUrl    = "https://api.openai.com/v1/chat/completions";
    modelName = "gpt-3.5-turbo";
  } else {
    return res.json({
      ok: true,
      reply: `[Demo] أضف GROQ_API_KEY في Render Environment. سؤالك: "${message}"`,
      code: null, model: "demo"
    });
  }

  let aiText;
  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: "You are Studio Lite AI, an expert Roblox Lua developer. When writing code always use ```lua blocks. Be concise. Reply in the same language as the user." },
          { role: "user", content: message }
        ],
        max_tokens: 1200,
        temperature: 0.7
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error("API " + resp.status + ": " + t.substring(0, 300));
    }

    const data = await resp.json();
    aiText = (data.choices && data.choices[0] && data.choices[0].message)
             ? data.choices[0].message.content : "No response.";

  } catch (err) {
    console.error("[chat]", err.message);
    return res.status(502).json({ ok: false, error: "AI request failed: " + err.message });
  }

  const luaMatch = aiText.match(/```lua\s*([\s\S]*?)```/i);
  return res.json({ ok: true, reply: aiText, code: luaMatch ? luaMatch[1].trim() : null, model: modelName });
});

app.use((err, req, res, _n) => res.status(500).json({ ok: false, error: err.message }));
process.on("uncaughtException",  e => console.error("[uncaught]",  e));
process.on("unhandledRejection", e => console.error("[unhandled]", e));
app.listen(PORT, () => console.log("Running on port " + PORT));
