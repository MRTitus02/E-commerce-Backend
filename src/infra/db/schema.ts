import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core"

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})