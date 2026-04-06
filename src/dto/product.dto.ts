import { z } from "zod";

export const createProductSchema = z.object({
    name: z.string().min(2),
    description: z.string().min(1),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
});

export const updateProductSchema = createProductSchema.partial();
export const productImageSchema = z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().int().positive(),
    status: z.enum(["pending", "uploaded"]),
    uploadedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime().nullable(),
});

export const productResponseSchema = createProductSchema.extend({
    id: z.string().uuid(),
    createdAt: z.string().datetime().nullable(),
    images: z.array(productImageSchema),
});

export const prepareProductImageUploadSchema = z.object({
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().int().positive().max(10 * 1024 * 1024),
});

export const prepareProductImageUploadResponseSchema = z.object({
    image: productImageSchema,
    upload: z.object({
        method: z.literal("PUT"),
        url: z.string().url(),
        headers: z.object({
            "Content-Type": z.string().min(1),
        }),
        expiresInSeconds: z.number().int().positive(),
    }),
});

export const markProductImageUploadedSchema = z.object({});

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
export type ProductResponseDTO = z.infer<typeof productResponseSchema>;
export type ProductImageDTO = z.infer<typeof productImageSchema>;
export type PrepareProductImageUploadDTO = z.infer<typeof prepareProductImageUploadSchema>;
