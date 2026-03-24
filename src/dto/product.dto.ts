import { z } from "zod";

export const createProductSchema = z.object({
    name: z.string().min(2),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;