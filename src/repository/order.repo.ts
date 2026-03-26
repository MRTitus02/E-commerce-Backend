import { supabase } from "../utils/supabase";

const ORDERS_TABLE = "orders";
const ORDER_ITEMS_TABLE = "order_items";
const IDEMPOTENCY_TABLE = "idempotency_keys";

export const orderRepository = {
  getIdempotency: async (key: string) => {
    const { data, error } = await supabase
      .from(IDEMPOTENCY_TABLE)
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data; // null if not found
  },

  saveIdempotency: async (key: string, responseBody: any, statusCode: number) => {
    const { data, error } = await supabase
      .from(IDEMPOTENCY_TABLE)
      .insert([{ key, responseBody, statusCode }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  createOrder: async (data: any) => {
    const { data: res, error } = await supabase
      .from(ORDERS_TABLE)
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return res;
  },

  createOrderItems: async (items: any[]) => {
    const { data: res, error } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .insert(items)
      .select();

    if (error) throw error;
    return res;
  },

  getOrderById: async (id: string) => {
    const { data, error } = await supabase
      .from(ORDERS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data; // null if not found
  },
};