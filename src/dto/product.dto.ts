import { z } from "zod";

export const createProductSchema = z.object({
    name: z.string().min(2),
    description: z.string().min(1),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
});

export const updateProductSchema = createProductSchema.partial();
export const productResponseSchema = createProductSchema.extend({
    id: z.string()
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
export type ProductResponseDTO = z.infer<typeof productResponseSchema>;
