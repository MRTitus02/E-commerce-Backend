import { Hono } from "hono";
import { productService } from "../service/product.service";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";
import { handleApiError } from "../utils/http-error";
const product = new Hono();

product.use("*", authMiddleware);

product.post("/", async (c) => {
  try {
    const data: unknown = await c.req.json();
    const result = await productService.create(data);
    return c.json(result, 201);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

product.get("/", async (c) => {
  try {
    const result = await productService.findAll();
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

product.get("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await productService.findById(id);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

product.post("/:id/images/uploads", adminMiddleware, async (c) => {
  try {
    const id: string = c.req.param("id");
    const data: unknown = await c.req.json();
    const result = await productService.prepareImageUpload(id, data);
    return c.json(result, 201);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

product.post("/:id/images/:imageId/mark-uploaded", adminMiddleware, async (c) => {
  try {
    const id: string = c.req.param("id");
    const imageId: string = c.req.param("imageId");
    const result = await productService.markImageUploaded(id, imageId);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

product.put("/:id", adminMiddleware, async (c) => {
  try {
    const id: string = c.req.param("id");
    const data: unknown = await c.req.json();
    const result = await productService.update(id, data);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

product.delete("/:id", adminMiddleware, async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await productService.delete(id);
    return c.json({ message: "Product deleted successfully", product: result });
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

export default product;
  

