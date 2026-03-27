import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import app from "../index";
import { db } from "../infra/db/client";
import { products, users } from "../infra/db/schema";
import { signAccessToken } from "../utils/jwt";

describe("Cart API", () => {
  let testUserId: string;
  let authToken: string;
  let firstProductId: string;
  let secondProductId: string;
  const runId = randomUUID();

  beforeAll(async () => {
    const userRes = await db.insert(users).values({
      name: "Cart User",
      email: `cart-${runId}@example.com`,
      password: "testpassword",
      role: "user",
    }).returning();

    testUserId = userRes[0].id;
    authToken = signAccessToken({ id: testUserId, email: userRes[0].email, role: "user" });

    const productRes = await db.insert(products).values([
      { name: "Keyboard", description: "Mechanical keyboard", price: 2500, stock: 10 },
      { name: "Mouse", description: "Wireless mouse", price: 1500, stock: 8 },
    ]).returning();

    firstProductId = productRes[0].id;
    secondProductId = productRes[1].id;
  });

  it("should add items to cart, update them, and checkout through /orders", async () => {
    const addFirst = await app.request("/cart/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ productId: firstProductId, quantity: 2 }),
    });

    expect(addFirst.status).toBe(201);

    const addSecond = await app.request("/cart/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ productId: secondProductId, quantity: 1 }),
    });

    expect(addSecond.status).toBe(201);
    const cartAfterAdd = await addSecond.json() as any;
    expect(cartAfterAdd.items).toHaveLength(2);
    expect(cartAfterAdd.totalAmount).toBe(6500);
    expect(cartAfterAdd.items[0].description).toBeTruthy();

    const updateItem = await app.request(`/cart/items/${firstProductId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ quantity: 3 }),
    });

    expect(updateItem.status).toBe(200);
    const updatedCart = await updateItem.json() as any;
    expect(updatedCart.totalAmount).toBe(9000);

    const checkout = await app.request("/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `cart-checkout-key-${runId}`,
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({}),
    });

    expect(checkout.status).toBe(201);
    const checkoutBody = await checkout.json() as any;
    expect(checkoutBody.totalAmount).toBe(9000);
    expect(checkoutBody.items).toHaveLength(2);

    const cartRes = await app.request("/cart", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    });

    expect(cartRes.status).toBe(200);
    const cartBody = await cartRes.json() as any;
    expect(cartBody.items).toHaveLength(0);
    expect(cartBody.totalAmount).toBe(0);

    const firstProduct = await db.select().from(products).where(eq(products.id, firstProductId));
    const secondProduct = await db.select().from(products).where(eq(products.id, secondProductId));
    expect(firstProduct[0].stock).toBe(7);
    expect(secondProduct[0].stock).toBe(7);
  }, 15000);
});
