import { createMiddleware } from "hono/factory";
import { verifyAccessToken } from "../utils/jwt";

type AuthUser = { id: string; email: string; role: string };

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized: missing token" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ message: "Unauthorized: invalid or expired token" }, 401);
  }
});

export const adminMiddleware = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    return c.json({ message: "Forbidden: admin access required" }, 403);
  }
  await next();
});
