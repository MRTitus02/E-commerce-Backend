import type { Context } from "hono";
import { ZodError } from "zod";

export class AppError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

type ErrorWithCode = {
  code?: string;
  status?: number;
  message?: string;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

function mapDatabaseError(error: ErrorWithCode) {
  switch (error.code) {
    case "22P02":
      return { status: 400, body: { message: "Invalid identifier or malformed input" } };
    case "23503":
      return { status: 409, body: { message: "Request conflicts with related data" } };
    case "23505":
      return { status: 409, body: { message: "A resource with the same unique value already exists" } };
    case "23514":
      return { status: 400, body: { message: "Request violates a business rule constraint" } };
    default:
      return null;
  }
}

export function getErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        message: "Validation failed",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    };
  }

  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { message: error.message },
    };
  }

  if (typeof error === "object" && error !== null) {
    const typedError = error as ErrorWithCode;
    const mappedDbError = mapDatabaseError(typedError);
    if (mappedDbError) {
      return mappedDbError;
    }

    if (typeof typedError.status === "number" && typedError.message) {
      return {
        status: typedError.status,
        body: { message: typedError.message },
      };
    }
  }

  return {
    status: 500,
    body: { message: "Internal server error" },
  };
}

export function handleApiError(c: Context, error: unknown) {
  const { status, body } = getErrorResponse(error);
  return c.json(body, status as any);
}
