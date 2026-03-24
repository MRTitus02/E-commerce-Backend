import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import product from './controller/product.controller'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route("/products", product);


serve({
  fetch: app.fetch,
  port: 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
