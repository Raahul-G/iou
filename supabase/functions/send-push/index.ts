import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  type: string;
  related_friendship_id: string | null;
  related_iou_id: string | null;
  related_wish_id: string | null;
}

Deno.serve(async (req: Request) => {
  // Verify authorization using a dedicated secret (set via Edge Function secrets)
  const authHeader = req.headers.get("Authorization");
  const pushAuthToken = Deno.env.get("PUSH_AUTH_TOKEN");
  if (!authHeader || !pushAuthToken || authHeader !== `Bearer ${pushAuthToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const payload: PushPayload = await req.json();

  // Create service-role client to read push_tokens
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch all push tokens for this user
  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("id, token")
    .eq("user_id", payload.user_id);

  if (error || !tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  // Build Expo push messages
  const messages = tokens.map((t: { id: string; token: string }) => ({
    to: t.token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: {
      type: payload.type,
      related_friendship_id: payload.related_friendship_id,
      related_iou_id: payload.related_iou_id,
      related_wish_id: payload.related_wish_id,
    },
  }));

  // Send to Expo Push API
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const results = await response.json();

  // Clean up invalid tokens (DeviceNotRegistered)
  const invalidTokenIds: string[] = [];
  if (Array.isArray(results.data)) {
    results.data.forEach((result: { status: string; details?: { error?: string } }, i: number) => {
      if (
        result.status === "error" &&
        result.details?.error === "DeviceNotRegistered"
      ) {
        invalidTokenIds.push(tokens[i].id);
      }
    });
  }

  if (invalidTokenIds.length > 0) {
    await supabase.from("push_tokens").delete().in("id", invalidTokenIds);
  }

  return new Response(
    JSON.stringify({ sent: tokens.length - invalidTokenIds.length }),
    { status: 200 }
  );
});
