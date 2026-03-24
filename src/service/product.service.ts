import { productRepo } from "../repository/product.repo";
import { createProductSchema, updateProductSchema } from "../dto/product.dto";
import type { CreateProductDTO, UpdateProductDTO } from "../dto/product.dto";

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
            throw new Error("Product not found");
        }
        return product;
    },

    update : async (id: string, data: unknown) => {
        const validateData: UpdateProductDTO = updateProductSchema.parse(data);
        const updatedProduct = await productRepo.update(id, validateData);
        if (!updatedProduct) {
            throw new Error("Product not found or nothing to update");
        }
        return updatedProduct;
    },

    delete : async (id: string) => {
        const deletedProduct = await productRepo.delete(id);
        if (!deletedProduct) {
            throw new Error("Product not found");
        }
        return deletedProduct;
    },
}