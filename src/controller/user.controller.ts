import { Hono } from "hono";
import { userService } from "../service/user.service";

interface ApiError {
  message: string;
  status?: number;
}

const user = new Hono();

user.post("/", async (c) => {
  try {
    const data: unknown = await c.req.json();
    const result = await userService.create(data);
    return c.json(result, 201);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, 500);
  }
});

user.get("/", async (c) => {
  try {
    const result = await userService.getAllUsers();
    return c.json(result);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 500);
  }
});

user.get("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await userService.getUser(id);
    return c.json(result);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 404);
  }
});

user.put("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const data: unknown = await c.req.json();
    const result = await userService.updateUser(id, data);
    return c.json(result);
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 400);
  }
});

user.delete("/:id", async (c) => {
  try {
    const id: string = c.req.param("id");
    const result = await userService.deleteUser(id);
    return c.json({ message: "User deleted successfully", user: result });
  } catch (err: unknown) {
    const error: ApiError =
      err instanceof Error
        ? { message: err.message }
        : { message: "Unknown error" };
    return c.json(error, (err as any)?.status || 404);
  }
});

export default user;