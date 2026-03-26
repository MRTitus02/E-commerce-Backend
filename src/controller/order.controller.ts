import { Hono } from "hono";
import { orderService } from "../service/order.service";
import { authMiddleware } from "../middleware/auth.middleware";

const order = new Hono();

order.post("/", authMiddleware, async (c) => {
  try {
    const idempotencyKey = c.req.header("Idempotency-Key");
    if (!idempotencyKey) {
      return c.json({ message: "Idempotency-Key header is required" }, 400);
    }

    const user = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const data = {
      userId: user.id,
      items: body.items
    };
    
    const result = await orderService.createOrder(idempotencyKey, data);
    
    if (result.cached) {
      c.header("X-Idempotency-Hit", "true");
    }

    return c.json(result.responseBody, result.statusCode as any);
  } catch (err: any) {
    if (err.message === 'Insufficient stock for one or more items') {
      return c.json({ message: err.message }, 400);
    }
    if (err.message === "Cart is empty" || err.message === "Invalid order payload") {
      return c.json({ message: err.message }, 400);
    }
    return c.json({ message: err.message || "Unknown error" }, 500);
  }
});

export default order;
