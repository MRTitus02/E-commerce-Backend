import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import dotenv from 'dotenv'
import product from './controller/product.controller'
import { docsApp } from './docs/openapi'
import user from './controller/user.controller'
import order from './controller/order.controller'
import webhook from './controller/webhook.controller'
import auth from './controller/auth.controller'
import cart from './controller/cart.controller'
import { env } from 'process'
import { metricsHandler, metricsMiddleware } from './middleware/metrics.middleware'

dotenv.config()

const app = new Hono()
const allowedOrigins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.use('*', cors({
  origin: (origin) => {
    if (allowedOrigins.includes("*")) {
      return origin || "*"
    }
    if (!origin) {
      return allowedOrigins[0] ?? "*"
    }
    return allowedOrigins.includes(origin) ? origin : null
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "stripe-signature"],
}))
app.use('*', metricsMiddleware)
app.get('/metrics', metricsHandler)

app.route("/products", product);
app.route("/users", user);
app.route("/orders", order);
app.route("/cart", cart);
app.route("/webhooks", webhook);
app.route("/auth", auth);


app.route("/docs", docsApp);
app.route("/docs/*", docsApp);

if (process.env.NODE_ENV !== "test") {
  serve({
    fetch: app.fetch,
    port: Number(env.PORT) || 3000,
  }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  })
}

export default app;
