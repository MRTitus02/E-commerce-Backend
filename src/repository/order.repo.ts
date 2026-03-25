import { db } from "../infra/db/client"
import { orders, order_items, idempotencyKeys } from "../infra/db/schema"
import { eq } from "drizzle-orm"

export const orderRepository = {
  getIdempotency: async (key: string) => {
    return db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key))
  },

  saveIdempotency: async (key: string, responseBody: any, statusCode: number) => {
    return db.insert(idempotencyKeys).values({
      key,
      responseBody,
      statusCode,
    })
  },

  createOrder: async (tx: typeof db, data: any) => {
    return tx.insert(orders).values(data).returning()
  },

  createOrderItems: async (tx: typeof db, items: any[]) => {
    return tx.insert(order_items).values(items)
  },

  getOrderById: async (id: string) => {
    return db.select().from(orders).where(eq(orders.id, id))
  },
}