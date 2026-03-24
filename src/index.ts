import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import product from './controller/product.controller'
import { docsApp } from './docs/openapi'
import user from './controller/user.controller'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route("/products", product);
app.route("/users", user);

app.route("/docs", docsApp);
app.route("/docs/*", docsApp);

serve({
  fetch: app.fetch,
  port: 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
