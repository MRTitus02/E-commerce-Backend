import { db } from "../infra/db/client";
import { products, orders, order_items, idempotencyKeys } from "../infra/db/schema";
import { eq, sql } from "drizzle-orm";
import type { CreateOrder } from "../dto/order.dto";

export const orderService = {
  createOrder: async (idempotencyKey: string, data: Pick<CreateOrder, "userId" | "items">) => {
    // Check idempotency key first
    if (idempotencyKey) {
      const existing = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, idempotencyKey));
      if (existing.length > 0) {
        return {
          statusCode: existing[0].statusCode,
          responseBody: existing[0].responseBody ? JSON.parse(existing[0].responseBody) : null,
          cached: true
        };
      }
    }

    // Begin transaction
    try {
      const result = await db.transaction(async (tx) => {
        let totalAmount = 0;
        const itemsToInsert = [];

        for (const item of data.items) {
          // Update stock and return price. Relies on 'stock_check' DB constraint to prevent oversell.
          const updatedProduct = await tx.update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}` })
            .where(eq(products.id, item.productId))
            .returning();
          
          if (updatedProduct.length === 0) {
            throw new Error(`Product ${item.productId} not found`);
          }

          const product = updatedProduct[0];
          const price = product.price;
          totalAmount += price * item.quantity;

          itemsToInsert.push({
            productId: item.productId,
            quantity: item.quantity,
            price: price
          });
        }

        const newOrder = await tx.insert(orders).values({
          user_id: data.userId,
          totalAmount: totalAmount,
          status: "pending"
        }).returning();

        const orderId = newOrder[0].id;

        const orderItemsData = itemsToInsert.map(i => ({
          orderId: orderId,
          productId: i.productId,
          quantity: i.quantity,
          price: i.price
        }));

        await tx.insert(order_items).values(orderItemsData);

        const responseBody = {
          orderId: orderId,
          totalAmount: totalAmount,
          status: "pending",
          items: orderItemsData.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            priceAtPurchase: i.price
          }))
        };

        if (idempotencyKey) {
          await tx.insert(idempotencyKeys).values({
            key: idempotencyKey,
            responseBody: JSON.stringify(responseBody),
            statusCode: 201
          });
        }

        return { statusCode: 201, responseBody, cached: false };
      });

      return result;
    } catch (error: any) {
      // Catch DB constraint error (postgres err code 23514 is check_violation)
      if (error.code === '23514') {
        throw new Error('Insufficient stock for one or more items');
      }
      throw error;
    }
  }
};
