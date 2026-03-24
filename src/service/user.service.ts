import { userRepository } from "../repository/user.repository";
import { createUserSchema, updateUserSchema } from "../dto/user.dto";
import type { CreateUserDTO, UpdateUserDTO } from "../dto/user.dto";

class UserNotFoundError extends Error {
  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

class UserAlreadyExistsError extends Error {
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

    const newUser = await userRepository.create(validateData);
    return newUser;
  },

getUser: async (id: string) => {
  try {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  } catch (err: unknown) {
    if ((err as any)?.message?.includes("Failed query")) {
      throw new UserNotFoundError(`User with id ${id} not found`);
    }
    throw err;
  }
},

  getAllUsers: async () => {
    return userRepository.getAll();
  },

  updateUser: async (id: string, data: unknown) => {
    const validateData: UpdateUserDTO = updateUserSchema.parse(data);

    if (validateData.email) {
      const existingUser = await userRepository.findByEmail(validateData.email);
      if (existingUser && existingUser.id !== id) {
        throw new UserAlreadyExistsError();
      }
    }

    const updatedUser = await userRepository.update(id, validateData);
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
