import { sql } from "drizzle-orm"
import { pgTable, uuid, text, integer, timestamp, check } from "drizzle-orm/pg-core"

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
},
  (table) => ({
    storeCheck: check("stock_check", sql`${table.stock} >= 0`),
  }),
)

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  status: text("status").$type<"pending" | "paid" | "failed">().notNull().default("pending"),
  totalAmount: integer("total_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const order_items = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
})

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  responseBody: text("response_body"),
  statusCode: integer("status_code"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  status: text("status").$type<"pending" | "success" | "failed">().notNull(),
  providerRef: text("provider_ref").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})