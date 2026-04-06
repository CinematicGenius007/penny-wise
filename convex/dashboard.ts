import { query } from "./_generated/server";
import { getAuthUserIds } from "./lib/auth";

// Returns all aggregated data the Dashboard needs in one round-trip
export const getSummary = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userIds = getAuthUserIds(identity);
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

    const [accountGroups, transactionGroups, categories] = await Promise.all([
      Promise.all(
        userIds.map((userId) =>
          ctx.db
            .query("accounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .collect()
        )
      ),
      Promise.all(
        userIds.map((userId) =>
          ctx.db
            .query("transactions")
            .withIndex("by_userId_date", (q) => q.eq("userId", userId))
            .order("desc")
            .collect()
        )
      ),
      ctx.db
        .query("categories")
        .withIndex("by_system", (q) => q.eq("isSystem", true))
        .collect(),
    ]);

    const [accounts, allTx, userCats] = await Promise.all([
      Promise.resolve(accountGroups.flat()),
      Promise.resolve(transactionGroups.flat()),
      Promise.all(
        userIds.map((userId) =>
          ctx.db
            .query("categories")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect()
        )
      ).then((groups) => groups.flat()),
    ]);

    const allCategories = [...categories, ...userCats];
    const categoryMap = new Map(allCategories.map((c) => [c._id, c]));

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    // This month transactions
    const monthTx = allTx.filter(
      (tx) => tx.date >= startOfMonth && tx.date <= endOfMonth && tx.type !== "transfer"
    );

    const monthIncome = monthTx
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const monthExpenses = monthTx
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Spending by category (current month, expenses only)
    const spendingByCategory: Record<string, { name: string; icon: string; color: string; amount: number }> = {};
    monthTx
      .filter((tx) => tx.type === "expense" && tx.categoryId)
      .forEach((tx) => {
        const catId = tx.categoryId!;
        const cat = categoryMap.get(catId);
        if (!cat) return;
        if (!spendingByCategory[catId]) {
          spendingByCategory[catId] = { name: cat.name, icon: cat.icon, color: cat.color, amount: 0 };
        }
        spendingByCategory[catId].amount += tx.amount;
      });

    const categorySpend = Object.values(spendingByCategory)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Recent transactions (last 5, with category info)
    const recentTx = allTx
      .filter((tx) => tx.type !== "transfer")
      .slice(0, 5)
      .map((tx) => ({
        ...tx,
        category: tx.categoryId ? categoryMap.get(tx.categoryId) ?? null : null,
        account: accounts.find((a) => a._id === tx.accountId) ?? null,
      }));

    return {
      totalBalance,
      accountCount: accounts.length,
      monthIncome,
      monthExpenses,
      netSavings: monthIncome - monthExpenses,
      categorySpend,
      recentTransactions: recentTx,
      accounts,
    };
  },
});
