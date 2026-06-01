import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import express from "express";
import multer from "multer";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set. Export it before starting the server:");
  console.error("  export GEMINI_API_KEY=your-key");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") ?? true,
  })
);
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const SYSTEM_INSTRUCTION = `You are an expert automotive technician with 20+ years of experience
diagnosing vehicle condition from visual inspection.
Return ONLY a raw JSON array, no markdown, no explanation, no preamble.
Each item must have: part, location, condition, urgency, estimated_price_range.
If not a car: {"error": "not a car image"}
If too blurry: {"error": "image quality too low"}`;

function buildPrompt({ year, make, model, vin }) {
  const lines = [`Vehicle: ${year} ${make} ${model}.`];
  if (vin) lines.push(`VIN: ${vin}`);
  lines.push("Analyze this car and return the parts list.");
  return lines.join("\n");
}

app.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "image file is required (field name: image)" });
  }

  const { make, model, year, vin } = req.body;
  if (!make || !model || !year) {
    return res.status(400).json({ error: "make, model, and year are required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: req.file.buffer.toString("base64"),
              },
            },
            { text: buildPrompt({ year, make, model, vin }) },
          ],
        },
      ],
    });

    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "analysis failed", detail: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`parts-helper listening on http://localhost:${port}`);
});
