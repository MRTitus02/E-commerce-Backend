import { supabase } from "../utils/supabase";
import type { CreateProductDTO, UpdateProductDTO } from "../dto/product.dto";

const TABLE = "products";

export const productRepo = {
  create: async (data: CreateProductDTO) => {
    const { data: res, error } = await supabase
      .from(TABLE)
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return res;
  },

  findAll: async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*");

    if (error) throw error;
    return data;
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

  update: async (id: string, data: UpdateProductDTO) => {
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