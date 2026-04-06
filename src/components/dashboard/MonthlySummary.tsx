import { formatINR } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface MonthlySummaryProps {
  income: number;
  expenses: number;
  netSavings: number;
}

export function MonthlySummary({ income, expenses, netSavings }: MonthlySummaryProps) {
  void netSavings;
  return (
    <div className="mx-4 grid grid-cols-2 gap-3">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-income/10 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4 text-income" />
          </div>
          <span className="text-xs text-muted-foreground">Income</span>
        </div>
        <p className="text-lg font-amount font-bold text-income">{formatINR(income)}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-expense/10 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 text-expense" />
          </div>
          <span className="text-xs text-muted-foreground">Expenses</span>
        </div>
        <p className="text-lg font-amount font-bold text-expense">{formatINR(expenses)}</p>
      </div>
    </div>
  );
}
