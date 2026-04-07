import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MonthlyPulseProps {
  income: number;
  expenses: number;
}

export function MonthlyPulse({ income, expenses }: MonthlyPulseProps) {
  const spentPct = income > 0 ? Math.min((expenses / income) * 100, 100) : 0;
  const overspent = expenses > income && income > 0;

  return (
    <section className="mx-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Monthly Pulse</p>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Earned</span>
            <span className="font-amount text-income">{formatINR(income)}</span>
          </div>
          <div className="h-2 rounded-full bg-border">
            <div className="h-2 rounded-full bg-income" style={{ width: "100%" }} />
          </div>
        </div>
        <div className={cn(overspent && "animate-pulse")}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Spent</span>
            <span className="font-amount text-expense">{formatINR(expenses)}</span>
          </div>
          <div className="h-2 rounded-full bg-border">
            <div className="h-2 rounded-full bg-expense" style={{ width: `${spentPct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
