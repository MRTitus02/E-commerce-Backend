import { db } from "../db/client";
import { payments } from "../db/schema";
import { eq } from "drizzle-orm";

export const paymentRepository = {
  createPayment: async (orderId: string, providerRef: string) => {
    return db.insert(payments).values({
      orderId,
      status: "pending",
      providerRef,
    }).returning();
  },

  updatePaymentStatus: async (providerRef: string, status: "success" | "failed") => {
    return db.update(payments)
      .set({ status })
      .where(eq(payments.providerRef, providerRef))
      .returning();
  },

  getPaymentByProviderRef: async (providerRef: string) => {
    return db.select().from(payments).where(eq(payments.providerRef, providerRef));
  }
}