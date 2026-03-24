// utils/scalargen.ts
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

export type AutoRouteConfig = {
  method: "get" | "post" | "put" | "patch" | "delete" | "options" | "head";
  path: string;
  tag: string;
  summary: string;
  description?: string;

  requestSchema?: z.ZodTypeAny;
  paramSchema?: z.ZodTypeAny;
  querySchema?: z.ZodTypeAny;

  responseSchema?: z.ZodTypeAny;
  responses?: Record<number, any>;

  security?: any[];
};

export const createAutoRoute = ({
  method,
  path,
  tag,
  summary,
  description,
  requestSchema,
  paramSchema,
  querySchema,
  responseSchema,
  responses,
  security,
}: AutoRouteConfig) => {
  const request: any = {};

  if (paramSchema) request.params = paramSchema;
  if (querySchema) request.query = querySchema;

  if (requestSchema) {
    request.body = {
      content: {
        "application/json": {
          schema: requestSchema,
        },
      },
    };
  }

  const defaultResponses: Record<number, any> = {
    200: { description: "Success" },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  };

  if (responseSchema) {
    defaultResponses[200].content = {
      "application/json": {
        schema: responseSchema,
      },
    };
  }

  const finalResponses = responses
    ? { ...defaultResponses, ...responses }
    : defaultResponses;

  return createRoute({
    method,
    path,
    tags: [tag],
    summary,
    description,
    request: Object.keys(request).length ? request : undefined,
    responses: finalResponses,
    security,
  });
};