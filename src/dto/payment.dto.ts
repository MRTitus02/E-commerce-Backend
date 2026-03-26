import { z } from "zod";

const providerRefSchema = z.string().min(1);

export const paymentWebhookMockRequestSchema = z.object({
  orderId: z.string().uuid(),
  result: z.enum(["success", "failed"]),
});

export const paymentWebhookMockResponseSchema = z.object({
  success: z.literal(true),
  providerRef: z.string(),
  payload: z.any(),
  stripeSignature: z.string(),
  orderId: z.string().uuid(),
  orderStatus: z.enum(["paid", "failed"]),
  paymentStatus: z.enum(["success", "failed"]),
});

// Stripe-like webhook event shape we document (your handler extracts providerRef from multiple places).
const paymentIntentWebhookEventSchema = z
  .object({
    type: z.enum(["payment_intent.succeeded", "payment_intent.failed"]),
    data: z.object({
      object: z.object({
        providerRef: providerRefSchema.optional(),
        provider_ref: providerRefSchema.optional(),
        metadata: z
          .object({
            providerRef: providerRefSchema.optional(),
          })
          .optional(),
      }),
    }),
  })
  .superRefine((val, ctx) => {
    const obj = val.data.object;
    const hasProviderRef = Boolean(obj.providerRef || obj.provider_ref || obj.metadata?.providerRef);
    if (!hasProviderRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "providerRef/provider_ref/metadata.providerRef is required",
        path: ["data", "object"],
      });
    }
  });

export const paymentWebhookRequestSchema = paymentIntentWebhookEventSchema;

export const paymentWebhookResponseSchema = z.object({
  success: z.literal(true),
  ok: z.literal(true),
  alreadyProcessed: z.boolean(),
  providerRef: z.string(),
  orderId: z.string().uuid(),
  orderStatus: z.enum(["paid", "failed"]),
  paymentStatus: z.enum(["success", "failed"]),
  message: z.string().optional(),
});

