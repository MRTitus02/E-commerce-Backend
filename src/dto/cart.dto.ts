import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const cartItemResponseSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  price: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
});

export const cartResponseSchema = z.object({
  cartId: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(cartItemResponseSchema),
  totalAmount: z.number().int(),
});

export type AddCartItemDTO = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemDTO = z.infer<typeof updateCartItemSchema>;
export type CartResponseDTO = z.infer<typeof cartResponseSchema>;
