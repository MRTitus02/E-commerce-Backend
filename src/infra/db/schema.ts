import { sql } from "drizzle-orm"
import { pgTable, uuid, text, integer, timestamp, check, unique } from "drizzle-orm/pg-core"

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
},
  (table) => ({
    storeCheck: check("stock_check", sql`${table.stock} >= 0`),
  }),
)

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  url: text("url").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  status: text("status").$type<"pending" | "uploaded">().notNull().default("pending"),
  uploadedAt: timestamp("uploaded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sizeCheck: check("product_images_size_check", sql`${table.size} > 0`),
  statusCheck: check(
    "product_images_status_check",
    sql`${table.status} in ('pending', 'uploaded')`,
  ),
  objectKeyUnique: unique("product_images_object_key_unique").on(table.objectKey),
}))

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
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userUnique: unique("carts_user_id_unique").on(table.userId),
}))

export const order_items = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
})

export const cart_items = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => carts.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  quantityCheck: check("cart_items_quantity_check", sql`${table.quantity} > 0`),
  cartProductUnique: unique("cart_items_cart_id_product_id_unique").on(table.cartId, table.productId),
}))

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
