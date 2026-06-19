-- Enable pg_net for outbound HTTP from Postgres
create extension if not exists pg_net with schema extensions;

-- Trigger function: on new notification, POST to the send-push edge function
create or replace function public.send_push_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_notifications_enabled boolean;
  v_edge_url text;
  v_service_key text;
begin
  -- Check if user has notifications enabled
  select notifications_enabled into v_notifications_enabled
  from public.profiles
  where id = NEW.user_id;

  if v_notifications_enabled is not true then
    return NEW;
  end if;

  -- Read edge function URL and service role key from database settings
  v_edge_url := current_setting('app.settings.edge_function_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  if v_edge_url is null or v_service_key is null then
    return NEW;
  end if;

  -- Fire-and-forget POST to edge function
  perform net.http_post(
    url := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', coalesce(NEW.message, ''),
      'type', NEW.type,
      'related_friendship_id', NEW.related_friendship_id,
      'related_iou_id', NEW.related_iou_id,
      'related_wish_id', NEW.related_wish_id
    )
  );

  return NEW;
end;
$$;

-- Trigger after every notification insert
create trigger trg_send_push_notification
  after insert on public.notifications
  for each row
  execute function public.send_push_notification();

-- NOTE: Set these via Supabase dashboard or SQL editor:
-- ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://<project-ref>.supabase.co/functions/v1/send-push';
-- ALTER DATABASE postgres SET app.settings.service_role_key = '<service_role_key>';
