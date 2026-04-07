import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserIds, ownsUserData } from "./lib/auth";

const investmentTypeValidator = v.union(
  v.literal("stock"),
  v.literal("mutual_fund"),
  v.literal("fd"),
  v.literal("nps"),
  v.literal("ppf"),
  v.literal("other")
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userIds = getAuthUserIds(identity);

    const groups = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("investments")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .order("desc")
          .collect()
      )
    );

    return groups.flat();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: investmentTypeValidator,
    investedAmount: v.number(),
    currentValue: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.investedAmount <= 0) throw new Error("Invested amount must be positive");
    if (args.currentValue !== undefined && args.currentValue < 0) throw new Error("Current value cannot be negative");

    return ctx.db.insert("investments", {
      userId: identity.tokenIdentifier,
      name: args.name,
      type: args.type,
      investedAmount: args.investedAmount,
      currentValue: args.currentValue,
      purchaseDate: args.purchaseDate,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("investments"),
    name: v.optional(v.string()),
    currentValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const investment = await ctx.db.get(args.id);
    if (!investment || !ownsUserData(investment.userId, identity)) {
      throw new Error("Investment not found");
    }

    const patch: { name?: string; currentValue?: number } = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.currentValue !== undefined) {
      if (args.currentValue < 0) throw new Error("Current value cannot be negative");
      patch.currentValue = args.currentValue;
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("investments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const investment = await ctx.db.get(args.id);
    if (!investment || !ownsUserData(investment.userId, identity)) {
      throw new Error("Investment not found");
    }

    await ctx.db.delete(args.id);
  },
});
