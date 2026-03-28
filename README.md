# Orders API

Orders API is an e-commerce core backend built with Hono, Drizzle, Postgres, and Vitest.

It includes:

- auth with access and refresh tokens
- product CRUD
- carts
- idempotent order creation
- payment webhook handling
- metrics
- integration tests
- a standalone concurrency demo script

## Environment

Create or update `.env` with the values your app needs.

Required variables:

- `DATABASE_URL` for the main development database
- `TEST_DATABASE_URL` for the dedicated test database
- `WEBHOOK_SECRET`
- `PAYMENT_SECRET`

Optional JWT variables:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Important:

- `TEST_DATABASE_URL` must be different from `DATABASE_URL`
- tests are intentionally blocked from using the main database

## Install

From the `app` directory:

```bash
npm install
```

## Development Run

Start the API:

```bash
npm run dev
```

The app runs by default at:

```text
http://localhost:3000
```

Useful routes:

- `/docs` for Scalar API docs
- `/docs/openapi.json` for the OpenAPI document
- `/metrics` for metrics output

## Database Migrations

Development database:

```bash
npm run migrate:up
```

Push schema directly to development database:

```bash
npm run migrate:push
```

Generate a new migration after schema changes:

```bash
npm run migrate:generate
```

Open Drizzle Studio for development database:

```bash
npm run studio
```

## Test Database Migrations

Apply migrations to the test database:

```bash
npm run migrate:test
```

Push schema directly to the test database:

```bash
npm run migrate:push:test
```

Open Drizzle Studio for the test database:

```bash
npm run studio:test
```

Recommended first-time test DB setup:

1. Ensure local Postgres is running for `TEST_DATABASE_URL`
2. Run `npm run migrate:test`
3. If the migration path is empty on a fresh DB, run `npm run migrate:push:test`

## Running Tests

Run the full test suite:

```bash
npm run test:run
```

Run Vitest in normal mode:

```bash
npm test
```

Run Vitest in watch mode:

```bash
npm run test:watch
```

Run TypeScript checks:

```bash
npm run typecheck
```

## Auth Flow

Use these endpoints in order:

1. `POST /auth/register` or `POST /auth/login`
2. Copy the returned `accessToken`
3. Send it as:

```http
Authorization: Bearer <accessToken>
```

Notes:

- most API routes require a user access token
- `POST /users` and `GET /users` require an admin token
- `PUT /products/:id` and `DELETE /products/:id` require an admin token

## Order Flow

Standard order creation:

1. Authenticate
2. Create or fetch products
3. Call `POST /orders`
4. Send `Idempotency-Key` header
5. Provide `items` in the request body

Cart checkout flow:

1. Authenticate
2. Add items to `/cart/items`
3. Call `POST /orders` with no explicit `items`
4. The API converts the authenticated user's cart into an order

Order history flow:

1. Authenticate
2. Call `GET /orders`
3. Read `currentOrders` for ongoing `pending` orders
4. Read `pastOrders` for completed `paid` or `failed` orders
5. Use the returned item list to show purchased products and per-item purchase prices

Important inventory note:

- inventory is decremented immediately during order creation
- there is no separate reservation lifecycle

## Payment Webhook Flow

Real webhook endpoint:

- `POST /webhooks/payments`

Mock local test endpoint:

- `POST /webhooks/payments/mock`

Behavior:

- `payment_intent.succeeded` moves the order to `paid`
- `payment_intent.failed` moves the order to `failed`
- repeated webhook delivery is handled idempotently

## Demo Flow

Suggested manual demo sequence:

1. Run `npm run dev`
2. Open `/docs`
3. Register a user or admin
4. Create one or more products
5. Add items to cart
6. Create an order from the cart with `POST /orders`
7. Trigger payment completion with `POST /webhooks/payments/mock`
8. Confirm order status changed through the lifecycle
9. Check `/metrics`
10. Run the concurrency demo script

## Concurrency Demo

Run:

```bash
npm run demo:concurrency
```

What it demonstrates:

- seeds one user and one product
- launches 5 concurrent order requests for quantity 2
- only 4 succeed when stock is 8
- 1 request fails cleanly
- final stock reaches 0
- no oversell occurs
