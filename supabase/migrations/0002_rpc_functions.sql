-- ============================================================================
-- RPC functions for atomic operations that MongoDB did with $inc / $push /
-- $addToSet. Each runs as a single statement (row-locked) so concurrent chat
-- requests can't lose updates — this also fixes a read-modify-write race that
-- existed in the old JS analytics code.
--
-- Call from the app with: admin.rpc('<name>', { ...args })
-- ============================================================================

-- ----------------------------------------------------------------------------
-- increment_conversation_count(org_id)
-- Atomically bumps organizations.usage->conversations->current and returns the
-- updated `usage` object so lib/quota.js can evaluate thresholds/overage.
-- Replaces: updateOne({_id}, { $inc: { 'usage.conversations.current': 1 } })
-- ----------------------------------------------------------------------------
create or replace function increment_conversation_count(org_id uuid)
returns jsonb
language plpgsql
as $$
declare
  updated_usage jsonb;
begin
  update organizations
  set usage = jsonb_set(
        coalesce(usage, '{}'::jsonb),
        '{conversations,current}',
        to_jsonb(coalesce((usage #>> '{conversations,current}')::int, 0) + 1),
        true
      )
  where id = org_id
  returning usage into updated_usage;

  return updated_usage;
end;
$$;

-- ----------------------------------------------------------------------------
-- append_conversation_messages(conv_id, new_messages, new_last_response_id)
-- Appends one or more messages (a JSONB array) to conversations.messages,
-- bumps message_count, and optionally sets last_response_id +
-- openai.lastResponseId. Returns the updated row.
-- Replaces: updateOne({_id}, { $push: { messages: { $each: [...] } }, $set, $inc })
-- ----------------------------------------------------------------------------
create or replace function append_conversation_messages(
  conv_id uuid,
  new_messages jsonb,
  new_last_response_id text default null
)
returns conversations
language plpgsql
as $$
declare
  result conversations;
begin
  update conversations
  set messages      = coalesce(messages, '[]'::jsonb) || new_messages,
      message_count = message_count + coalesce(jsonb_array_length(new_messages), 0),
      last_response_id = coalesce(new_last_response_id, last_response_id),
      openai = case
                 when new_last_response_id is null then openai
                 else jsonb_set(coalesce(openai, '{}'::jsonb),
                                '{lastResponseId}', to_jsonb(new_last_response_id), true)
               end,
      end_time = now()
  where id = conv_id
  returning * into result;

  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- record_analytics_event(...)
-- Daily per-widget rollup upsert with conditional conversation/unique-user
-- counting and sessionId dedup. Replaces the existing-doc read + $inc/$set/
-- $addToSet branch in pages/api/respond-responses.js (updateAnalytics).
-- ----------------------------------------------------------------------------
create or replace function record_analytics_event(
  p_widget_id          uuid,
  p_date               date,
  p_hour               int,
  p_message_count      int,
  p_avg_response_time  numeric,
  p_count_conversation boolean,
  p_session_id         text
)
returns void
language plpgsql
as $$
declare
  existing analytics;
  hour_key text := p_hour::text;
  already_counted boolean;
  new_avg int;
  new_hourly jsonb;
begin
  select * into existing
  from analytics
  where widget_id = p_widget_id and date = p_date
  for update;

  if not found then
    insert into analytics (widget_id, date, metrics, hourly, session_ids)
    values (
      p_widget_id,
      p_date,
      jsonb_build_object(
        'conversations', case when p_count_conversation then 1 else 0 end,
        'messages',      p_message_count,
        'uniqueUsers',   case when p_session_id is not null then 1 else 0 end,
        'responseRate',  100,
        'avgResponseTime', round(coalesce(p_avg_response_time, 0)),
        'satisfaction',  null
      ),
      jsonb_build_object(hour_key, 1),
      case when p_session_id is not null
           then jsonb_build_array(p_session_id) else '[]'::jsonb end
    );
    return;
  end if;

  already_counted := p_session_id is not null
    and existing.session_ids @> to_jsonb(p_session_id);

  new_avg := round((coalesce((existing.metrics->>'avgResponseTime')::numeric, 0)
                    + coalesce(p_avg_response_time, 0)) / 2);

  new_hourly := jsonb_set(
    coalesce(existing.hourly, '{}'::jsonb),
    array[hour_key],
    to_jsonb(coalesce((existing.hourly->>hour_key)::int, 0) + 1),
    true
  );

  update analytics
  set metrics = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(metrics, '{messages}',
              to_jsonb(coalesce((metrics->>'messages')::int, 0) + p_message_count), true),
            '{avgResponseTime}', to_jsonb(new_avg), true),
          '{conversations}',
          to_jsonb(coalesce((metrics->>'conversations')::int, 0)
                   + case when p_count_conversation then 1 else 0 end), true),
        '{uniqueUsers}',
        to_jsonb(coalesce((metrics->>'uniqueUsers')::int, 0)
                 + case when (p_session_id is not null and not already_counted) then 1 else 0 end), true),
      hourly = new_hourly,
      session_ids = case
        when p_session_id is not null and not already_counted
        then coalesce(session_ids, '[]'::jsonb) || to_jsonb(p_session_id)
        else session_ids
      end
  where id = existing.id;
end;
$$;
