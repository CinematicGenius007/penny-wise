import Link from "next/link";
import { formatINR } from "@/lib/format";

interface SpendingItem {
  name: string;
  icon: string;
  color: string;
  amount: number;
}

interface SpendingListProps {
  data: SpendingItem[];
}

export function SpendingList({ data }: SpendingListProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (!data.length) {
    return (
      <section className="mx-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Spending Breakdown</p>
        <p className="mt-2 text-sm text-muted-foreground">No expenses this month yet.</p>
      </section>
    );
  }

  return (
    <section className="mx-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Spending Breakdown</p>
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => {
          const share = total > 0 ? Math.round((item.amount / total) * 100) : 0;
          return (
            <Link
              key={item.name}
              href="/expenses"
              className="block rounded-lg px-1 py-1 transition-colors hover:bg-surface"
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  {item.icon} {item.name}
                </span>
                <span className="font-amount text-muted-foreground">
                  {formatINR(item.amount)} · {share}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-border">
                <div className="h-1 rounded-full" style={{ width: `${share}%`, backgroundColor: item.color }} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
