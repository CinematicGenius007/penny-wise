import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "Convex URL is not configured" }, { status: 500 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unable to access Convex auth token" }, { status: 401 });
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);

    const rows = (await client.query(api.transactions.exportCsvRows, {})) as Array<{
      date: string;
      description: string;
      type: string;
      amount: number;
      category: string;
      account: string;
      notes: string;
    }>;

    const header = ["Date", "Description", "Type", "Amount", "Category", "Account", "Notes"];
    const csvLines = [
      header.join(","),
      ...rows.map((row) =>
        [
          escapeCsv(row.date),
          escapeCsv(row.description),
          escapeCsv(row.type),
          escapeCsv(row.amount),
          escapeCsv(row.category),
          escapeCsv(row.account),
          escapeCsv(row.notes),
        ].join(",")
      ),
    ];

    return new Response(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="penny-wise-transactions.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export transactions" }, { status: 500 });
  }
}
