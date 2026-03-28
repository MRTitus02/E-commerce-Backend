import { z } from "zod";

export const orderStatusSchema = z.enum(["pending", "paid", "failed"]);

export const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1),
    })).min(1).optional(),
});

export type CreateOrder = z.infer<typeof createOrderSchema>;

export const orderItemResponseSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int(),
  priceAtPurchase: z.number(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const orderResponseSchema = z.object({
  orderId: z.string(),
  totalAmount: z.number(),
  status: orderStatusSchema,
  items: z.array(orderItemResponseSchema)
});

export type OrderResponse = z.infer<typeof orderResponseSchema>

export const orderHistoryEntrySchema = z.object({
  orderId: z.string().uuid(),
  totalAmount: z.number(),
  status: orderStatusSchema,
  createdAt: z.string().nullable(),
  items: z.array(orderItemResponseSchema.extend({
    name: z.string(),
    description: z.string(),
  })),
});

export const orderHistoryResponseSchema = z.object({
  currentOrders: z.array(orderHistoryEntrySchema),
  pastOrders: z.array(orderHistoryEntrySchema),
});

export type OrderHistoryResponse = z.infer<typeof orderHistoryResponseSchema>;


export const idempotencyResponseSchema = z.object({
  key: z.string(),
  responseBody: orderResponseSchema,
  statusCode: z.number(),
  createdAt: z.string(),
})

export type IdempotencyResponse = z.infer<typeof idempotencyResponseSchema>
