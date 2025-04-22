// server.js
import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();
console.log("🔑 OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("✅ Portfolio AI backend is running");
});

// Load portfolio.json
let portfolioData = "";
(async () => {
  try {
    portfolioData = await fs.readFile(
      new URL("./portfolio.json", import.meta.url),
      "utf-8"
    );
    console.log("✔️ Loaded portfolio.json");
  } catch (err) {
    console.error("❌ Failed to load portfolio.json:", err);
    process.exit(1);
  }
})();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  console.log("▶️  /api/chat request:", message);

  if (!message) {
    return res.status(400).json({ error: "Missing 'message' field" });
  }

  // Helper for static fallback
  const data = JSON.parse(portfolioData);
  const msg = message.toLowerCase();

  try {
    // Try real AI
    const systemPrompt = `
You are Yatri Modi’s portfolio assistant.
Answer **only** with facts from this JSON (no extra chat):
${portfolioData}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: message }
      ],
      temperature: 0.0,
      max_tokens: 150
    });

    const answer = completion.choices[0].message.content.trim();
    console.log("✅ AI answer:", answer);
    return res.json({ answer });

  } catch (err) {
    console.error("❌ Error during OpenAI request:", err);

    // --- STATIC FALLBACK on rate‑limit or quota errors ---
    if (err.code === "insufficient_quota" || err.status === 429) {
      let answer = "";

      // 1) Greeting
      if (/^(hi|hello|hey)\b/.test(msg)) {
        answer = "👋 Hi! I’m Yatri’s AI assistant. Ask me about skills, education, projects, or experience.";
      }
      // 2) CGPA
      else if (/cgpa/.test(msg)) {
        const edu = data.education[0];
        answer = `Your CGPA is ${edu.cgpa} at ${edu.school}.`;
      }
      // 3) Senior Secondary (12th) results
      else if (/(xii|senior secondary|12th)/.test(msg)) {
        const sec2 = data.education.find(e => /xii|senior secondary|12th/.test(e.degree.toLowerCase()));
        answer = `Your XII result is ${sec2.score}% from ${sec2.school}.`;
      }
      // 4) Secondary (10th) results
      else if (/(x |10th|secondary(?!.*senior))/i.test(msg)) {
        const sec1 = data.education.find(e => /secondary.*\(x\)/i.test(e.degree.toLowerCase()));
        answer = `Your X result is ${sec1.score}% from ${sec1.school}.`;
      }
      // 5) Overall “result” summary
      else if (/result/.test(msg)) {
        const cg  = data.education[0];
        const xii = data.education.find(e => /xii|12th/.test(e.degree.toLowerCase()));
        const x   = data.education.find(e => /secondary \(x\)/i.test(e.degree.toLowerCase()));
        answer = `Your results: CGPA ${cg.cgpa}, XII ${xii.score}%, X ${x.score}%.`;
      }
      // 6) LinkedIn link
      else if (/linkedin/.test(msg)) {
        answer = `My LinkedIn profile: ${data.contact.linkedin}`;
      }
      // 7) Overall GitHub profile
      else if (/github\s+profile/.test(msg)) {
        answer = `My GitHub: ${data.contact.github}`;
      }
      // 8) Per‑project queries
      else {
        // find mentioned project
        const proj = data.projects.find(p =>
          msg.includes(p.name.toLowerCase())
        );

        if (proj) {
          // a) Description
          if (/describe|description/.test(msg)) {
            answer = `${proj.name}: ${proj.description}`;
          }
          // b) Languages used
          else if (/language|tech|stack/.test(msg)) {
            answer = `${proj.name} uses: ${proj.languages.join(", ")}.`;
          }
          // c) GitHub link for that project
          else if (/github|link/.test(msg)) {
            answer = `GitHub link for ${proj.name}: ${proj.link}`;
          }
        }

        // 9) If still empty, generic fallback
        if (!answer) {
          answer =
            "I’m out of AI quota. I can share CGPA, results, GitHub/LinkedIn links, and project info—try asking about one of those!";
        }
      }

      return res.json({ answer });
    }

    // --- Other errors ---
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`⚡️ Backend listening on http://localhost:${PORT}`)
);
