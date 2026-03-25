import bcrypt from "bcryptjs";
import { db } from "../infra/db/client";
import { users } from "../infra/db/schema";
import { eq } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import type { LoginDTO, RegisterDTO } from "../dto/auth.dto";

export const authService = {
  register: async (data: RegisterDTO) => {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, data.email));
    if (existing.length > 0) {
      const err: any = new Error("Email already in use");
      err.status = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await db.insert(users).values({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role ?? "user",
    }).returning();

    const user = newUser[0];
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },

  login: async (data: LoginDTO) => {
    const found = await db.select().from(users).where(eq(users.email, data.email));
    if (found.length === 0) {
      const err: any = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    const user = found[0];
    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      const err: any = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },

  refresh: async (refreshToken: string) => {
    let payload: { id: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      const err: any = new Error("Invalid or expired refresh token");
      err.status = 401;
      throw err;
    }

    const found = await db.select().from(users).where(eq(users.id, payload.id));
    if (found.length === 0) {
      const err: any = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const user = found[0];
    const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },
};
