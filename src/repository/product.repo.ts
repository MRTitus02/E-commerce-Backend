import { db } from "../infra/db/client";
import { products } from "../infra/db/schema";
import { eq } from "drizzle-orm";
import type { CreateProductDTO, UpdateProductDTO } from "../dto/product.dto";

export const productRepo = {
    create : async (data: CreateProductDTO) => {
        const res = await db.insert(products).values(data).returning();
        return res[0];
    },

    findAll : async () => {
        return db.select().from(products);
    },

    findById : async (id: string) => {
        const res = await db.select().from(products).where(eq(products.id, id));
        return res[0] || null;
    },

    update : async (id: string, data: UpdateProductDTO) => {
        const res = await db
            .update(products)
            .set(data)
            .where(eq(products.id, id))
            .returning();
        return res[0];
    },

    delete : async (id: string) => {
        const res = await db.delete(products).where(eq(products.id, id)).returning();
        return res[0];
    }
}