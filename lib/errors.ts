// Extracts a human-readable message from anything thrown. Supabase/PostgREST
// errors are plain objects (not Error instances), so `instanceof Error` misses
// them and callers end up showing "Unknown error" while swallowing the real
// cause. This checks the common shapes: Error, { message }, { error }, string.
export function getErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const parts = [obj.message, obj.details, obj.hint, obj.code]
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length > 0) return parts.join(" — ");
  }
  return fallback;
}
