// Format a number as Indian Rupee currency
export function formatINR(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(1)}L`;
  }
  if (compact && Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    return `₹${thousands.toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Mask a formatted currency string while preserving visual width.
export function maskINR(amount: number, compact = false): string {
  const formatted = formatINR(amount, compact);
  return formatted.replace(/[0-9.,]/g, "*");
}

// Format date string (YYYY-MM-DD) to display string
export function formatDate(date: string, style: "short" | "medium" | "long" = "medium"): string {
  const d = new Date(date + "T00:00:00");
  if (style === "short") return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (style === "long") return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Get today as YYYY-MM-DD
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// Get start of current month as YYYY-MM-DD
export function startOfMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// Group transactions by date (for the Expenses list)
export function groupByDate<T extends { date: string }>(
  items: T[]
): Array<{ date: string; items: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const existing = groups.get(item.date) ?? [];
    groups.set(item.date, [...existing, item]);
  }
  return Array.from(groups.entries())
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Initials from a name string
export function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Deterministic color for initials avatar
export function getAvatarColor(name?: string | null): string {
  const colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#14B8A6"];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}
