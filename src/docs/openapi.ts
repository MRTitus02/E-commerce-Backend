// docs/openapi.ts
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


// OpenAPI app (for generating spec)
export const openapi = new OpenAPIHono();

const OPENAPI_DOCUMENT_CONFIG = {
  openapi: "3.0.0",
  info: {
    title: "My App API",
    version: "1.0.0",
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
  security: [{ bearerAuth: [] }],
};

const noopHandler = async (c: any) => c.text("", 204);

//  Product: Create
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/products",
    tag: "Product",
    summary: "Create a new product",
    description: "Creates a new product with the provided details",

    requestSchema: createProductSchema,
    responseSchema: productResponseSchema,

    responses: {
      201: {
        description: "Product created successfully",
        content: {
          "application/json": {
            schema: productResponseSchema,
          },
        },
      },
    },

    security: [{ bearerAuth: [] }],
  }),
  noopHandler
);

openapi.openapi(
    createAutoRoute({
      method: "get",
      path: "/products",
      tag: "Product",
      summary: "Get all products",
      description: "Retrieves a list of all products",
      responseSchema: z.array(productResponseSchema),

      responses: {
        200: {
          description: "List of products retrieved successfully",
          content: {
            "application/json": {
              schema: z.array(productResponseSchema),
            },
          },
        },
      }
    }),
    noopHandler
  );

openapi.openapi(
    createAutoRoute({
      method: "get",
      path: "/products/{id}",
      tag: "Product",
      summary: "Get a product by ID",
      description: "Retrieves a product by its ID",

      paramSchema: z.object({ id: z.string() }),
      responseSchema: productResponseSchema,

      responses: {
        200: {
          description: "Product retrieved successfully",
          content: {
            "application/json": {
                schema: productResponseSchema,
            },
          },
        },
      }
    }),
    noopHandler
  );

openapi.openapi(
    createAutoRoute({
      method: "put",
      path: "/products/{id}",
      tag: "Product",
      summary: "Update a product by ID",
      description: "Updates a product by its ID",

      paramSchema: z.object({ id: z.string() }),
      requestSchema: updateProductSchema,
      responseSchema: productResponseSchema,

      responses: {
        200: {
          description: "Product updated successfully",
          content: {
            "application/json": {
                schema: productResponseSchema,
            },
          },
        },
      }
    }),
    noopHandler
  );

openapi.openapi(
    createAutoRoute({
      method: "delete",
      path: "/products/{id}",
      tag: "Product",
      summary: "Delete a product by ID",
      description: "Deletes a product by its ID",

      paramSchema: z.object({ id: z.string() }),
      responses: {
        200: {
          description: "Product deleted successfully",
          content: {
            "application/json": {
                schema: z.object({ message: z.string() }),
            },
          },
      }
      }
          }
    ),
    noopHandler
  );

//  User: Create
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/users",
    tag: "User",
    summary: "Create a new user",
    description: "Creates a new user with the provided details",

    requestSchema: createUserSchema,
    responseSchema: userResponseSchema,

    responses: {
      201: {
        description: "User created successfully",
        content: {
          "application/json": {
            schema: userResponseSchema,
          },
        },
      },
    },

    security: [{ bearerAuth: [] }],
  }),
  noopHandler
);

openapi.openapi(
    createAutoRoute({
      method: "get",
      path: "/users",
      tag: "User",
      summary: "Get all users",
      description: "Retrieves a list of all users",

      responseSchema: z.array(userResponseSchema),

      responses: {
        200: {
          description: "List of users retrieved successfully",
          content: {
            "application/json": {
              schema: z.array(userResponseSchema),
            },
          },
        },
      }
    }),
    noopHandler
  );

openapi.openapi(
    createAutoRoute({
      method: "get",
      path: "/users/{id}",
      tag: "User",
      summary: "Get a user by ID",
      description: "Retrieves a user by its ID",

      paramSchema: z.object({ id: z.string() }),
      responseSchema: userResponseSchema,

      responses: {
        200: {
          description: "User retrieved successfully",
          content: {
            "application/json": {
                schema: userResponseSchema,
            },
          },
        },
      }
    }),
    noopHandler
  );

