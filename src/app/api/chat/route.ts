import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(4000),
    })
  ).max(20),
  financialSnapshot: z.object({
    totalBalance: z.number(),
    monthIncome: z.number(),
    monthExpenses: z.number(),
    netSavings: z.number(),
    topCategories: z.array(z.object({ name: z.string(), amount: z.number() })).max(3),
  }).optional(),
});

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
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const { messages, financialSnapshot } = parsed.data;
  const snap = financialSnapshot;

  const systemPrompt = `You are penny-wise, a helpful personal finance assistant for Indian users.

${snap ? `User's financial snapshot:
- Total balance: ₹${snap.totalBalance.toLocaleString("en-IN")}
- This month: ₹${snap.monthIncome.toLocaleString("en-IN")} income, ₹${snap.monthExpenses.toLocaleString("en-IN")} expenses, ₹${snap.netSavings.toLocaleString("en-IN")} net savings
- Top spending: ${snap.topCategories.map((c) => `${c.name} ₹${c.amount.toLocaleString("en-IN")}`).join(", ")}` : ""}

You help users understand their spending, answer finance questions, suggest tax-saving tips (80C, HRA, NPS etc.), and give practical financial advice.

Be concise, friendly, and practical. Use ₹ for amounts. Disclaimer: you are not a SEBI-registered advisor.`;

  try {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 600,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "AI service unavailable. Please try again." },
      { status: 503 }
    );
  }
}
