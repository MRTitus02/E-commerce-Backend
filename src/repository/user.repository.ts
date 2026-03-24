import { db } from "../infra/db/client"
import { users } from "../infra/db/schema"
import { eq } from "drizzle-orm"
import type { CreateUserDTO, UpdateUserDTO } from "../dto/user.dto"

export const userRepository = {
    create: async (data: CreateUserDTO) => {
        const res = await db.insert(users).values(data).returning();
        return res[0];
    },
    findByEmail: async (email: string) => {
        const res = await db.select().from(users).where(eq(users.email, email))
        return res[0] || null;
    },
    findById: async (id: string) => {
        const res = await db.select().from(users).where(eq(users.id, id))
        return res[0] || null;
    },
    getAll: async () => {
        return db.select().from(users);
    },
    update: async (id: string, data: UpdateUserDTO) => {
        const res = await db.update(users).set(data).where(eq(users.id, id)).returning();
        return res[0];
    },
    delete: async (id: string) => {
        const res = await db.delete(users).where(eq(users.id, id)).returning();
        return res[0];
    }
}