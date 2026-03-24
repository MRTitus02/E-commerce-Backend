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

// OpenAPI app (for generating spec)
const openapi = new OpenAPIHono();

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

  
// =======================
// Docs App (Scalar UI)
// =======================

export const docsApp = new Hono();

// OpenAPI JSON
docsApp.get("/openapi.json", (c) => {
  const document = openapi.getOpenAPIDocument(OPENAPI_DOCUMENT_CONFIG);
  return c.json(document);
});

// Scalar UI
const scalarUi = Scalar({
  pageTitle: "My App API Docs",
  url: "/docs/openapi.json",
});

docsApp.get("/", scalarUi);
docsApp.get("/*", scalarUi);