import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';
import { db } from '../infra/db/client';
import { products, users } from '../infra/db/schema';
import { eq } from 'drizzle-orm';
import { signAccessToken } from '../utils/jwt';
import { randomUUID } from 'crypto';

describe('Order API', () => {
  let testUserId: string;
  let testProductId: string;
  let authToken: string;
  const runId = randomUUID();
  const idempotencyKey = `key-${runId}`;

  beforeAll(async () => {
    // Create a test user
    const userRes = await db.insert(users).values({
      name: 'Test User',
      email: `test-${runId}@example.com`,
      password: 'testpassword',
      role: 'user'
    }).returning();
    testUserId = userRes[0].id;

    // Generate valid Auth Token for test user
    authToken = signAccessToken({ id: testUserId, email: userRes[0].email, role: 'user' });

    // Create a test product with 10 stock
    const productRes = await db.insert(products).values({
      name: 'Test Product',
      description: 'A test product for order flows',
      price: 100,
      stock: 10
    }).returning();
    testProductId = productRes[0].id;
  });

  it('should create an order successfully with idempotency key', async () => {
    const payload = {
      items: [
        { productId: testProductId, quantity: 2 }
      ]
    };

    const res1 = await app.request('/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    expect(res1.status).toBe(201);
    const body1 = await res1.json() as any;
    expect(body1.totalAmount).toBe(200);

    // Check inventory decreased 10 -> 8
    const updatedProduct = await db.select().from(products).where(eq(products.id, testProductId));
    expect(updatedProduct[0].stock).toBe(8);

    // Test idempotency: second request with same key should return 201 and cached header
    const res2 = await app.request('/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    expect(res2.status).toBe(201);
    expect(res2.headers.get('x-idempotency-hit')).toBe('true');
    const body2 = await res2.json() as any;
    expect(body2.orderId).toBe(body1.orderId);

    // Inventory should still be 8 (no double deduction)
    const doubleCheckProduct = await db.select().from(products).where(eq(products.id, testProductId));
    expect(doubleCheckProduct[0].stock).toBe(8);
  });

  it('should prevent overselling under concurrent requests', async () => {
    // Current stock is 8.
    // If we make 5 concurrent requests of quantity 2, it asks for 10.
    // Only 4 should succeed, and 1 should fail.
    
    const payload = {
      items: [
        { productId: testProductId, quantity: 2 }
      ]
    };

    const concurrentRequests = Array.from({ length: 5 }).map((_, i) => 
      app.request('/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `concurrent-key-${runId}-${i}`,
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })
    );

    const responses = await Promise.all(concurrentRequests);
    
    const successes = responses.filter(r => r.status === 201);
    const failures = responses.filter(r => r.status === 400);

    // Exactly 4 should succeed, 1 should fail
    expect(successes.length).toBe(4);
    expect(failures.length).toBe(1);

    // Final stock should be 0
    const finalProduct = await db.select().from(products).where(eq(products.id, testProductId));
    expect(finalProduct[0].stock).toBe(0);

    const errorBody = await failures[0].json() as any;
    expect(errorBody.message).toBe('Insufficient stock for one or more items');
  });
});
