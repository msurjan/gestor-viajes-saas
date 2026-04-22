import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Parse simple .env.local
const envPath = path.resolve('.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const apiKey = env['GEMINI_API_KEY'];
console.log("API Key loaded:", apiKey ? "Yes (starts with " + apiKey.substring(0, 5) + "...)" : "No");

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools: [{ googleSearch: {} }],
    });
    const SYSTEM = `You are a corporate intelligence assistant specialized in finding mining, energy, finance, and industry conferences worldwide.
Today's date is 2026-04-22.
When asked about an event, find its NEXT upcoming edition (after today) using your Google Search grounding tool to get current, real dates and official URLs.
Return ONLY valid JSON — no markdown, no explanations — matching EXACTLY this schema:
{
  "eventos": [
    {
      "nombre": "Full official event name",
      "descripcion": "Official and detailed thematic description of the event.",
      "tema": "One of: Innovación, Maquinaria, Finanzas, Geología, Energía, Minería, Otro",
      "fecha_inicio": "YYYY-MM-DD",
      "fecha_fin": "YYYY-MM-DD",
      "ciudad": "City",
      "pais": "Country",
      "fuente_url": "https://official-website.com",
      "confianza": 0.9
    }
  ]
}
If the event has multiple tracks or you find multiple editions, return each as a separate object.
If you cannot find reliable data, return an empty array.
IMPORTANT: Use the search results to provide accurate, up-to-date information. Do not guess dates.`

    const prompt = `${SYSTEM}\n\nFind the next upcoming edition of: "congreso geologico"`;
    console.log("Sending prompt...");
    const result = await model.generateContent(prompt);
    console.log("\nSuccess! Result:");
    const raw = result.response.text();
    console.log(raw);
    const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    console.log("Parsed:", JSON.parse(clean));
  } catch (err) {
    console.error("\nFAILED:");
    console.error(err);
  }
}
test();
