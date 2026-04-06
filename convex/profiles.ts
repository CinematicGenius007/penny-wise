import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserIds } from "./lib/auth";

export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userIds = getAuthUserIds(identity);
    const profiles = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique()
      )
    );

    return profiles.find(Boolean) ?? null;
  },
});

// Called once on first app load after signup to ensure a profile row exists.
export const ensureProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const userIds = getAuthUserIds(identity);

    const existingProfiles = await Promise.all(
      userIds.map((candidateUserId) =>
        ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", candidateUserId))
          .unique()
      )
    );
    const existing = existingProfiles.find(Boolean) ?? null;

    if (existing) {
      if (existing.userId !== userId) {
        await ctx.db.patch(existing._id, { userId });
      }
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      userId,
      fullName: args.fullName ?? identity.name ?? undefined,
      currency: "INR",
    });
  },
});

export const update = mutation({
  args: {
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userIds = getAuthUserIds(identity);
    const profiles = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique()
      )
    );
    const profile = profiles.find(Boolean) ?? null;

    if (!profile) throw new Error("Profile not found");

    const patch: Record<string, string | undefined> = {};
    if (args.fullName !== undefined) patch.fullName = args.fullName;
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
    if (args.currency !== undefined) patch.currency = args.currency;

    await ctx.db.patch(profile._id, patch);
  },
});
