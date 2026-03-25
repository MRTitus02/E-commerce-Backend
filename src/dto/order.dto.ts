import { z } from "zod";

export const createOrderSchema = z.object({
    userId: z.string(),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().min(1).positive(),
    })),
    totalAmount: z.number().min(0),
    status: z.enum(["pending", "completed", "cancelled"]),
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