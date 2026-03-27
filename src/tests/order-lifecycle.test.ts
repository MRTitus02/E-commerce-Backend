import { beforeAll, describe, expect, it } from "vitest";
import app from "../index";
import { db } from "../infra/db/client";
import { cart_items, carts, idempotencyKeys, order_items, orders, payments, products, users } from "../infra/db/schema";
import { signAccessToken } from "../utils/jwt";
import { eq } from "drizzle-orm";

describe("Order lifecycle with webhook transitions", () => {
  let userId: string;
  let authToken: string;
  let productId: string;

  beforeAll(async () => {
    await db.delete(cart_items);
    await db.delete(carts);
    await db.delete(payments);
    await db.delete(order_items);
    await db.delete(orders);
    await db.delete(idempotencyKeys);
    await db.delete(products);
    await db.delete(users);

    const insertedUsers = await db.insert(users).values({
      name: "Lifecycle User",
      email: "lifecycle@example.com",
      password: "testpassword",
      role: "user",
    }).returning();

    userId = insertedUsers[0].id;
    authToken = signAccessToken({
      id: userId,
      email: insertedUsers[0].email,
      role: insertedUsers[0].role,
    });

    const insertedProducts = await db.insert(products).values({
      name: "Lifecycle Product",
      description: "Product used for lifecycle tests",
      price: 120,
      stock: 12,
    }).returning();

    productId = insertedProducts[0].id;
  });

  async function createOrder(idempotencyKey: string, quantity: number) {
    const response = await app.request("/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        items: [{ productId, quantity }],
      }),
    });

    expect(response.status).toBe(201);
    return await response.json() as {
      orderId: string;
      totalAmount: number;
      status: "pending" | "paid" | "failed";
      items: Array<{ productId: string; quantity: number; priceAtPurchase: number }>;
    };
  }

  it("creates a pending order and transitions it to paid through the payment webhook", async () => {
    const createdOrder = await createOrder("lifecycle-success-key", 2);
    expect(createdOrder.status).toBe("pending");
    expect(createdOrder.totalAmount).toBe(240);

    const pendingOrderRows = await db.select().from(orders).where(eq(orders.id, createdOrder.orderId));
    expect(pendingOrderRows[0].status).toBe("pending");

    const paymentTriggerResponse = await app.request("/webhooks/payments/mock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: createdOrder.orderId,
        result: "success",
      }),
    });

    expect(paymentTriggerResponse.status).toBe(200);
    const paymentTriggerBody = await paymentTriggerResponse.json() as {
      success: boolean;
      providerRef: string;
      payload: Record<string, unknown>;
      stripeSignature: string;
      orderId: string;
      orderStatus: "paid" | "failed";
      paymentStatus: "success" | "failed";
    };

    expect(paymentTriggerBody.success).toBe(true);
    expect(paymentTriggerBody.orderId).toBe(createdOrder.orderId);
    expect(paymentTriggerBody.orderStatus).toBe("paid");
    expect(paymentTriggerBody.paymentStatus).toBe("success");

    const paidOrderRows = await db.select().from(orders).where(eq(orders.id, createdOrder.orderId));
    expect(paidOrderRows[0].status).toBe("paid");

    const paymentRows = await db.select().from(payments).where(eq(payments.orderId, createdOrder.orderId));
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0].providerRef).toBe(paymentTriggerBody.providerRef);
    expect(paymentRows[0].status).toBe("success");

    const repeatedWebhookResponse = await app.request("/webhooks/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": paymentTriggerBody.stripeSignature,
      },
      body: JSON.stringify(paymentTriggerBody.payload),
    });

    expect(repeatedWebhookResponse.status).toBe(200);
    const repeatedWebhookBody = await repeatedWebhookResponse.json() as {
      success: boolean;
      alreadyProcessed: boolean;
      orderStatus: "paid" | "failed";
      paymentStatus: "success" | "failed";
    };

    expect(repeatedWebhookBody.success).toBe(true);
    expect(repeatedWebhookBody.alreadyProcessed).toBe(true);
    expect(repeatedWebhookBody.orderStatus).toBe("paid");
    expect(repeatedWebhookBody.paymentStatus).toBe("success");
  }, 15000);

  it("creates a pending order and transitions it to failed through the payment webhook", async () => {
    const createdOrder = await createOrder("lifecycle-failed-key", 1);
    expect(createdOrder.status).toBe("pending");
    expect(createdOrder.totalAmount).toBe(120);

    const paymentTriggerResponse = await app.request("/webhooks/payments/mock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: createdOrder.orderId,
        result: "failed",
      }),
    });

    expect(paymentTriggerResponse.status).toBe(200);
    const paymentTriggerBody = await paymentTriggerResponse.json() as {
      success: boolean;
      providerRef: string;
      orderId: string;
      orderStatus: "paid" | "failed";
      paymentStatus: "success" | "failed";
    };

    expect(paymentTriggerBody.success).toBe(true);
    expect(paymentTriggerBody.orderId).toBe(createdOrder.orderId);
    expect(paymentTriggerBody.orderStatus).toBe("failed");
    expect(paymentTriggerBody.paymentStatus).toBe("failed");

    const failedOrderRows = await db.select().from(orders).where(eq(orders.id, createdOrder.orderId));
    expect(failedOrderRows[0].status).toBe("failed");

    const paymentRows = await db.select().from(payments).where(eq(payments.orderId, createdOrder.orderId));
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0].providerRef).toBe(paymentTriggerBody.providerRef);
    expect(paymentRows[0].status).toBe("failed");
  }, 15000);
});
