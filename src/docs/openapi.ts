import { Hono } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { z } from "zod";

import { createAutoRoute } from "../utils/scalargen.js";
import {
  createProductSchema,
  updateProductSchema,
  productResponseSchema,
} from "../dto/product.dto";
import { createUserSchema, updateUserSchema, userResponseSchema } from "../dto/user.dto.js";
import { createOrderSchema, orderResponseSchema } from "../dto/order.dto.js";
import { loginSchema, registerSchema, refreshSchema, authResponseSchema } from "../dto/auth.dto.js";
import {
  paymentWebhookMockRequestSchema,
  paymentWebhookMockResponseSchema,
  paymentWebhookRequestSchema,
  paymentWebhookResponseSchema,
} from "../dto/payment.dto";
import { addCartItemSchema, cartResponseSchema, updateCartItemSchema } from "../dto/cart.dto";

export const openapi = new OpenAPIHono();

const OPENAPI_DOCUMENT_CONFIG = {
  openapi: "3.0.0",
  info: {
    title: "Orders API",
    version: "1.0.0",
    description:
      "E-commerce core API covering authentication, users, products, carts, orders, and payment webhooks.",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const noopHandler = async (c: any) => c.text("", 204);

const authHeaderSchema = z.object({
  authorization: z.string().openapi({
    example: "Bearer <access-token>",
    description: "JWT bearer token returned by the auth endpoints.",
  }),
});

const idempotencyHeaderSchema = authHeaderSchema.extend({
  "idempotency-key": z.string().min(1).openapi({
    example: "checkout-2026-03-27-001",
    description: "Required for POST /orders. Reusing the same key returns the cached order response.",
  }),
});

const stripeSignatureHeaderSchema = z.object({
  "stripe-signature": z.string().openapi({
    example: "t=1711536000,v1=<hex-signature>",
    description: "Stripe-like signature header verified with WEBHOOK_SECRET.",
  }),
});

const messageSchema = z.object({
  message: z.string(),
});

const validationErrorSchema = z.object({
  message: z.literal("Validation failed"),
  issues: z.array(
    z.object({
      path: z.string(),
      message: z.string(),
    }),
  ),
});

const webhookErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

const productDeleteResponseSchema = z.object({
  message: z.string(),
  product: productResponseSchema,
});

const userDeleteResponseSchema = z.object({
  message: z.string(),
  user: userResponseSchema,
});

const commonAuthResponses = {
  401: {
    description: "Missing, invalid, or expired bearer token",
    content: {
      "application/json": {
        schema: messageSchema,
      },
    },
  },
};

const adminOnlyResponses = {
  403: {
    description: "Authenticated user is not an admin",
    content: {
      "application/json": {
        schema: messageSchema,
      },
    },
  },
};

// Introduction
openapi.doc31("/_introduction", {
  openapi: "3.1.0",
  info: {
    title: "Orders API",
    version: "1.0.0",
    description:
      "Documentation order: introduction, auth, users, product, cart, order, payment.",
  },
});

// Auth
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/auth/register",
    tag: "Auth",
    summary: "Register a new user",
    description:
      "Creates a new user account and returns access and refresh tokens. The request may include a role field, which currently matches the implementation contract.",
    requestSchema: registerSchema,
    responseSchema: authResponseSchema,
    responses: {
      201: {
        description: "User registered successfully",
        content: { "application/json": { schema: authResponseSchema } },
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: validationErrorSchema } },
      },
      409: {
        description: "Email already in use",
        content: { "application/json": { schema: messageSchema } },
      },
    },
    security: [],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/auth/login",
    tag: "Auth",
    summary: "Login",
    description: "Authenticates a user and returns access and refresh tokens.",
    requestSchema: loginSchema,
    responseSchema: authResponseSchema,
    responses: {
      200: {
        description: "Login successful",
        content: { "application/json": { schema: authResponseSchema } },
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: validationErrorSchema } },
      },
      401: {
        description: "Invalid credentials",
        content: { "application/json": { schema: messageSchema } },
      },
    },
    security: [],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/auth/refresh",
    tag: "Auth",
    summary: "Refresh tokens",
    description: "Uses a refresh token to issue a new access and refresh token pair.",
    requestSchema: refreshSchema,
    responseSchema: authResponseSchema,
    responses: {
      200: {
        description: "Tokens refreshed successfully",
        content: { "application/json": { schema: authResponseSchema } },
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: validationErrorSchema } },
      },
      401: {
        description: "Invalid or expired refresh token",
        content: { "application/json": { schema: messageSchema } },
      },
      404: {
        description: "User not found for refresh token subject",
        content: { "application/json": { schema: messageSchema } },
      },
    },
    security: [],
  }),
  noopHandler,
);

