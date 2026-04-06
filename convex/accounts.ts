import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserIds, ownsUserData } from "./lib/auth";

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userIds = getAuthUserIds(identity);
    const accountGroups = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("accounts")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .collect()
      )
    );

    return accountGroups.flat();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("bank"),
      v.literal("cash"),
      v.literal("card"),
      v.literal("wallet")
    ),
    initialBalance: v.number(),
    currency: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.initialBalance < 0) throw new Error("Initial balance cannot be negative");
    const userId = identity.tokenIdentifier;

    return await ctx.db.insert("accounts", {
      userId,
      name: args.name,
      type: args.type,
      balance: args.initialBalance,
      currency: args.currency ?? "INR",
      color: args.color ?? "#10B981",
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("accounts"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const account = await ctx.db.get(args.id);
    if (!account || !ownsUserData(account.userId, identity)) {
      throw new Error("Account not found");
    }

    const patch: Record<string, string | undefined> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.color !== undefined) patch.color = args.color;
    if (args.currency !== undefined) patch.currency = args.currency;

    await ctx.db.patch(args.id, patch);
  },
});

// Soft-delete to preserve transaction history
export const remove = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const account = await ctx.db.get(args.id);
    if (!account || !ownsUserData(account.userId, identity)) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(args.id, { isDeleted: true });
  },
});
