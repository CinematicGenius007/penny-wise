import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(), // Clerk user ID (subject from JWT)
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    currency: v.string(), // default 'INR'
  }).index("by_userId", ["userId"]),

  accounts: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("bank"),
      v.literal("cash"),
      v.literal("card"),
      v.literal("wallet")
    ),
    balance: v.number(),
    currency: v.string(),
    color: v.string(),
    isDeleted: v.boolean(),
  }).index("by_userId", ["userId"]),

  categories: defineTable({
    userId: v.optional(v.string()), // null = system category, accessible to all
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    isSystem: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_system", ["isSystem"]),

  transactions: defineTable({
    userId: v.string(),
    accountId: v.id("accounts"),
    amount: v.number(), // always positive; type determines direction
    type: v.union(
      v.literal("income"),
      v.literal("expense"),
      v.literal("transfer")
    ),
    categoryId: v.optional(v.id("categories")),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.string(), // ISO date string YYYY-MM-DD
    transferPairId: v.optional(v.string()), // links the two rows of a transfer
    toAccountId: v.optional(v.id("accounts")), // set on the debit row of transfers
    aiCategorized: v.boolean(),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_account", ["userId", "accountId"])
    .index("by_userId_category", ["userId", "categoryId"])
    .index("by_transferPairId", ["transferPairId"]),

  budgets: defineTable({
    userId: v.string(),
    categoryId: v.optional(v.id("categories")), // null = overall monthly budget
    amount: v.number(),
    period: v.union(v.literal("monthly"), v.literal("weekly")),
  }).index("by_userId", ["userId"]),

  investments: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("stock"),
      v.literal("mutual_fund"),
      v.literal("fd"),
      v.literal("nps"),
      v.literal("ppf"),
      v.literal("other")
    ),
    investedAmount: v.number(),
    currentValue: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  chatMessages: defineTable({
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }).index("by_userId", ["userId"]),
});
