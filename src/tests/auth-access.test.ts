import { beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import app from "../index";
import { db } from "../infra/db/client";
import { cart_items, carts, idempotencyKeys, order_items, orders, payments, products, users } from "../infra/db/schema";
import { eq } from "drizzle-orm";
import { signAccessToken } from "../utils/jwt";

describe("Access control and error handling", () => {
  let userToken: string;
  let adminToken: string;
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

    const insertedUsers = await db.insert(users).values([
      {
        name: "Regular User",
        email: "regular@example.com",
        password: "plain-user-password",
        role: "user",
      },
      {
        name: "Admin User",
        email: "admin@example.com",
        password: "plain-admin-password",
        role: "admin",
      },
    ]).returning();

    userToken = signAccessToken({
      id: insertedUsers[0].id,
      email: insertedUsers[0].email,
      role: insertedUsers[0].role,
    });

    adminToken = signAccessToken({
      id: insertedUsers[1].id,
      email: insertedUsers[1].email,
      role: insertedUsers[1].role,
    });

    const insertedProducts = await db.insert(products).values({
      name: "Guarded Product",
      description: "Needs admin to change",
      price: 100,
      stock: 5,
    }).returning();

    productId = insertedProducts[0].id;
  });

  it("requires a user token for non-auth product reads", async () => {
    const response = await app.request("/products", {
      method: "GET",
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message: "Unauthorized: missing token",
    });
  });

  it("requires an admin token to update a product", async () => {
    const response = await app.request(`/products/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`,
      },
      body: JSON.stringify({ stock: 4 }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "Forbidden: admin access required",
    });
  });

  it("lets an admin create users and stores their password hashed", async () => {
    const response = await app.request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Created By Admin",
        email: "created@example.com",
        password: "secret123",
        role: "user",
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body.email).toBe("created@example.com");
    expect(body.password).not.toBe("secret123");
    expect(await bcrypt.compare("secret123", body.password)).toBe(true);
  });

  it("returns sanitized validation errors instead of raw unknown messages", async () => {
    const response = await app.request("/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        name: "X",
        description: "",
        price: -1,
        stock: -2,
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.message).toBe("Validation failed");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("returns a clean error for malformed identifiers", async () => {
    const response = await app.request("/users/not-a-uuid", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`,
      },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Invalid identifier or malformed input",
    });
  });

  it("requires an admin token to list users", async () => {
    const response = await app.request("/users", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`,
      },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "Forbidden: admin access required",
    });
  });
});
