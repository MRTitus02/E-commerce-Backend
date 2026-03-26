import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import dotenv from 'dotenv'
import product from './controller/product.controller'
import { docsApp } from './docs/openapi'
import user from './controller/user.controller'
import order from './controller/order.controller'
import webhook from './controller/webhook.controller'
import auth from './controller/auth.controller'
import { env } from 'process'
import { metricsHandler, metricsMiddleware } from './middleware/metrics.middleware'

dotenv.config()

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.use('*', metricsMiddleware)
app.get('/metrics', metricsHandler)

app.route("/products", product);
app.route("/users", user);
app.route("/orders", order);
app.route("/webhooks", webhook);
app.route("/auth", auth);


app.route("/docs", docsApp);
app.route("/docs/*", docsApp);

serve({
  fetch: app.fetch,
  port: Number(env.PORT) || 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})

export default app;
