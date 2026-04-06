import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserIds } from "./lib/auth";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userIds = getAuthUserIds(identity);
    const messageGroups = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("chatMessages")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .order("desc")
          .take(args.limit ?? 50)
      )
    );
    const messages = messageGroups
      .flat()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, args.limit ?? 50);

    return messages.reverse();
  },
});

export const save = mutation({
  args: {
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("chatMessages", {
      userId: identity.tokenIdentifier,
      role: args.role,
      content: args.content,
    });
  },
});

export const clearHistory = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userIds = getAuthUserIds(identity);
    const messageGroups = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("chatMessages")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect()
      )
    );
    const messages = messageGroups.flat();

    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
  },
});