openapi.openapi(
    createAutoRoute({
      method: "put",
      path: "/users/{id}",
      tag: "User",
      summary: "Update a user by ID",
      description: "Updates a user by its ID",

      paramSchema: z.object({ id: z.string() }),
      requestSchema: updateUserSchema,
      responseSchema: userResponseSchema,

      responses: {
        200: {
          description: "User updated successfully",
          content: {
            "application/json": {
                schema: userResponseSchema,
            },
          },
        },
      }
    }),
    noopHandler
  );

openapi.openapi(
    createAutoRoute({
      method: "delete",
      path: "/users/{id}",
      tag: "User",
      summary: "Delete a user by ID",
      description: "Deletes a user by its ID",

      paramSchema: z.object({ id: z.string() }),
      responses: {
        200: {
          description: "User deleted successfully",
          content: {
            "application/json": {
                schema: z.object({ message: z.string() }),
            },
          },
      }
      }
          }
    ),
    noopHandler
  );

//  Order: Create
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/orders",
    tag: "Order",
    summary: "Create a new order",
    description: "Creates a new order from products idempotently.",

    requestSchema: createOrderSchema,
    responseSchema: orderResponseSchema,

    responses: {
      201: {
        description: "Order created successfully",
        content: {
          "application/json": {
            schema: orderResponseSchema,
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  }),
  noopHandler
);

// Auth: Register
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/auth/register",
    tag: "Auth",
    summary: "Register a new user",
    description: "Creates a new user account and returns access + refresh tokens.",
    requestSchema: registerSchema,
    responseSchema: authResponseSchema,
    responses: {
      201: {
        description: "User registered successfully",
        content: { "application/json": { schema: authResponseSchema } },
      },
    },
  }),
  noopHandler
);

// Auth: Login
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/auth/login",
    tag: "Auth",
    summary: "Login",
    description: "Authenticates a user and returns access + refresh tokens.",
    requestSchema: loginSchema,
    responseSchema: authResponseSchema,
    responses: {
      200: {
        description: "Login successful",
        content: { "application/json": { schema: authResponseSchema } },
      },
    },
  }),
  noopHandler
);

// Auth: Refresh
openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/auth/refresh",
    tag: "Auth",
    summary: "Refresh tokens",
    description: "Uses a refresh token to issue a new access + refresh token pair.",
    requestSchema: refreshSchema,
    responseSchema: authResponseSchema,
    responses: {
      200: {
        description: "Tokens refreshed successfully",
        content: { "application/json": { schema: authResponseSchema } },
      },
    },
  }),
  noopHandler
);

// =======================
// Payment Webhooks: Mock + Real
// =======================

openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/webhooks/payments/mock",
    tag: "Payment",
    summary: "Mock payment-provider webhook (local testing)",
    description:
      "Creates a pending payment and simulates a provider webhook event by calling the real /webhooks/payments handler internally.",
    requestSchema: paymentWebhookMockRequestSchema,
    responseSchema: paymentWebhookMockResponseSchema,
    responses: {
      400: {
        description: "Invalid request",
      },
      500: {
        description: "Internal server error",
      },
    },
    security: [],
  }),
  noopHandler
);

openapi.openapi(
  createAutoRoute({
    method: "post",
    path: "/webhooks/payments",
    tag: "Payment",
    summary: "Payment webhook endpoint",
    description:
      "Verifies a stripe-like signature from the `stripe-signature` header using WEBHOOK_SECRET, then updates `orders.status` and `payments.status` based on `payment_intent.succeeded` / `payment_intent.failed`.",
    requestSchema: paymentWebhookRequestSchema,
    responseSchema: paymentWebhookResponseSchema,
    responses: {
      400: {
        description: "Invalid webhook payload",
      },
      401: {
        description: "Invalid signature",
      },
      404: {
        description: "Payment not found",
      },
      500: {
        description: "Internal server error",
      },
    },
    security: [],
  }),
  noopHandler
);

// =======================
// Docs App (Scalar UI)
// =======================

export const docsApp = new Hono();

// OpenAPI JSON
docsApp.get("/openapi.json", (c) => {
  const document = openapi.getOpenAPIDocument(OPENAPI_DOCUMENT_CONFIG);
  // ensure the bearerAuth scheme exists
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

// Scalar UI
const scalarUi = Scalar({
  pageTitle: "My App API Docs",
  url: "/docs/openapi.json",
});

docsApp.get("/", scalarUi);
docsApp.get("/*", scalarUi);