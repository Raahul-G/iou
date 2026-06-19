// Manual RPC type additions are maintained in database.types.ts directly.
// When regenerating types with `npm run supabase:types`, re-add any
// SECURITY DEFINER functions that the introspector cannot see:
//   - delete_own_account: { Args: Record<string, never>; Returns: undefined }
//
// This file exists as a reminder — no runtime code needed.
export {};
