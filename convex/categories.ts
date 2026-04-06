import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserIds, ownsUserData } from "./lib/auth";

// Returns system categories + user's custom categories
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userIds = getAuthUserIds(identity);

    const [systemCats, ...userCategoryGroups] = await Promise.all([
      ctx.db
        .query("categories")
        .withIndex("by_system", (q) => q.eq("isSystem", true))
        .collect(),
      ...userIds.map((userId) =>
        ctx.db
          .query("categories")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect()
      ),
    ]);

    return [...systemCats, ...userCategoryGroups.flat()];
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;

    return await ctx.db.insert("categories", {
      userId,
      name: args.name,
      icon: args.icon ?? "💰",
      color: args.color ?? "#71717A",
      isSystem: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const cat = await ctx.db.get(args.id);
    if (!cat || !ownsUserData(cat.userId ?? "", identity) || cat.isSystem) {
      throw new Error("Category not found or cannot be modified");
    }

    const patch: Record<string, string | undefined> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.icon !== undefined) patch.icon = args.icon;
    if (args.color !== undefined) patch.color = args.color;

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const cat = await ctx.db.get(args.id);
    if (!cat || !ownsUserData(cat.userId ?? "", identity) || cat.isSystem) {
      throw new Error("Category not found or cannot be deleted");
    }

    await ctx.db.delete(args.id);
  },
});

// Seed system categories — called once during setup (idempotent)
export const seedSystemCategories = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .first();

    if (existing) return; // already seeded

    const systemCategories = [
      { name: "Food & Dining", icon: "🍽️", color: "#F59E0B" },
      { name: "Transport", icon: "🚗", color: "#3B82F6" },
      { name: "Shopping", icon: "🛍️", color: "#8B5CF6" },
      { name: "Utilities", icon: "⚡", color: "#10B981" },
      { name: "Healthcare", icon: "🏥", color: "#EF4444" },
      { name: "Entertainment", icon: "🎬", color: "#EC4899" },
      { name: "Education", icon: "📚", color: "#14B8A6" },
      { name: "Housing & Rent", icon: "🏠", color: "#F97316" },
      { name: "Subscriptions", icon: "🔄", color: "#6366F1" },
      { name: "Salary", icon: "💼", color: "#10B981" },
      { name: "Freelance", icon: "💻", color: "#0EA5E9" },
      { name: "Investment Returns", icon: "📈", color: "#22C55E" },
      { name: "Other", icon: "💰", color: "#71717A" },
    ];

    await Promise.all(
      systemCategories.map((cat) =>
        ctx.db.insert("categories", {
          ...cat,
          isSystem: true,
          userId: undefined,
        })
      )
    );
  },
});
