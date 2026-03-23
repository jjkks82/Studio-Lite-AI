// ============================================================
//  Studio Lite AI  —  index.js  (Render / Node.js)
//  يدعم Groq API (gsk_...) و OpenAI API (sk-...)
//  يكتشف نوع المفتاح تلقائياً
// ============================================================

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
  const body    = req.body  || {};
  const message = (body.message || body.prompt || "").toString().trim();

  if (!message) {
    return res.status(400).json({ ok: false, error: "message field is required" });
  }

  const GROQ_KEY   = process.env.GROQ_API_KEY   || "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";
  const OPENAI_KEY = process.env.OPENAI_API_KEY  || "";

  let apiKey, apiUrl, modelName;

  if (GROQ_KEY && GROQ_KEY.startsWith("gsk_")) {
    apiKey    = GROQ_KEY;
    apiUrl    = "https://api.groq.com/openai/v1/chat/completions";
    modelName = "llama3-8b-8192";
    console.log("[/chat] Using GROQ API");
  } else if (OPENAI_KEY) {
    apiKey    = OPENAI_KEY;
    apiUrl    = "https://api.openai.com/v1/chat/completions";
    modelName = "gpt-3.5-turbo";
    console.log("[/chat] Using OPENAI API");
  } else {
    return res.json({
      ok:    true,
      reply: `[Demo] لا يوجد مفتاح API. أضف GROQ_API_KEY في Render Environment Variables. سؤالك: "${message}"`,
      code:  null,
      model: "demo"
    });
  }

  let aiText;
  try {
    const resp = await fetch(apiUrl, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role:    "system",
            content: "You are Studio Lite AI, an expert Roblox Lua developer assistant. When writing code always wrap it in ```lua blocks. Keep answers concise and practical. Respond in the same language the user uses."
          },
          { role: "user", content: message }
        ],
        max_tokens:  1200,
        temperature: 0.7
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`API ${resp.status}: ${errText.substring(0, 300)}`);
    }

    const data = await resp.json();
    aiText = data && data.choices && data.choices[0] && data.choices[0].message
             ? data.choices[0].message.content
             : "No response.";

  } catch (err) {
    console.error("[/chat] fetch error:", err.message);
    return res.status(502).json({ ok: false, error: "AI request failed: " + err.message });
  }

  const luaMatch = aiText.match(/```lua\s*([\s\S]*?)```/i);
  const luaCode  = luaMatch ? luaMatch[1].trim() : null;

  return res.json({
    ok:    true,
    reply: aiText,
    code:  luaCode,
    model: modelName,
    ts:    Date.now()
  });
});

app.use((err, req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ ok: false, error: err.message });
});

process.on("uncaughtException",  function(e) { console.error("[uncaught]",  e); });
process.on("unhandledRejection", function(e) { console.error("[unhandled]", e); });

app.listen(PORT, function() { console.log("Studio-Lite-AI running on port " + PORT); });
