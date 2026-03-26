import { eq } from "drizzle-orm";
import { payments } from "../infra/db/schema";
import { db } from "../infra/db/client";

type PaymentStatus = "success" | "failed";

// Note: Drizzle transaction clients have a slightly different type shape than `db`.
// Using `any` here keeps the repository usable from both `db` and `db.transaction(tx => ...)`.
type DbTx = any;

export const paymentRepository = {
  createPayment: async (
    orderId: string,
    providerRef: string,
    tx: DbTx = db
  ) => {
    return tx
      .insert(payments)
      .values({
        orderId,
        status: "pending",
        providerRef,
      })
      .returning();
  },

  updatePaymentStatus: async (
    providerRef: string,
    status: PaymentStatus,
    tx: DbTx = db
  ) => {
    return tx
      .update(payments)
      .set({ status })
      .where(eq(payments.providerRef, providerRef))
      .returning();
  },

  getPaymentByProviderRef: async (
    providerRef: string,
    tx: DbTx = db
  ) => {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.providerRef, providerRef))
      .limit(1);

    return rows[0] ?? null;
  },
};
