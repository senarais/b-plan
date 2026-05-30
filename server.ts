import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes
app.post("/api/generate-calendar", async (req, res) => {
  try {
    const { productName, targetAudience, businessCategory, tone } = req.body;

    if (!productName || !targetAudience) {
      return res.status(400).json({
        error: "Product name and target audience are required.",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.",
      });
    }

    const businessContext = businessCategory ? `Business Category/Niche: ${businessCategory}` : "";
    const toneContext = tone ? `Tone of voice: ${tone}` : "A friendly, persuasive, and highly engaging tone";

    const promptText = `
Generate a highly engaging, custom 7-day social media content calendar for an Indonesian UMKM (small business) with the following details:
- Product name or brand: "${productName}"
- Target audience: "${targetAudience}"
${businessContext}
- Writing tone: "${toneContext}"

The generated calendar must be highly customized to the product and audience. Ensure the captions use standard Indonesian marketing hooks, appropriate emojis, relatable storytelling context, clear pain-points of the target audience, and an appealing Call to Action (CTA) like 'Klik link di bio!', 'Komen di bawah!', or 'DM kami untuk order!'. The visual concepts should be actionable, specifying image or short video (Reels/TikTok) guidelines, text overlays, and music ideas.
`;

    // Strict Schema implementation following @google/genai guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        systemInstruction: `You are an expert social media manager, strategist, and copywriter specializing in Indonesian UMKM (Usaha Mikro, Kecil, dan Menengah) growth. You create highly creative, strategic, and high-conversion content planners. You output the response strictly matching the requested JSON Schema. All day values should be numbers 1 to 7. All captions and themes should be in Indonesian, using appropriate local abbreviations, colloquialisms, or slang if requested by target audience, or clean professional Indonesian as appropriate. Emojis must be embedded naturally in the captions.`,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER, description: "Day number from 1 to 7." },
              theme: { type: Type.STRING, description: "The visual/communication theme of the post (e.g. Edukasi Produk, Hard Selling, Behind The Scenes, Testimoni)." },
              visual_concept: { type: Type.STRING, description: "Actionable details on what image or video to produce, text layouts, overlays, story templates or TikTok/Reels sound recommendation." },
              caption: { type: Type.STRING, description: "Ready-to-copy caption in Indonesian with engaging copy hooks, line breaks for legibility, emojis, and clear local Indonesian Call to Action (CTA)." },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of 3-7 relevant high-traffic and niche hashtags tailored for this product and local Indonesian reach."
              }
            },
            required: ["day", "theme", "visual_concept", "caption", "hashtags"]
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text received from Gemini API");
    }

    const calendarData = JSON.parse(responseText.trim());
    res.json({ success: true, data: calendarData });
  } catch (error: any) {
    console.error("API Error during calendar generation:", error);
    res.status(500).json({
      error: "Failed to generate content calendar. Please try again or check your inputs.",
      details: error.message || String(error)
    });
  }
});

// Configure Vite middleware for dev or Serve static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
