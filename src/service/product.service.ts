import { productRepo } from "../repository/product.repo";
import { createProductSchema, updateProductSchema } from "../dto/product.dto";
import type { CreateProductDTO, UpdateProductDTO } from "../dto/product.dto";
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
}
