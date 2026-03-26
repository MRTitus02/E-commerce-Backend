import { Hono } from "hono";
import { paymentRepository } from "../repository/payment.repo";
import { db } from "../infra/db/client";
import { orders } from "../infra/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const webhook = new Hono();

type PaymentStatus = "success" | "failed";

function getWebhookSecret() {
  // WEBHOOK_SECRET matches the project plan; PAYMENT_SECRET kept as a fallback.
  return process.env.WEBHOOK_SECRET ?? process.env.PAYMENT_SECRET;
}

function parseStripeSignatureHeader(header: string): { timestamp: string; v1: string } | null {
  // Stripe-like header format: "t=<timestamp>,v1=<signature>[,v0=<...>]"
  const parts = header.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return null;
  return { timestamp: tPart.slice(2), v1: v1Part.slice(3) };
}

function verifyStripeSignature(rawBody: string, stripeSignatureHeader: string, secret: string) {
  const parsed = parseStripeSignatureHeader(stripeSignatureHeader);
  if (!parsed) return false;

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const computed = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function buildStripeSignatureHeader(rawBody: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function extractProviderRefAndStatus(body: any): { providerRef: string; status: PaymentStatus } | null {
  // Preferred: stripe webhook-like event.
  const eventType: string | undefined = body?.type;
  const providerRefFromEvent: string | undefined =
    body?.data?.object?.providerRef ?? body?.data?.object?.provider_ref ?? body?.data?.object?.metadata?.providerRef;

  if (eventType === "payment_intent.succeeded" && providerRefFromEvent) {
    return { providerRef: providerRefFromEvent, status: "success" };
  }
  if (eventType === "payment_intent.failed" && providerRefFromEvent) {
    return { providerRef: providerRefFromEvent, status: "failed" };
  }

  // Back-compat: old mocked payload shape `{ providerRef, status }`.
  if (body?.providerRef && (body?.status === "success" || body?.status === "failed")) {
    return { providerRef: body.providerRef, status: body.status };
  }

  return null;
}

async function handlePaymentWebhook(rawBody: string, stripeSignatureHeader?: string) {
  const secret = getWebhookSecret();
  if (!secret) throw new Error("WEBHOOK_SECRET is not configured");

  const body = JSON.parse(rawBody);

  // Precise verification (stripe-signature header). Legacy fallback: body.signature === PAYMENT_SECRET.
  if (stripeSignatureHeader) {
    const ok = verifyStripeSignature(rawBody, stripeSignatureHeader, secret);
    if (!ok) return { ok: false as const, error: "Invalid signature", statusCode: 401 };
  } else {
    // Legacy fallback kept for backward compatibility; requires body.signature to be present.
    if (!body?.signature || body.signature !== secret) {
      return { ok: false as const, error: "Invalid signature", statusCode: 401 };
    }
  }

  const extracted = extractProviderRefAndStatus(body);
  if (!extracted) return { ok: false as const, error: "Invalid webhook payload", statusCode: 400 };

  const payment = await paymentRepository.getPaymentByProviderRef(extracted.providerRef);
  if (!payment) return { ok: false as const, error: "Payment not found", statusCode: 404 };

  // Idempotency: if webhook was already processed for this providerRef+status, do nothing.
  if (payment.status === extracted.status) {
    return {
      ok: true as const,
      alreadyProcessed: true,
      providerRef: extracted.providerRef,
      orderId: payment.orderId,
      orderStatus: payment.status === "success" ? "paid" : "failed",
      paymentStatus: payment.status,
    };
  }

  await db.transaction(async (tx) => {
    const nextOrderStatus = extracted.status === "success" ? "paid" : "failed";

    const updatedOrders = await tx
      .update(orders)
      .set({ status: nextOrderStatus })
      .where(eq(orders.id, payment.orderId))
      .returning();

    if (updatedOrders.length === 0) {
      throw new Error("Order not found for payment");
    }

    const updatedPayments = await paymentRepository.updatePaymentStatus(extracted.providerRef, extracted.status, tx);
    if (updatedPayments.length === 0) {
      throw new Error("Payment not found during update");
    }
  });

  return {
    ok: true as const,
    alreadyProcessed: false,
    providerRef: extracted.providerRef,
    orderId: payment.orderId,
    orderStatus: extracted.status === "success" ? "paid" : "failed",
    paymentStatus: extracted.status,
  };
}

// Payment webhook processing: expects stripe-signature header + JSON body.
webhook.post("/payments", async (c) => {
  try {
    const rawBody = await c.req.text();
    const stripeSignature = c.req.header("stripe-signature");

    const result = await handlePaymentWebhook(rawBody, stripeSignature);
    if (!result.ok) return c.text(result.error, result.statusCode as any);

    return c.json({ success: true, ...result, message: result.alreadyProcessed ? "Already processed" : undefined });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message ?? "Unknown error" }, 500);
  }
});

// Dummy payment-provider endpoint for local testing:
// - Creates a pending payment record
// - Generates a stripe-like signature
// - Simulates sending the succeeding/failed event to the real webhook logic
webhook.post("/payments/mock", async (c) => {
  try {
    const { orderId, result } = await c.req.json();
    if (!orderId) return c.text("orderId is required", 400);
    const eventResult: "success" | "failed" = result === "failed" ? "failed" : "success";

    const secret = getWebhookSecret();
    if (!secret) return c.text("WEBHOOK_SECRET is not configured", 500);

    const providerRef = `pi_${crypto.randomUUID()}`;

    await db.transaction(async (tx) => {
      await paymentRepository.createPayment(orderId, providerRef, tx);
    });

    const event = {
      id: `evt_${crypto.randomUUID()}`,
      type: eventResult === "success" ? "payment_intent.succeeded" : "payment_intent.failed",
      data: {
        object: {
          providerRef,
        },
      },
    };

    const rawBody = JSON.stringify(event);
    const stripeSignature = buildStripeSignatureHeader(rawBody, secret);

    const resultObj = await handlePaymentWebhook(rawBody, stripeSignature);
    if (!resultObj.ok) return c.text(resultObj.error, resultObj.statusCode as any);

    return c.json({
      success: true,
      providerRef,
      payload: event,
      stripeSignature,
      orderId,
      orderStatus: resultObj.orderStatus,
      paymentStatus: resultObj.paymentStatus,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message ?? "Unknown error" }, 500);
  }
});

export default webhook;