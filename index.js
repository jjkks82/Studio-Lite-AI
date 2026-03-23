// ============================================================
//  Studio Lite AI  —  index.js  (Render / Node.js)
//  Error-proof server: لا ينهار أبداً بسبب مفاتيح مفقودة
// ============================================================

const express  = require("express");
const fetch    = require("node-fetch"); // npm install node-fetch@2
const app      = express();
const PORT     = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: "4mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Health check ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Studio-Lite-AI", ts: Date.now() });
});

// ── /chat  ────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  // 1. تحقق من الـ body بأمان تام
  const body    = req.body   || {};
  const message = (body.message || body.prompt || "").toString().trim();
  const model   = (body.model   || "gpt-3.5-turbo").toString();

  if (!message) {
    return res.status(400).json({ ok: false, error: "message field is required" });
  }

  // 2. تحقق من مفتاح API
  const OPENAI_KEY = process.env.OPENAI_API_KEY || "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";
  if (!OPENAI_KEY) {
    // لا ننهار — نرجع رد تجريبي حتى تضاف المفاتيح
    return res.json({
      ok:    true,
      reply: `[Demo — no API key] You asked: "${message}". Add OPENAI_API_KEY in Render environment.`,
      model: "demo"
    });
  }

  // 3. طلب OpenAI
  let aiResponse;
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role:    "system",
            content: "You are Studio Lite AI, an assistant for Roblox Studio developers. " +
                     "When asked to write code, always reply with pure Lua wrapped in ```lua blocks. " +
                     "Be concise and practical."
          },
          { role: "user", content: message }
        ],
        max_tokens:  1200,
        temperature: 0.7
      })
    });

    // تحقق من HTTP status أولاً
    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI ${openaiRes.status}: ${errText.substring(0, 200)}`);
    }

    const data   = await openaiRes.json();
    aiResponse   = data?.choices?.[0]?.message?.content || "No response from model.";

  } catch (err) {
    console.error("[/chat] AI fetch error:", err.message);
    return res.status(502).json({
      ok:    false,
      error: "AI request failed: " + err.message
    });
  }

  // 4. استخراج كود Lua إن وُجد (اختياري — لتسهيل loadstring)
  const luaMatch  = aiResponse.match(/```lua\s*([\s\S]*?)```/i);
  const luaCode   = luaMatch ? luaMatch[1].trim() : null;

  return res.json({
    ok:      true,
    reply:   aiResponse,
    code:    luaCode,          // null إذا لم يوجد كود
    model,
    ts:      Date.now()
  });
});

// ── Global error handler — يمنع انهيار السيرفر ───────────────
app.use((err, req, res, _next) => {
  console.error("[global-error]", err);
  res.status(500).json({ ok: false, error: "Internal server error", detail: err.message });
});

process.on("uncaughtException",  e => console.error("[uncaught]",  e));
process.on("unhandledRejection", e => console.error("[unhandled]", e));

app.listen(PORT, () => console.log(`Studio-Lite-AI listening on port ${PORT}`));
