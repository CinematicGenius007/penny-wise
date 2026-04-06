import { TrendingUp } from "lucide-react";

export default function InvestmentsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
        <TrendingUp className="w-8 h-8 text-accent" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Investment Tracking</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Live NAV for mutual funds, stock prices, and portfolio analytics are coming in Phase 2.
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-left w-full max-w-sm">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Coming soon</p>
        <ul className="text-sm text-foreground/80 space-y-1.5 list-disc list-inside">
          <li>Mutual fund NAV (AMFI API)</li>
          <li>Stock portfolio tracking</li>
          <li>FD &amp; PPF maturity calculator</li>
          <li>80C deductions tracker</li>
        </ul>
      </div>
    </div>
  );
}
