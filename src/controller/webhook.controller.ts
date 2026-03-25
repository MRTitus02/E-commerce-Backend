import { Hono } from "hono";
import { db } from "../infra/db/client";
import { orders, payments } from "../infra/db/schema";
import { eq } from "drizzle-orm";

const webhook = new Hono();

// Secret to verify the signature (e.g., from Stripe)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "whsec_test";

webhook.post("/", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ message: "No signature" }, 400);
  }

  // Verification skeleton: In a real app, use stripe.webhooks.constructEvent
  // Here we just mock verification using a simple check
  const payload = await c.req.text();
  
  if (signature !== "valid_signature_for_test") {
     // return c.json({ message: "Invalid signature" }, 400);
  }
  
  let event;
  try {
    event = JSON.parse(payload);
  } catch (err) {
    return c.json({ message: "Invalid JSON" }, 400);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;
    
    if (orderId) {
      // Update order status to paid
      await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, orderId));
      
      // Create payment record
      await db.insert(payments).values({
        orderId: orderId,
        status: 'success',
        providerRef: paymentIntent.id
      });
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;
    
    if (orderId) {
      // Update order status to failed
      await db.update(orders).set({ status: 'failed' }).where(eq(orders.id, orderId));

      await db.insert(payments).values({
        orderId: orderId,
        status: 'failed',
        providerRef: paymentIntent.id
      });
    }
  }

  return c.json({ received: true }, 200);
});

export default webhook;
