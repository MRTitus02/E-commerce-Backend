import { and, eq, inArray } from "drizzle-orm";
import type {
  CreateProductDTO,
  PrepareProductImageUploadDTO,
  ProductImageDTO,
  UpdateProductDTO,
} from "../dto/product.dto";
import { db } from "../infra/db/client";
import { productImages, products } from "../infra/db/schema";

type ProductRow = typeof products.$inferSelect;
type ProductImageRow = typeof productImages.$inferSelect;

function toProductImageDto(image: ProductImageRow): ProductImageDTO {
  return {
    id: image.id,
    url: image.url,
    fileName: image.fileName,
    contentType: image.contentType,
    size: image.size,
    status: image.status,
    uploadedAt: image.uploadedAt?.toISOString() ?? null,
    createdAt: image.createdAt?.toISOString() ?? null,
  };
}

function toProductDto(product: ProductRow, images: ProductImageRow[]) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    createdAt: product.createdAt?.toISOString() ?? null,
    images: images.map(toProductImageDto),
  };
}

async function getUploadedImagesForProducts(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, ProductImageRow[]>();
  }

  const rows = await db.select().from(productImages).where(
    and(
      inArray(productImages.productId, productIds),
      eq(productImages.status, "uploaded"),
    ),
  );

  const grouped = new Map<string, ProductImageRow[]>();
  for (const row of rows) {
    const productGroup = grouped.get(row.productId) ?? [];
    productGroup.push(row);
    grouped.set(row.productId, productGroup);
  }

  return grouped;
}

export const productRepo = {
  create: async (data: CreateProductDTO) => {
    const [product] = await db.insert(products).values(data).returning();
    return toProductDto(product, []);
  },

  findAll: async () => {
    const productRows = await db.select().from(products);
    const imagesByProductId = await getUploadedImagesForProducts(productRows.map((product) => product.id));
    return productRows.map((product) => toProductDto(product, imagesByProductId.get(product.id) ?? []));
  },

  findById: async (id: string) => {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) {
      return null;
    }

    const imagesByProductId = await getUploadedImagesForProducts([product.id]);
    return toProductDto(product, imagesByProductId.get(product.id) ?? []);
  },

  update: async (id: string, data: UpdateProductDTO) => {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    if (!product) {
      return null;
    }

    const imagesByProductId = await getUploadedImagesForProducts([product.id]);
    return toProductDto(product, imagesByProductId.get(product.id) ?? []);
  },

  delete: async (id: string) => {
    const product = await productRepo.findById(id);
    if (!product) {
      return null;
    }

    await db.delete(products).where(eq(products.id, id));
    return product;
  },

  createPendingImage: async (
    productId: string,
    data: PrepareProductImageUploadDTO & { objectKey: string; url: string },
  ) => {
    const [image] = await db
      .insert(productImages)
      .values({
        productId,
        objectKey: data.objectKey,
        url: data.url,
        fileName: data.fileName,
        contentType: data.contentType,
        size: data.size,
        status: "pending",
      })
      .returning();

    return {
      dbImage: image,
      image: toProductImageDto(image),
    };
  },

  findImageById: async (productId: string, imageId: string) => {
    const [image] = await db
      .select()
      .from(productImages)
      .where(and(eq(productImages.productId, productId), eq(productImages.id, imageId)));

    return image ?? null;
  },

  markImageUploaded: async (productId: string, imageId: string) => {
    const [image] = await db
      .update(productImages)
      .set({
        status: "uploaded",
        uploadedAt: new Date(),
      })
      .where(and(eq(productImages.productId, productId), eq(productImages.id, imageId)))
      .returning();

    if (!image) {
      return null;
    }

    return toProductImageDto(image);
  },
};
