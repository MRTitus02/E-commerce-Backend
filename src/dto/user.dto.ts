import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["user", "admin"]).default("user"),
});

export const updateUserSchema = createUserSchema.partial();

export const userResponseSchema = createUserSchema.extend({
    id: z.string(),
    createdAt: z.string().optional(),
});

export type UserResponseDTO = z.infer<typeof userResponseSchema>;
export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;