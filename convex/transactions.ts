import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserIds, ownsUserData } from "./lib/auth";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()), // last transaction _id for cursor pagination
    accountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    type: v.optional(
      v.union(v.literal("income"), v.literal("expense"), v.literal("transfer"))
    ),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { transactions: [], hasMore: false };
    const userIds = getAuthUserIds(identity);

    const pageSize = Math.min(args.limit ?? 20, 100);

    const transactionGroups = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("transactions")
          .withIndex("by_userId_date", (q) => q.eq("userId", userId))
          .order("desc")
          .collect()
      )
    );
    const allTx = transactionGroups
      .flat()
      .sort((a, b) => {
        if (a.date === b.date) return b._creationTime - a._creationTime;
        return a.date < b.date ? 1 : -1;
      });

    // Apply filters in-memory (Convex doesn't support compound filters on non-indexed fields)
    let filtered = allTx.filter((tx) => {
      if (args.accountId && tx.accountId !== args.accountId) return false;
      if (args.categoryId && tx.categoryId !== args.categoryId) return false;
      if (args.type && tx.type !== args.type) return false;
      if (args.dateFrom && tx.date < args.dateFrom) return false;
      if (args.dateTo && tx.date > args.dateTo) return false;
      if (args.search) {
        const q = args.search.toLowerCase();
        if (!tx.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    // Cursor-based pagination
    if (args.cursor) {
      const cursorIdx = filtered.findIndex((tx) => tx._id === args.cursor);
      if (cursorIdx !== -1) filtered = filtered.slice(cursorIdx + 1);
    }

    const page = filtered.slice(0, pageSize);
    const hasMore = filtered.length > pageSize;
    const nextCursor = hasMore ? page[page.length - 1]._id : undefined;

    return { transactions: page, hasMore, nextCursor };
  },
});

export const exportCsvRows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userIds = getAuthUserIds(identity);

    const [txGroups, accountGroups, systemCategories, userCategoryGroups] = await Promise.all([
      Promise.all(
        userIds.map((userId) =>
          ctx.db
            .query("transactions")
            .withIndex("by_userId_date", (q) => q.eq("userId", userId))
            .order("desc")
            .collect()
        )
      ),
      Promise.all(
        userIds.map((userId) =>
          ctx.db
            .query("accounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect()
        )
      ),
      ctx.db.query("categories").withIndex("by_system", (q) => q.eq("isSystem", true)).collect(),
      Promise.all(
        userIds.map((userId) =>
          ctx.db.query("categories").withIndex("by_userId", (q) => q.eq("userId", userId)).collect()
        )
      ),
    ]);

    const transactions = txGroups.flat();
    const accounts = accountGroups.flat();
    const categories = [...systemCategories, ...userCategoryGroups.flat()];

    const accountById = new Map(accounts.map((account) => [account._id, account.name]));
    const categoryById = new Map(categories.map((category) => [category._id, category.name]));

    return transactions.map((tx) => ({
      date: tx.date,
      description: tx.description ?? "",
      type: tx.type,
      amount: tx.amount,
      category: tx.categoryId ? (categoryById.get(tx.categoryId) ?? "") : "",
      account: accountById.get(tx.accountId) ?? "",
      notes: tx.notes ?? "",
    }));
  },
});

export const getById = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const tx = await ctx.db.get(args.id);
    if (!tx || !ownsUserData(tx.userId, identity)) return null;
    return tx;
  },
});

