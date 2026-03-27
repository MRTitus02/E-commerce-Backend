import { and, eq } from "drizzle-orm";
import { db } from "../infra/db/client";
import { cart_items, carts, products } from "../infra/db/schema";
import {
  addCartItemSchema,
  updateCartItemSchema,
  type AddCartItemDTO,
  type CartResponseDTO,
  type UpdateCartItemDTO,
} from "../dto/cart.dto";
import { NotFoundError } from "../utils/http-error";

type DbLike = typeof db | any;

type CheckoutItem = {
  productId: string;
  quantity: number;
};

async function ensureCart(userId: string, tx: DbLike = db) {
  const existing = await tx.select().from(carts).where(eq(carts.userId, userId));
  if (existing.length > 0) {
    return existing[0];
  }

  const created = await tx.insert(carts).values({ userId }).returning();
  return created[0];
}

async function getProductOrThrow(productId: string, tx: DbLike = db) {
  const productRows = await tx.select().from(products).where(eq(products.id, productId));
  if (productRows.length === 0) {
    throw new NotFoundError("Product not found");
  }
  return productRows[0];
}

async function buildCartResponse(userId: string, tx: DbLike = db): Promise<CartResponseDTO> {
  const cart = await ensureCart(userId, tx);
  const rows = await tx
    .select({
      productId: cart_items.productId,
      quantity: cart_items.quantity,
      name: products.name,
      description: products.description,
      price: products.price,
    })
    .from(cart_items)
    .innerJoin(products, eq(products.id, cart_items.productId))
    .where(eq(cart_items.cartId, cart.id));

  const items: CartResponseDTO["items"] = rows.map((row: any) => ({
    productId: row.productId,
    name: row.name,
    description: row.description,
    price: row.price,
    quantity: row.quantity,
    lineTotal: row.price * row.quantity,
  }));

  return {
    cartId: cart.id,
    userId,
    items,
    totalAmount: items.reduce((sum: number, item) => sum + item.lineTotal, 0),
  };
}

async function getCartItemsForCheckout(userId: string, tx: DbLike = db): Promise<CheckoutItem[]> {
  const cart = await ensureCart(userId, tx);
  const rows = await tx
    .select({
      productId: cart_items.productId,
      quantity: cart_items.quantity,
    })
    .from(cart_items)
    .where(eq(cart_items.cartId, cart.id));

  return rows;
}

async function clearCartByUserId(userId: string, tx: DbLike = db) {
  const cart = await ensureCart(userId, tx);
  await tx.delete(cart_items).where(eq(cart_items.cartId, cart.id));
}

export const cartService = {
  getCart: async (userId: string) => {
    return buildCartResponse(userId);
  },

  addItem: async (userId: string, data: unknown) => {
    const validatedData: AddCartItemDTO = addCartItemSchema.parse(data);

    return db.transaction(async (tx) => {
      await getProductOrThrow(validatedData.productId, tx);
      const cart = await ensureCart(userId, tx);

      const existingItem = await tx
        .select()
        .from(cart_items)
        .where(and(
          eq(cart_items.cartId, cart.id),
          eq(cart_items.productId, validatedData.productId),
        ));

      if (existingItem.length > 0) {
        await tx
          .update(cart_items)
          .set({
            quantity: existingItem[0].quantity + validatedData.quantity,
            updatedAt: new Date(),
          })
          .where(eq(cart_items.id, existingItem[0].id));
      } else {
        await tx.insert(cart_items).values({
          cartId: cart.id,
          productId: validatedData.productId,
          quantity: validatedData.quantity,
        });
      }

      return buildCartResponse(userId, tx);
    });
  },

  updateItem: async (userId: string, productId: string, data: unknown) => {
    const validatedData: UpdateCartItemDTO = updateCartItemSchema.parse(data);

    return db.transaction(async (tx) => {
      await getProductOrThrow(productId, tx);
      const cart = await ensureCart(userId, tx);

      const updatedRows = await tx
        .update(cart_items)
        .set({
          quantity: validatedData.quantity,
          updatedAt: new Date(),
        })
        .where(and(
          eq(cart_items.cartId, cart.id),
          eq(cart_items.productId, productId),
        ))
        .returning();

      if (updatedRows.length === 0) {
        throw new NotFoundError("Cart item not found");
      }

      return buildCartResponse(userId, tx);
    });
  },

  removeItem: async (userId: string, productId: string) => {
    return db.transaction(async (tx) => {
      const cart = await ensureCart(userId, tx);
      const deletedRows = await tx
        .delete(cart_items)
        .where(and(
          eq(cart_items.cartId, cart.id),
          eq(cart_items.productId, productId),
        ))
        .returning();

      if (deletedRows.length === 0) {
        throw new NotFoundError("Cart item not found");
      }

      return buildCartResponse(userId, tx);
    });
  },

  clearCart: async (userId: string) => {
    return db.transaction(async (tx) => {
      await clearCartByUserId(userId, tx);
      return buildCartResponse(userId, tx);
    });
  },

  getCartItemsForCheckout,
  clearCartByUserId,
};
