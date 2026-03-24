CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"test" text NOT NULL
);