export const create = mutation({
  args: {
    accountId: v.id("accounts"),
    amount: v.number(),
    type: v.union(
      v.literal("income"),
      v.literal("expense"),
      v.literal("transfer")
    ),
    categoryId: v.optional(v.id("categories")),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.string(),
    toAccountId: v.optional(v.id("accounts")), // required for transfer
    aiCategorized: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.amount <= 0) throw new Error("Amount must be positive");
    const userId = identity.tokenIdentifier;

    // Verify account belongs to user
    const account = await ctx.db.get(args.accountId);
    if (!account || !ownsUserData(account.userId, identity)) {
      throw new Error("Account not found");
    }

    if (args.type === "transfer") {
      if (!args.toAccountId) throw new Error("toAccountId required for transfers");
      if (args.toAccountId === args.accountId) {
        throw new Error("Cannot transfer to the same account");
      }

      const toAccount = await ctx.db.get(args.toAccountId);
      if (!toAccount || !ownsUserData(toAccount.userId, identity)) {
        throw new Error("Destination account not found");
      }

      const pairId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Debit row (from account)
      await ctx.db.insert("transactions", {
        userId,
        accountId: args.accountId,
        amount: args.amount,
        type: "transfer",
        description: args.description ?? `Transfer to ${toAccount.name}`,
        notes: args.notes,
        date: args.date,
        transferPairId: pairId,
        toAccountId: args.toAccountId,
        aiCategorized: false,
      });

      // Credit row (to account)
      await ctx.db.insert("transactions", {
        userId,
        accountId: args.toAccountId,
        amount: args.amount,
        type: "transfer",
        description: args.description ?? `Transfer from ${account.name}`,
        notes: args.notes,
        date: args.date,
        transferPairId: pairId,
        aiCategorized: false,
      });

      // Update both balances
      await ctx.db.patch(args.accountId, { balance: account.balance - args.amount });
      await ctx.db.patch(args.toAccountId, { balance: toAccount.balance + args.amount });
      return pairId;
    }

    const txId = await ctx.db.insert("transactions", {
      userId,
      accountId: args.accountId,
      amount: args.amount,
      type: args.type,
      categoryId: args.categoryId,
      description: args.description,
      notes: args.notes,
      date: args.date,
      aiCategorized: args.aiCategorized ?? false,
    });

    // Sync account balance
    const delta = args.type === "income" ? args.amount : -args.amount;
    await ctx.db.patch(args.accountId, { balance: account.balance + delta });

    return txId;
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    amount: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tx = await ctx.db.get(args.id);
    if (!tx || !ownsUserData(tx.userId, identity)) throw new Error("Transaction not found");
    if (tx.type === "transfer") throw new Error("Edit transfers by deleting and re-creating");

    const patch: Record<string, unknown> = {};
    if (args.description !== undefined) patch.description = args.description;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.date !== undefined) patch.date = args.date;
    if (args.categoryId !== undefined) patch.categoryId = args.categoryId;

    if (args.amount !== undefined && args.amount !== tx.amount) {
      if (args.amount <= 0) throw new Error("Amount must be positive");
      // Reverse old balance effect, apply new
      const account = await ctx.db.get(tx.accountId);
      if (!account) throw new Error("Account not found");
      const oldDelta = tx.type === "income" ? tx.amount : -tx.amount;
      const newDelta = tx.type === "income" ? args.amount : -args.amount;
      await ctx.db.patch(tx.accountId, {
        balance: account.balance - oldDelta + newDelta,
      });
      patch.amount = args.amount;
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tx = await ctx.db.get(args.id);
    if (!tx || !ownsUserData(tx.userId, identity)) throw new Error("Transaction not found");

    if (tx.type === "transfer" && tx.transferPairId) {
      // Delete both rows of the transfer pair
      const pair = await ctx.db
        .query("transactions")
        .withIndex("by_transferPairId", (q) =>
          q.eq("transferPairId", tx.transferPairId!)
        )
        .collect();

      for (const row of pair) {
        const acc = await ctx.db.get(row.accountId);
        if (acc) {
          // The debit row has toAccountId set; credit row doesn't
          if (row.toAccountId) {
            await ctx.db.patch(acc._id, { balance: acc.balance + row.amount });
          } else {
            await ctx.db.patch(acc._id, { balance: acc.balance - row.amount });
          }
        }
        await ctx.db.delete(row._id);
      }
      return;
    }

    // Reverse balance effect
    const account = await ctx.db.get(tx.accountId);
    if (account) {
      const delta = tx.type === "income" ? -tx.amount : tx.amount;
      await ctx.db.patch(tx.accountId, { balance: account.balance + delta });
    }

    await ctx.db.delete(args.id);
  },
});
