import type { MiddlewareHandler } from "hono";

type RouteMetrics = {
  count: number;
  totalLatencyMs: number;
};

const metricsState: {
  totalRequests: number;
  totalLatencyMs: number;
  routes: Map<string, RouteMetrics>;
} = {
  totalRequests: 0,
  totalLatencyMs: 0,
  routes: new Map(),
};

export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  try {
    await next();
  } finally {
    const latencyMs = Date.now() - start;
    metricsState.totalRequests += 1;
    metricsState.totalLatencyMs += latencyMs;

    const path = c.req.path;
    const existing = metricsState.routes.get(path) ?? { count: 0, totalLatencyMs: 0 };
    existing.count += 1;
    existing.totalLatencyMs += latencyMs;
    metricsState.routes.set(path, existing);
  }
};

export const metricsHandler = (c: any) => {
  const total = metricsState.totalRequests;
  const avgLatencyMs = total > 0 ? metricsState.totalLatencyMs / total : 0;

  const routes = Object.fromEntries(
    [...metricsState.routes.entries()].map(([path, m]) => [
      path,
      {
        count: m.count,
        avgLatencyMs: m.count > 0 ? m.totalLatencyMs / m.count : 0,
      },
    ])
  );

  return c.json({
    totalRequests: total,
    avgLatencyMs,
    routes,
  });
};

// Exporting this is useful for debugging/tests.
export const getMetricsState = () => metricsState;

