import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authService } from "../service/auth.service";
import { loginSchema, registerSchema, refreshSchema } from "../dto/auth.dto";

const auth = new Hono();

// POST /auth/register
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await authService.register(data);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ message: err.message || "Unknown error" }, err.status || 500);
  }
});

// POST /auth/login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await authService.login(data);
    return c.json(result, 200);
  } catch (err: any) {
    return c.json({ message: err.message || "Unknown error" }, err.status || 500);
  }
});

// POST /auth/refresh
auth.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid("json");
    const result = await authService.refresh(refreshToken);
    return c.json(result, 200);
  } catch (err: any) {
    return c.json({ message: err.message || "Unknown error" }, err.status || 500);
  }
});

export default auth;
