import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserIds, ownsUserData } from "./lib/auth";

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userIds = getAuthUserIds(identity);
    const budgetGroups = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("budgets")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect()
      )
    );

    return budgetGroups.flat();
  },
});

export const upsert = mutation({
  args: {
    categoryId: v.optional(v.id("categories")),
    amount: v.number(),
    period: v.union(v.literal("monthly"), v.literal("weekly")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.amount <= 0) throw new Error("Budget amount must be positive");
    const userId = identity.tokenIdentifier;

    const userIds = getAuthUserIds(identity);
    const existingBudgets = await Promise.all(
      userIds.map((candidateUserId) =>
        ctx.db
          .query("budgets")
          .withIndex("by_userId", (q) => q.eq("userId", candidateUserId))
          .filter((q) => {
            if (args.categoryId) {
              return q.eq(q.field("categoryId"), args.categoryId);
            }
            return q.eq(q.field("categoryId"), undefined);
          })
          .filter((q) => q.eq(q.field("period"), args.period))
          .collect()
      )
    );
    const existing = existingBudgets.flat()[0];

    if (existing) {
      await ctx.db.patch(existing._id, { amount: args.amount });
      return existing._id;
    }

    return await ctx.db.insert("budgets", {
      userId,
      categoryId: args.categoryId,
      amount: args.amount,
      period: args.period,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const budget = await ctx.db.get(args.id);
    if (!budget || !ownsUserData(budget.userId, identity)) {
      throw new Error("Budget not found");
    }
    await ctx.db.delete(args.id);
  },
});
