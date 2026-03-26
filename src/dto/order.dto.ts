import { z } from "zod";

export const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1),
    })).min(1).optional(),
});

export type CreateOrder = z.infer<typeof createOrderSchema>;

export const orderResponseSchema = z.object({
  orderId: z.string(),
  totalAmount: z.number(),
  status: z.enum(["pending", "paid", "failed"]),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int(),
      priceAtPurchase: z.number(),
    })
  )
})

export type OrderResponse = z.infer<typeof orderResponseSchema>


export const idempotencyResponseSchema = z.object({
  key: z.string(),
  responseBody: orderResponseSchema,
  statusCode: z.number(),
  createdAt: z.string(),
})

export type IdempotencyResponse = z.infer<typeof idempotencyResponseSchema>
