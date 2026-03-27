import { userRepository } from "../repository/user.repository";
import { createUserSchema, updateUserSchema } from "../dto/user.dto";
import type { CreateUserDTO, UpdateUserDTO } from "../dto/user.dto";
import bcrypt from "bcryptjs";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/http-error";

class UserNotFoundError extends NotFoundError {
  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

class UserAlreadyExistsError extends ConflictError {
  constructor(message = "User already exists") {
    super(message);
    this.name = "UserAlreadyExistsError";
  }
}

export const userService = {
  create: async (data: unknown) => {
    const validateData: CreateUserDTO = createUserSchema.parse(data);

    const existingUser = await userRepository.findByEmail(validateData.email);
    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const hashedPassword = await bcrypt.hash(validateData.password, 10);
    const newUser = await userRepository.create({
      ...validateData,
      password: hashedPassword,
    });
    return newUser;
  },

getUser: async (id: string) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new UserNotFoundError();
  }
  return user;
},

  getAllUsers: async () => {
    return userRepository.getAll();
  },

  updateUser: async (id: string, data: unknown) => {
    const validateData: UpdateUserDTO = updateUserSchema.parse(data);
    if (Object.keys(validateData).length === 0) {
      throw new BadRequestError("At least one user field is required");
    }

    if (validateData.email) {
      const existingUser = await userRepository.findByEmail(validateData.email);
      if (existingUser && existingUser.id !== id) {
        throw new UserAlreadyExistsError();
      }
    }

    const updatePayload = { ...validateData };
    if (validateData.password) {
      updatePayload.password = await bcrypt.hash(validateData.password, 10);
    }

    const updatedUser = await userRepository.update(id, updatePayload);
    if (!updatedUser) {
      throw new UserNotFoundError();
    }
    return updatedUser;
  },

  deleteUser: async (id: string) => {
    const deletedUser = await userRepository.delete(id);
    if (!deletedUser) {
      throw new UserNotFoundError();
    }
    return deletedUser;
  },
};
