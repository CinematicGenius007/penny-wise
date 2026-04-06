import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BodySchema = z.object({
  description: z.string().max(500),
  amount: z.number(),
  type: z.enum(["income", "expense", "transfer"]),
  categories: z.array(z.string()).max(50),
});

// Simple in-memory cache keyed on normalized description (resets on redeploy; good enough for MVP)
const cache = new Map<string, string>();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { description, amount, type, categories } = parsed.data;
  const cacheKey = `${description.toLowerCase().trim()}::${type}`;

  if (cache.has(cacheKey)) {
    return NextResponse.json({ category: cache.get(cacheKey), confidence: "high", cached: true });
  }

  try {
    const prompt = `You are a personal finance assistant for Indian users. Categorize this transaction:

Transaction: "${description}"
Amount: ${amount} INR
Type: ${type}

Available categories:
${categories.join(", ")}

Return ONLY valid JSON (no markdown):
{"category": "<exact category name from the list>", "confidence": "high" | "medium" | "low"}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
      temperature: 0,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "{}";
    const result = JSON.parse(text) as { category?: string; confidence?: string };

    if (result.category && categories.includes(result.category)) {
      cache.set(cacheKey, result.category);
      if (cache.size > 500) {
        const firstKey = cache.keys().next().value!;
        cache.delete(firstKey);
      }
      return NextResponse.json({ category: result.category, confidence: result.confidence ?? "medium" });
    }

    return NextResponse.json({ category: "Other", confidence: "low" });
  } catch {
    // Non-blocking fallback
    return NextResponse.json({ category: "Other", confidence: "low", error: "ai_unavailable" });
  }
}
