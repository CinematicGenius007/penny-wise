import Link from "next/link";
import { formatINR } from "@/lib/format";
import type { DashboardSummary } from "@/types";

interface BudgetCalloutProps {
  budgets: DashboardSummary["budgets"];
}

export function BudgetCallout({ budgets }: BudgetCalloutProps) {
  if (!budgets.length) {
    return (
      <section className="mx-4 rounded-2xl border border-dashed border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Set a monthly budget to track spending progress.
        </p>
        <Link href="/settings" className="mt-2 inline-block text-sm text-accent hover:underline">
          Set up budget
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Budgets</p>
        <Link href="/settings" className="text-xs text-accent hover:underline">
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {budgets.map((budget) => {
          const pct = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
          return (
            <div key={budget._id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  {budget.categoryIcon ? `${budget.categoryIcon} ` : ""}
                  {budget.categoryName ?? "Overall"}
                </span>
                <span className="font-amount text-muted-foreground">
                  {formatINR(budget.spent)} / {formatINR(budget.amount)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border">
                <div
                  className={`h-1.5 rounded-full ${pct >= 100 ? "bg-expense" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
