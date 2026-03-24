import { Hono } from "hono";
import { productService } from "../service/product.service";

interface ApiError {
  message: string;
  status?: number;
}
const product = new Hono();

product.post("/", async (c) => {
  try {
    const data: unknown = await c.req.json();
    const result = await productService.create(data);
    return c.json(result, 201);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, 500);
  }
});

product.get("/", async (c) => {
  try {
    const result = await productService.findAll();
    return c.json(result);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 500);
  }
});

product.get("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await productService.findById(id);
    return c.json(result);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 404);
  }
});

product.put("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const data: unknown = await c.req.json();
    const result = await productService.update(id, data);
    return c.json(result);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 400);
  }
});

product.delete("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await productService.delete(id);
    return c.json({ message: "Product deleted successfully", product: result });
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 404);
  }
});

export default product;
  

