const express = require('express');
const { Groq } = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// الماركات المسجلة لك يا بطل
const GROQ_KEY = process.env.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; 
const GEMINI_KEY = process.env.AIzaSyCKrVdJZJ9_j6uSNGcScRlCpBLpijfSsHc;

const groq = new Groq({ apiKey: GROQ_KEY });
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

app.get('/', (req, res) => res.send('Studio Lite is Alive!'));

app.post('/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are Studio Lite AI. Respond with Roblox JSON actions ONLY." },
                { role: "user", content: prompt }
            ],
            model: "llama3-70b-8192",
        });
        res.send(completion.choices[0].message.content);
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
