import { eq } from "drizzle-orm";
import type { CreateUserDTO, UpdateUserDTO } from "../dto/user.dto";
import { db } from "../infra/db/client";
import { users } from "../infra/db/schema";

export const userRepository = {
  create: async (data: CreateUserDTO) => {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  findByEmail: async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  },

  findById: async (id: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  },

  getAll: async () => {
    return db.select().from(users);
  },

  update: async (id: string, data: UpdateUserDTO) => {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user ?? null;
  },

  delete: async (id: string) => {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning();
    return user ?? null;
  },
};
