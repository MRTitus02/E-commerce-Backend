import { supabase } from "../utils/supabase";
import type { CreateUserDTO, UpdateUserDTO } from "../dto/user.dto";

const TABLE = "users";

export const userRepository = {
  create: async (data: CreateUserDTO) => {
    const { data: res, error } = await supabase
      .from(TABLE)
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return res;
  },

  findByEmail: async (email: string) => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    return data; // null if not found
  },

  findById: async (id: string) => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data; // null if not found
  },

  getAll: async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*");

    if (error) throw error;
    return data;
  },

  update: async (id: string, data: UpdateUserDTO) => {
    const { data: res, error } = await supabase
      .from(TABLE)
      .update(data)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return res;
  },

  delete: async (id: string) => {
    const { data: res, error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return res;
  },
};