import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authService } from "../service/auth.service";
import { loginSchema, registerSchema, refreshSchema } from "../dto/auth.dto";
import { handleApiError } from "../utils/http-error";

const auth = new Hono();

// POST /auth/register
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await authService.register(data);
    return c.json(result, 201);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

// POST /auth/login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await authService.login(data);
    return c.json(result, 200);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

// POST /auth/refresh
auth.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid("json");
    const result = await authService.refresh(refreshToken);
    return c.json(result, 200);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

export default auth;
