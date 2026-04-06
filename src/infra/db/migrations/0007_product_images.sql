CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"url" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"uploaded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "product_images_size_check" CHECK ("product_images"."size" > 0),
	CONSTRAINT "product_images_status_check" CHECK ("product_images"."status" in ('pending', 'uploaded')),
	CONSTRAINT "product_images_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
