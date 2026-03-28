import { db } from "../infra/db/client";
import { products, orders, order_items, idempotencyKeys } from "../infra/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { createOrderSchema, type CreateOrder } from "../dto/order.dto";
import { cartService } from "./cart.service";
import { BadRequestError } from "../utils/http-error";

export const orderService = {
  getOrdersForUser: async (userId: string) => {
    const rows = await db
      .select({
        orderId: orders.id,
        totalAmount: orders.totalAmount,
        status: orders.status,
        createdAt: orders.createdAt,
        productId: order_items.productId,
        quantity: order_items.quantity,
        priceAtPurchase: order_items.price,
        productName: products.name,
        productDescription: products.description,
      })
      .from(orders)
      .innerJoin(order_items, eq(order_items.orderId, orders.id))
      .innerJoin(products, eq(products.id, order_items.productId))
      .where(eq(orders.user_id, userId))
      .orderBy(desc(orders.createdAt), desc(orders.id));

    const orderMap = new Map<string, {
      orderId: string;
      totalAmount: number;
      status: "pending" | "paid" | "failed";
      createdAt: string | null;
      items: Array<{
        productId: string;
        quantity: number;
        priceAtPurchase: number;
        name: string;
        description: string;
      }>;
    }>();

    for (const row of rows) {
      const existing = orderMap.get(row.orderId);
      if (existing) {
        existing.items.push({
          productId: row.productId,
          quantity: row.quantity,
          priceAtPurchase: row.priceAtPurchase,
          name: row.productName,
          description: row.productDescription,
        });
        continue;
      }

      orderMap.set(row.orderId, {
        orderId: row.orderId,
        totalAmount: row.totalAmount,
        status: row.status,
        createdAt: row.createdAt ? row.createdAt.toISOString() : null,
        items: [
          {
            productId: row.productId,
            quantity: row.quantity,
            priceAtPurchase: row.priceAtPurchase,
            name: row.productName,
            description: row.productDescription,
          },
        ],
      });
    }

    const allOrders = Array.from(orderMap.values());

    return {
      currentOrders: allOrders.filter((order) => order.status === "pending"),
      pastOrders: allOrders.filter((order) => order.status !== "pending"),
    };
  },

  createOrder: async (idempotencyKey: string, data: { userId: string; items?: CreateOrder["items"] }) => {
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
        const validatedInput = createOrderSchema.parse({ items: data.items });
        const useCart = !validatedInput.items;
        const checkoutItems = useCart
          ? await cartService.getCartItemsForCheckout(data.userId, tx)
          : validatedInput.items ?? [];

        if (checkoutItems.length === 0) {
          throw new BadRequestError("Cart is empty");
        }

        let totalAmount = 0;
        const itemsToInsert = [];

        for (const item of checkoutItems) {
          // Update stock and return price. Relies on 'stock_check' DB constraint to prevent oversell.
          const updatedProduct = await tx.update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}` })
            .where(
              and(
                eq(products.id, item.productId),
                sql`${products.stock} >= ${item.quantity}`
              )
            )
            .returning();
          
          if (updatedProduct.length === 0) {
            throw new BadRequestError("Insufficient stock for one or more items");
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

        if (useCart) {
          await cartService.clearCartByUserId(data.userId, tx);
        }

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
        throw new BadRequestError("Insufficient stock for one or more items");
      }
      if (error?.name === "ZodError") {
        throw new BadRequestError("Invalid order payload");
      }
      throw error;
    }
  }
};
