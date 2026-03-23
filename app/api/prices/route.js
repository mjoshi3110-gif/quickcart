import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { query, pincode, city } = await req.json();

    if (!query || query.trim().length === 0) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    const locationContext = pincode
      ? `The user is in ${city ? city + ", " : ""}India with pincode ${pincode}.`
      : "The user is somewhere in India (location not shared).";

    const prompt = `You are a price comparison assistant for Indian quick-commerce apps. ${locationContext}

Give realistic approximate prices for "${query.trim()}" on Blinkit, Zepto, Swiggy Instamart, and BigBasket.

CRITICAL RULES:
- Prices MUST vary across platforms — they compete differently on different products
- Do NOT always pick the same platform as cheapest — it genuinely varies by product category
- For groceries: BigBasket and Blinkit often compete closely. Zepto sometimes cheaper on snacks
- For personal care: Blinkit and Zepto often match. BigBasket sometimes pricier
- For fresh produce: prices vary a lot by location and season — reflect that uncertainty
- This works for ANY product sold on these apps — groceries, snacks, personal care, medicines, baby products, pet food, etc.
- If a product is genuinely not sold on a platform, set available:false and price:0
- Prices should be realistic Indian rupee amounts

Respond ONLY with raw JSON, no markdown, no extra text:
{"blinkit":{"price":249,"item":"exact product name and size","available":true},"zepto":{"price":239,"item":"exact product name and size","available":true},"swiggy":{"price":255,"item":"exact product name and size","available":true},"bigbasket":{"price":245,"item":"exact product name and size","available":true}}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content.filter(b => b.type === "text").map(b => b.text).join("");

    let parsed = null;
    try { parsed = JSON.parse(text.trim()); } catch {}
    if (!parsed) {
      const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      try { parsed = JSON.parse(clean); } catch {}
    }
    if (!parsed) {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s !== -1 && e > s) { try { parsed = JSON.parse(text.slice(s, e + 1)); } catch {} }
    }

    if (!parsed) return Response.json({ error: "Failed to parse AI response" }, { status: 500 });

    return Response.json({ results: parsed });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