// Users
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/users",
    tag: "User",
    summary: "Create a new user",
    description:
      "Creates a user record. This endpoint requires an authenticated admin token. Passwords are stored hashed by the service layer.",
    headerSchema: authHeaderSchema,
    requestSchema: createUserSchema,
    responseSchema: userResponseSchema,
    responses: {
      201: {
        description: "User created successfully",
        content: { "application/json": { schema: userResponseSchema } },
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: validationErrorSchema } },
      },
      409: {
        description: "User email already exists",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
      ...adminOnlyResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "get",
    path: "/users",
    tag: "User",
    summary: "Get all users",
    description: "Returns all users. This endpoint requires an authenticated admin token.",
    headerSchema: authHeaderSchema,
    responseSchema: z.array(userResponseSchema),
    responses: {
      200: {
        description: "List of users retrieved successfully",
        content: { "application/json": { schema: z.array(userResponseSchema) } },
      },
      ...commonAuthResponses,
      ...adminOnlyResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "get",
    path: "/users/{id}",
    tag: "User",
    summary: "Get a user by ID",
    description: "Returns a single user by UUID for an authenticated user.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ id: z.string().uuid() }),
    responseSchema: userResponseSchema,
    responses: {
      200: {
        description: "User retrieved successfully",
        content: { "application/json": { schema: userResponseSchema } },
      },
      400: {
        description: "Malformed user ID",
        content: { "application/json": { schema: messageSchema } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "put",
    path: "/users/{id}",
    tag: "User",
    summary: "Update a user by ID",
    description:
      "Updates a user by UUID for an authenticated user. Password updates are re-hashed before persistence.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ id: z.string().uuid() }),
    requestSchema: updateUserSchema,
    responseSchema: userResponseSchema,
    responses: {
      200: {
        description: "User updated successfully",
        content: { "application/json": { schema: userResponseSchema } },
      },
      400: {
        description: "Validation failed or malformed user ID",
        content: { "application/json": { schema: z.union([messageSchema, validationErrorSchema]) } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: messageSchema } },
      },
      409: {
        description: "User email already exists",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "delete",
    path: "/users/{id}",
    tag: "User",
    summary: "Delete a user by ID",
    description: "Deletes a user by UUID for an authenticated user.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ id: z.string().uuid() }),
    responseSchema: userDeleteResponseSchema,
    responses: {
      200: {
        description: "User deleted successfully",
        content: { "application/json": { schema: userDeleteResponseSchema } },
      },
      400: {
        description: "Malformed user ID",
        content: { "application/json": { schema: messageSchema } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

// Product
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/products",
    tag: "Product",
    summary: "Create a new product",
    description:
      "Creates a product. This endpoint requires an authenticated user token. Product creation is not currently admin-only in the implementation.",
    headerSchema: authHeaderSchema,
    requestSchema: createProductSchema,
    responseSchema: productResponseSchema,
    responses: {
      201: {
        description: "Product created successfully",
        content: { "application/json": { schema: productResponseSchema } },
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: validationErrorSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "get",
    path: "/products",
    tag: "Product",
    summary: "Get all products",
    description: "Returns all products visible to an authenticated user.",
    headerSchema: authHeaderSchema,
    responseSchema: z.array(productResponseSchema),
    responses: {
      200: {
        description: "List of products retrieved successfully",
        content: { "application/json": { schema: z.array(productResponseSchema) } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "get",
    path: "/products/{id}",
    tag: "Product",
    summary: "Get a product by ID",
    description: "Returns a single product by UUID for an authenticated user.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ id: z.string().uuid() }),
    responseSchema: productResponseSchema,
    responses: {
      200: {
        description: "Product retrieved successfully",
        content: { "application/json": { schema: productResponseSchema } },
      },
      400: {
        description: "Malformed product ID",
        content: { "application/json": { schema: messageSchema } },
      },
      404: {
        description: "Product not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "put",
    path: "/products/{id}",
    tag: "Product",
    summary: "Update a product by ID",
    description: "Updates a product by UUID. This endpoint requires an authenticated admin token.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ id: z.string().uuid() }),
    requestSchema: updateProductSchema,
    responseSchema: productResponseSchema,
    responses: {
      200: {
        description: "Product updated successfully",
        content: { "application/json": { schema: productResponseSchema } },
      },
      400: {
        description: "Validation failed or malformed product ID",
        content: { "application/json": { schema: z.union([messageSchema, validationErrorSchema]) } },
      },
      404: {
        description: "Product not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
      ...adminOnlyResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "delete",
    path: "/products/{id}",
    tag: "Product",
    summary: "Delete a product by ID",
    description: "Deletes a product by UUID. This endpoint requires an authenticated admin token.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ id: z.string().uuid() }),
    responseSchema: productDeleteResponseSchema,
    responses: {
      200: {
        description: "Product deleted successfully",
        content: { "application/json": { schema: productDeleteResponseSchema } },
      },
      400: {
        description: "Malformed product ID",
        content: { "application/json": { schema: messageSchema } },
      },
      404: {
        description: "Product not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
      ...adminOnlyResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

// Cart
openapi.openapi(
  createAutoRoute({
    method: "get",
    path: "/cart",
    tag: "Cart",
    summary: "Get current cart",
    description:
      "Returns the authenticated user's cart. If the user has no cart yet, an empty cart is created on demand.",
    headerSchema: authHeaderSchema,
    responseSchema: cartResponseSchema,
    responses: {
      200: {
        description: "Cart retrieved successfully",
        content: { "application/json": { schema: cartResponseSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/cart/items",
    tag: "Cart",
    summary: "Add item to cart",
    description:
      "Adds a product to the authenticated user's cart. If the product is already present, the quantity is incremented.",
    headerSchema: authHeaderSchema,
    requestSchema: addCartItemSchema,
    responseSchema: cartResponseSchema,
    responses: {
      201: {
        description: "Cart updated successfully",
        content: { "application/json": { schema: cartResponseSchema } },
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: validationErrorSchema } },
      },
      404: {
        description: "Product not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "put",
    path: "/cart/items/{productId}",
    tag: "Cart",
    summary: "Update cart item quantity",
    description:
      "Sets a new quantity for a specific product already in the authenticated user's cart.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ productId: z.string().uuid() }),
    requestSchema: updateCartItemSchema,
    responseSchema: cartResponseSchema,
    responses: {
      200: {
        description: "Cart updated successfully",
        content: { "application/json": { schema: cartResponseSchema } },
      },
      400: {
        description: "Validation failed or malformed product ID",
        content: { "application/json": { schema: z.union([messageSchema, validationErrorSchema]) } },
      },
      404: {
        description: "Product or cart item not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "delete",
    path: "/cart/items/{productId}",
    tag: "Cart",
    summary: "Remove item from cart",
    description: "Removes a product from the authenticated user's cart.",
    headerSchema: authHeaderSchema,
    paramSchema: z.object({ productId: z.string().uuid() }),
    responseSchema: cartResponseSchema,
    responses: {
      200: {
        description: "Cart updated successfully",
        content: { "application/json": { schema: cartResponseSchema } },
      },
      400: {
        description: "Malformed product ID",
        content: { "application/json": { schema: messageSchema } },
      },
      404: {
        description: "Cart item not found",
        content: { "application/json": { schema: messageSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "delete",
    path: "/cart",
    tag: "Cart",
    summary: "Clear cart",
    description: "Removes all items from the authenticated user's cart.",
    headerSchema: authHeaderSchema,
    responseSchema: cartResponseSchema,
    responses: {
      200: {
        description: "Cart cleared successfully",
        content: { "application/json": { schema: cartResponseSchema } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

// Order
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/orders",
    tag: "Order",
    summary: "Create a new order",
    description:
      "Creates an order for the authenticated user. If `items` is omitted, the API checks out the user's cart directly. Stock is decremented immediately during order creation rather than using a separate reservation lifecycle.",
    headerSchema: idempotencyHeaderSchema,
    requestSchema: createOrderSchema,
    responseSchema: orderResponseSchema,
    responses: {
      201: {
        description: "Order created successfully",
        content: { "application/json": { schema: orderResponseSchema } },
      },
      400: {
        description: "Missing Idempotency-Key, invalid payload, empty cart, or insufficient stock",
        content: { "application/json": { schema: z.union([messageSchema, validationErrorSchema]) } },
      },
      ...commonAuthResponses,
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler,
);

// Payment
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/webhooks/payments/mock",
    tag: "Payment",
    summary: "Mock payment-provider webhook for local testing",
    description:
      "Creates a pending payment row for the supplied order ID, generates a stripe-like signature, and internally calls the real payment webhook handler. Useful for demo and local lifecycle verification.",
    requestSchema: paymentWebhookMockRequestSchema,
    responseSchema: paymentWebhookMockResponseSchema,
    responses: {
      200: {
        description: "Mock payment event processed successfully",
        content: { "application/json": { schema: paymentWebhookMockResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: z.union([messageSchema, validationErrorSchema]) } },
      },
      500: {
        description: "Internal server error",
        content: { "application/json": { schema: webhookErrorSchema } },
      },
    },
    security: [],
  }),
  noopHandler,
);

openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/webhooks/payments",
    tag: "Payment",
    summary: "Payment webhook endpoint",
    description:
      "Verifies a stripe-like `stripe-signature` header using `WEBHOOK_SECRET`, resolves a provider reference from the event payload, and updates both `payments.status` and `orders.status`. Success transitions the order to `paid`, failure transitions it to `failed`. Repeated delivery of the same event is handled idempotently.",
    headerSchema: stripeSignatureHeaderSchema,
    requestSchema: paymentWebhookRequestSchema,
    responseSchema: paymentWebhookResponseSchema,
    responses: {
      200: {
        description: "Webhook processed successfully",
        content: { "application/json": { schema: paymentWebhookResponseSchema } },
      },
      400: {
        description: "Invalid webhook payload",
        content: { "application/json": { schema: z.union([messageSchema, validationErrorSchema]) } },
      },
      401: {
        description: "Invalid signature",
        content: { "text/plain": { schema: z.string() } },
      },
      404: {
        description: "Payment not found",
        content: { "text/plain": { schema: z.string() } },
      },
      500: {
        description: "Internal server error",
        content: { "application/json": { schema: webhookErrorSchema } },
      },
    },
    security: [],
  }),
  noopHandler,
);

export const docsApp = new Hono();

docsApp.get("/openapi.json", (c) => {
  const document = openapi.getOpenAPIDocument(OPENAPI_DOCUMENT_CONFIG);
  document.components = document.components ?? {};
  document.components.securitySchemes = {
    ...(document.components.securitySchemes ?? {}),
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  };
  return c.json(document);
});

const scalarUi = Scalar({
  pageTitle: "Orders API Docs",
  url: "/docs/openapi.json",
});

docsApp.get("/", scalarUi);
docsApp.get("/*", scalarUi);
