-- ============================================================================
-- record_satisfaction_rating(widget_id, date, rating)
-- Atomic daily per-widget satisfaction rollup. Replaces the read-modify-write
-- $inc on ratings.total / ratings.distribution.{rating} + average recompute in
-- pages/api/satisfaction/rate.js.
-- ============================================================================

create or replace function record_satisfaction_rating(
  p_widget_id uuid,
  p_date      date,
  p_rating    int
)
returns void
language plpgsql
as $$
declare
  existing       satisfaction_analytics;
  dist_key       text := p_rating::text;
  old_total      int;
  old_avg        numeric;
  new_total      int;
  new_avg        numeric;
  old_dist_count int;
begin
  select * into existing
  from satisfaction_analytics
  where widget_id = p_widget_id and date = p_date
  for update;

  if not found then
    insert into satisfaction_analytics (widget_id, date, ratings, trends)
    values (
      p_widget_id,
      p_date,
      jsonb_build_object(
        'total', 1,
        'average', p_rating,
        'distribution', jsonb_build_object(
          '1', case when p_rating = 1 then 1 else 0 end,
          '2', case when p_rating = 2 then 1 else 0 end,
          '3', case when p_rating = 3 then 1 else 0 end,
          '4', case when p_rating = 4 then 1 else 0 end,
          '5', case when p_rating = 5 then 1 else 0 end
        )
      ),
      jsonb_build_object('daily', '[]'::jsonb, 'weekly', '[]'::jsonb, 'monthly', '[]'::jsonb)
    );
    return;
  end if;

  old_total      := coalesce((existing.ratings->>'total')::int, 0);
  old_avg        := coalesce((existing.ratings->>'average')::numeric, 0);
  new_total      := old_total + 1;
  new_avg        := ((old_avg * old_total) + p_rating) / new_total;
  old_dist_count := coalesce((existing.ratings #>> array['distribution', dist_key])::int, 0);

  update satisfaction_analytics
  set ratings = jsonb_set(
        jsonb_set(
          jsonb_set(existing.ratings, '{total}', to_jsonb(new_total), true),
          '{average}', to_jsonb(new_avg), true
        ),
        array['distribution', dist_key], to_jsonb(old_dist_count + 1), true
      )
  where id = existing.id;
end;
$$;
