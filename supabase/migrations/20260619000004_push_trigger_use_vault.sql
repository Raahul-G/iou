-- Update push notification trigger to read credentials from Supabase Vault
-- instead of database-level settings (which require superuser to set).
--
-- Required vault secrets (set once, never committed to source control):
--   push_edge_url   — https://<project-ref>.supabase.co/functions/v1/send-push
--   push_service_key — Supabase service role key
--
-- To add them, run in the Supabase SQL Editor or via CLI:
--   SELECT vault.create_secret('<value>', 'push_edge_url', 'Push edge function URL');
--   SELECT vault.create_secret('<value>', 'push_service_key', 'Service role key for push trigger');

create or replace function public.send_push_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_notifications_enabled boolean;
  v_edge_url              text;
  v_service_key           text;
begin
  -- Check if user has notifications enabled
  select notifications_enabled into v_notifications_enabled
  from public.profiles
  where id = new.user_id;

  if v_notifications_enabled is not true then
    return new;
  end if;

  -- Read credentials from Vault (encrypted at rest, never in source control)
  select decrypted_secret into v_edge_url
  from vault.decrypted_secrets
  where name = 'push_edge_url'
  limit 1;

  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'push_service_key'
  limit 1;

  -- Bail silently if secrets not yet configured
  if v_edge_url is null or v_service_key is null then
    return new;
  end if;

  -- Fire-and-forget POST to send-push edge function
  perform net.http_post(
    url     := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object(
      'user_id',                new.user_id,
      'title',                  new.title,
      'body',                   coalesce(new.message, ''),
      'type',                   new.type,
      'related_friendship_id',  new.related_friendship_id,
      'related_iou_id',         new.related_iou_id,
      'related_wish_id',        new.related_wish_id
    )
  );

  return new;
end;
$$;
