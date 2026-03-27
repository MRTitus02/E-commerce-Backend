import { db } from "../infra/db/client";
import { products, users } from "../infra/db/schema";
import { signAccessToken } from "../utils/jwt";
import { eq } from "drizzle-orm";
import type { default as HonoAppType } from "../index";
import { randomUUID } from "crypto";

type OrderResponseBody = {
  orderId?: string;
  totalAmount?: number;
  status?: string;
  message?: string;
};

async function seedDemoData(runId: string) {
  const insertedUsers = await db.insert(users).values({
    name: "Concurrency Demo User",
    email: `concurrency-demo-${runId}@example.com`,
    password: "demo-password",
    role: "user",
  }).returning();

  const insertedProducts = await db.insert(products).values({
    name: "Concurrency Demo Product",
    description: "Used to demonstrate no oversell under concurrent requests",
    price: 100,
    stock: 8,
  }).returning();

  return {
    user: insertedUsers[0],
    product: insertedProducts[0],
  };
}

async function main() {
  process.env.DISABLE_HTTP_SERVER = "true";
  console.log("Starting concurrency demo...");
  const { default: app } = await import("../index") as { default: typeof HonoAppType };
  const runId = randomUUID();
  const { user, product } = await seedDemoData(runId);
  const authToken = signAccessToken({ id: user.id, email: user.email, role: user.role });

  console.log(`Seeded user: ${user.email}`);
  console.log(`Seeded product: ${product.name}`);
  console.log(`Initial stock: ${product.stock}`);
  console.log("Launching 5 concurrent order requests for quantity 2 each...");

  const payload = {
    items: [
      { productId: product.id, quantity: 2 },
    ],
  };

  const requests = Array.from({ length: 5 }).map((_, index) =>
    app.request("/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `demo-concurrency-${runId}-${index}`,
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    }),
  );

  const responses = await Promise.all(requests);
  const responseBodies = await Promise.all(
    responses.map(async (response) => ({
      status: response.status,
      body: await response.json() as OrderResponseBody,
    })),
  );

  const successes = responseBodies.filter((result) => result.status === 201);
  const failures = responseBodies.filter((result) => result.status !== 201);

  responseBodies.forEach((result, index) => {
    if (result.status === 201) {
      console.log(
        `Request ${index + 1}: SUCCESS -> orderId=${result.body.orderId}, total=${result.body.totalAmount}, status=${result.body.status}`,
      );
      return;
    }

    console.log(
      `Request ${index + 1}: FAILED -> status=${result.status}, message=${result.body.message ?? "No message"}`,
    );
  });

  const finalProductRows = await db.select().from(products).where(eq(products.id, product.id));
  const finalStock = finalProductRows[0]?.stock ?? null;

  console.log("");
  console.log(`Successful orders: ${successes.length}`);
  console.log(`Failed orders: ${failures.length}`);
  console.log(`Final stock: ${finalStock}`);

  const expectedFailureMessage = "Insufficient stock for one or more items";
  const failureMessagesMatch = failures.every((failure) => failure.body.message === expectedFailureMessage);

  if (successes.length === 4 && failures.length === 1 && finalStock === 0 && failureMessagesMatch) {
    console.log("");
    console.log("Demo result: PASS");
    console.log("The API prevented overselling under concurrent order creation.");
    return;
  }

  console.log("");
  console.log("Demo result: FAIL");
  console.log("Observed results did not match the expected concurrency safety behavior.");
  process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Concurrency demo failed:", message);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 0);
  });
