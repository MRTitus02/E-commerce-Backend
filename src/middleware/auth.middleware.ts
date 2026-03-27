import { createMiddleware } from "hono/factory";
import { verifyAccessToken } from "../utils/jwt";
import { ForbiddenError, UnauthorizedError } from "../utils/http-error";

type AuthUser = { id: string; email: string; role: string };

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Unauthorized: missing token");
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    c.set("user", payload);
    await next();
  } catch {
    throw new UnauthorizedError("Unauthorized: invalid or expired token");
  }
});

export const adminMiddleware = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    throw new ForbiddenError("Forbidden: admin access required");
  }
  await next();
});
