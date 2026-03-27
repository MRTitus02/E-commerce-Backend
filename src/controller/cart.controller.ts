import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { cartService } from "../service/cart.service";
import { handleApiError } from "../utils/http-error";

const cart = new Hono();

cart.use("*", authMiddleware);

cart.get("/", async (c) => {
  try {
    const user = c.get("user");
    const result = await cartService.getCart(user.id);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

cart.post("/items", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const result = await cartService.addItem(user.id, body);
    return c.json(result, 201);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

cart.put("/items/:productId", async (c) => {
  try {
    const user = c.get("user");
    const productId = c.req.param("productId");
    const body = await c.req.json();
    const result = await cartService.updateItem(user.id, productId, body);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

cart.delete("/items/:productId", async (c) => {
  try {
    const user = c.get("user");
    const productId = c.req.param("productId");
    const result = await cartService.removeItem(user.id, productId);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

cart.delete("/", async (c) => {
  try {
    const user = c.get("user");
    const result = await cartService.clearCart(user.id);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

export default cart;
