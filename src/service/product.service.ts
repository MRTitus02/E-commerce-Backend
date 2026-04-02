import { productRepo } from "../repository/product.repo";
import {
    createProductSchema,
    prepareProductImageUploadSchema,
    updateProductSchema,
} from "../dto/product.dto";
import type { CreateProductDTO, UpdateProductDTO } from "../dto/product.dto";
import {
    assertObjectUploaded,
    buildProductImageObjectKey,
    buildPublicObjectUrl,
    createPresignedImageUpload,
} from "../infra/storage/minio";
import { BadRequestError, NotFoundError } from "../utils/http-error";

export const productService = {
    create : async (data: unknown) => {
        const validateData: CreateProductDTO = createProductSchema.parse(data);
        return productRepo.create(validateData); 
    },

    findAll : async () => {
        return productRepo.findAll();
    },

    findById : async (id: string) => {
        const product = await productRepo.findById(id);
        if (!product) {
            throw new NotFoundError("Product not found");
        }
        return product;
    },

    update : async (id: string, data: unknown) => {
        const validateData: UpdateProductDTO = updateProductSchema.parse(data);
        if (Object.keys(validateData).length === 0) {
            throw new BadRequestError("At least one product field is required");
        }
        const updatedProduct = await productRepo.update(id, validateData);
        if (!updatedProduct) {
            throw new NotFoundError("Product not found");
        }
        return updatedProduct;
    },

    delete : async (id: string) => {
        const deletedProduct = await productRepo.delete(id);
        if (!deletedProduct) {
            throw new NotFoundError("Product not found");
        }
        return deletedProduct;
    },

    prepareImageUpload: async (productId: string, data: unknown) => {
        const product = await productRepo.findById(productId);
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        const validatedData = prepareProductImageUploadSchema.parse(data);
        const objectKey = buildProductImageObjectKey(productId, validatedData.fileName);
        const publicUrl = buildPublicObjectUrl(objectKey);

        const { image } = await productRepo.createPendingImage(productId, {
            ...validatedData,
            objectKey,
            url: publicUrl,
        });

        const upload = await createPresignedImageUpload({
            objectKey,
            contentType: validatedData.contentType,
        });

        return {
            image,
            upload,
        };
    },

    markImageUploaded: async (productId: string, imageId: string) => {
        const image = await productRepo.findImageById(productId, imageId);
        if (!image) {
            throw new NotFoundError("Product image not found");
        }

        if (image.status === "uploaded") {
            return {
                image: {
                    id: image.id,
                    url: image.url,
                    fileName: image.fileName,
                    contentType: image.contentType,
                    size: image.size,
                    status: image.status,
                    uploadedAt: image.uploadedAt?.toISOString() ?? null,
                    createdAt: image.createdAt?.toISOString() ?? null,
                },
            };
        }

        try {
            await assertObjectUploaded(image.objectKey);
        } catch {
            throw new BadRequestError("Image object is not available in storage yet");
        }

        const uploadedImage = await productRepo.markImageUploaded(productId, imageId);
        if (!uploadedImage) {
            throw new NotFoundError("Product image not found");
        }

        return { image: uploadedImage };
    },
}
