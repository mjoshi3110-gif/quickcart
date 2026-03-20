import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query || query.trim().length === 0) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    const prompt = `You are a helpful price estimation assistant for Indian grocery shopping. Based on your training knowledge, give typical approximate prices for "${query.trim()}" on Blinkit, Zepto, Swiggy Instamart, and BigBasket in India.

These are rough ballpark estimates to help users know which app is likely cheaper before they check. Users understand prices change and will verify on the app.

Respond with ONLY a raw JSON object, no markdown, no text before or after:
{"blinkit":{"price":249,"item":"exact product name and size","available":true},"zepto":{"price":245,"item":"exact product name and size","available":true},"swiggy":{"price":252,"item":"exact product name and size","available":true},"bigbasket":{"price":240,"item":"exact product name and size","available":true}}

Rules: price must be an integer (no currency symbol). If a product is unlikely to be on a platform set available:false and price:0. Return ONLY the JSON.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse JSON robustly
    let parsed = null;
    try { parsed = JSON.parse(text.trim()); } catch {}
    if (!parsed) {
      const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      try { parsed = JSON.parse(clean); } catch {}
    }
    if (!parsed) {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s !== -1 && e > s) {
        try { parsed = JSON.parse(text.slice(s, e + 1)); } catch {}
      }
    }

    if (!parsed) {
      return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return Response.json({ results: parsed });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
