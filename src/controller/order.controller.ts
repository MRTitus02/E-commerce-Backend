import { Hono } from "hono";
import { orderService } from "../service/order.service";
import { authMiddleware } from "../middleware/auth.middleware";
import { handleApiError } from "../utils/http-error";

const order = new Hono();

order.get("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const result = await orderService.getOrdersForUser(user.id);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

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
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

export default order;
