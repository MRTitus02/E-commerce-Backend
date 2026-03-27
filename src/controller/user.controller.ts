import { Hono } from "hono";
import { userService } from "../service/user.service";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";
import { handleApiError } from "../utils/http-error";

const user = new Hono();

user.use("*", authMiddleware);

user.post("/", adminMiddleware, async (c) => {
  try {
    const data: unknown = await c.req.json();
    const result = await userService.create(data);
    return c.json(result, 201);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

user.get("/", adminMiddleware, async (c) => {
  try {
    const result = await userService.getAllUsers();
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

user.get("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await userService.getUser(id);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

user.put("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const data: unknown = await c.req.json();
    const result = await userService.updateUser(id, data);
    return c.json(result);
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

user.delete("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await userService.deleteUser(id);
    return c.json({ message: "User deleted successfully", user: result });
  } catch (err: unknown) {
    return handleApiError(c, err);
  }
});

export default user;
