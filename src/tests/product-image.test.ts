import { beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";

vi.mock("../infra/storage/minio", () => ({
  buildProductImageObjectKey: (productId: string, fileName: string) => `products/${productId}/${fileName}`,
  buildPublicObjectUrl: (objectKey: string) => `http://localhost:9000/product-images/${objectKey}`,
  createPresignedImageUpload: async ({ contentType }: { objectKey: string; contentType: string }) => ({
    method: "PUT" as const,
    url: "http://localhost:9000/presigned-upload",
    headers: {
      "Content-Type": contentType,
    },
    expiresInSeconds: 900,
  }),
  assertObjectUploaded: async () => undefined,
}));

import app from "../index";
import { db } from "../infra/db/client";
import { productImages, products, users } from "../infra/db/schema";
import { signAccessToken } from "../utils/jwt";
import { eq } from "drizzle-orm";

describe("Product image upload flow", () => {
  let adminToken: string;
  let productId: string;
  let imageId: string;
  const runId = randomUUID();

  beforeAll(async () => {
    const [admin] = await db.insert(users).values({
      name: "Admin Image Tester",
      email: `admin-image-${runId}@example.com`,
      password: "plain-admin-password",
      role: "admin",
    }).returning();

    adminToken = signAccessToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    const [product] = await db.insert(products).values({
      name: "Camera",
      description: "Mirrorless test product",
      price: 249900,
      stock: 8,
    }).returning();

    productId = product.id;
  });

  it("creates a pending image upload and stores the future URL", async () => {
    const response = await app.request(`/products/${productId}/images/uploads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fileName: "front-view.png",
        contentType: "image/png",
        size: 2048,
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body.image.status).toBe("pending");
    expect(body.image.url).toContain(`/product-images/products/${productId}/front-view.png`);
    expect(body.upload.method).toBe("PUT");
    expect(body.upload.headers["Content-Type"]).toBe("image/png");

    imageId = body.image.id;

    const [storedImage] = await db.select().from(productImages).where(eq(productImages.id, imageId));
    expect(storedImage.status).toBe("pending");
    expect(storedImage.url).toBe(body.image.url);
  });

  it("exposes the image on the product only after mark-uploaded", async () => {
    const pendingProductResponse = await app.request(`/products/${productId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(pendingProductResponse.status).toBe(200);
    const pendingProduct = await pendingProductResponse.json() as any;
    expect(pendingProduct.images).toEqual([]);

    const markResponse = await app.request(`/products/${productId}/images/${imageId}/mark-uploaded`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(markResponse.status).toBe(200);
    const markedBody = await markResponse.json() as any;
    expect(markedBody.image.status).toBe("uploaded");

    const productResponse = await app.request(`/products/${productId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(productResponse.status).toBe(200);
    const productBody = await productResponse.json() as any;
    expect(productBody.images).toHaveLength(1);
    expect(productBody.images[0].id).toBe(imageId);
    expect(productBody.images[0].status).toBe("uploaded");
  });
});
