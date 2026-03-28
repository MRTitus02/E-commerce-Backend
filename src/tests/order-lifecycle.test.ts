import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import app from "../index";
import { db } from "../infra/db/client";
import { orders, payments, products, users } from "../infra/db/schema";
import { signAccessToken } from "../utils/jwt";
import { eq } from "drizzle-orm";

describe("Order lifecycle with webhook transitions", () => {
  let userId: string;
  let authToken: string;
  let productId: string;
  const runId = randomUUID();

  beforeAll(async () => {
    const insertedUsers = await db.insert(users).values({
      name: "Lifecycle User",
      email: `lifecycle-${runId}@example.com`,
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
    const createdOrder = await createOrder(`lifecycle-success-key-${runId}`, 2);
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
    const createdOrder = await createOrder(`lifecycle-failed-key-${runId}`, 1);
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

  it("returns the authenticated user's current and past orders with product details", async () => {
    const pendingOrder = await createOrder(`lifecycle-history-pending-key-${runId}`, 1);
    const paidOrder = await createOrder(`lifecycle-history-paid-key-${runId}`, 2);

    const paymentTriggerResponse = await app.request("/webhooks/payments/mock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: paidOrder.orderId,
        result: "success",
      }),
    });

    expect(paymentTriggerResponse.status).toBe(200);

    const ordersResponse = await app.request("/orders", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    });

    expect(ordersResponse.status).toBe(200);
    const ordersBody = await ordersResponse.json() as {
      currentOrders: Array<{
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
      }>;
      pastOrders: Array<{
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
      }>;
    };

    const currentOrder = ordersBody.currentOrders.find((order) => order.orderId === pendingOrder.orderId);
    expect(currentOrder).toBeDefined();
    expect(currentOrder?.status).toBe("pending");
    expect(currentOrder?.items).toHaveLength(1);
    expect(currentOrder?.items[0]).toMatchObject({
      productId,
      quantity: 1,
      priceAtPurchase: 120,
      name: "Lifecycle Product",
      description: "Product used for lifecycle tests",
    });

    const historicalOrder = ordersBody.pastOrders.find((order) => order.orderId === paidOrder.orderId);
    expect(historicalOrder).toBeDefined();
    expect(historicalOrder?.status).toBe("paid");
    expect(historicalOrder?.items).toHaveLength(1);
    expect(historicalOrder?.items[0]).toMatchObject({
      productId,
      quantity: 2,
      priceAtPurchase: 120,
      name: "Lifecycle Product",
      description: "Product used for lifecycle tests",
    });

    expect(ordersBody.currentOrders.every((order) => order.status === "pending")).toBe(true);
    expect(ordersBody.pastOrders.every((order) => order.status !== "pending")).toBe(true);
  }, 15000);
});
