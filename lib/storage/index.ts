import type { StorageAdapter } from "./types";
import { SupabaseAdapter } from "./supabase";

export const storage: StorageAdapter = new SupabaseAdapter();

export type { StorageAdapter };
