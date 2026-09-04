create or replace function public.get_business_fan_base(_business_id uuid, _limit int default 10)
returns table (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  score int,
  events_attended int,
  tickets int,
  lounges int,
  experiences int,
  reservations int,
  comments int,
  likes int,
  follows int
)
language sql
stable
security definer
set search_path = public
as $$
  with ev as (
    select id from public.events where creator_id = _business_id and deleted_at is null
  ),
  signals as (
    select g.user_id,
           count(*) filter (where g.checked_in_at is not null)::int as checkins,
           count(*)::int as tickets,
           0 as lounges, 0 as experiences, 0 as reservations, 0 as comments, 0 as likes, 0 as follows
    from public.guestlist_entries g
    where g.event_id in (select id from ev) and g.user_id is not null
    group by g.user_id

    union all
    select ab.user_id, 0, 0, count(*)::int, 0, 0, 0, 0, 0
    from public.area_bookings ab
    join public.event_areas ea on ea.id = ab.event_area_id
    where ea.event_id in (select id from ev)
      and ab.status = 'confirmed' and ab.user_id is not null
    group by ab.user_id

    union all
    select eb.user_id, 0, 0, 0, count(*)::int, 0, 0, 0, 0
    from public.experience_bookings eb
    join public.experiences ex on ex.id = eb.experience_id
    where ex.business_id = _business_id
      and eb.status = 'confirmed' and eb.user_id is not null
    group by eb.user_id

    union all
    select r.user_id, 0, 0, 0, 0, count(*)::int, 0, 0, 0
    from public.reservations r
    where r.business_id = _business_id
      and r.status in ('confirmed','completed') and r.user_id is not null
    group by r.user_id

    union all
    select c.user_id, 0, 0, 0, 0, 0, count(*)::int, 0, 0
    from public.event_comments c
    where c.event_id in (select id from ev) and c.deleted_at is null and c.user_id is not null
    group by c.user_id

    union all
    select l.user_id, 0, 0, 0, 0, 0, 0, count(*)::int, 0
    from public.event_likes l
    where l.event_id in (select id from ev) and l.user_id is not null
    group by l.user_id

    union all
    select f.follower_id, 0, 0, 0, 0, 0, 0, 0, count(*)::int
    from public.follows f
    where f.following_id = _business_id
    group by f.follower_id
  ),
  agg as (
    select s.user_id,
           sum(s.checkins)::int as checkins,
           sum(s.tickets)::int as tickets,
           sum(s.lounges)::int as lounges,
           sum(s.experiences)::int as experiences,
           sum(s.reservations)::int as reservations,
           sum(s.comments)::int as comments,
           sum(s.likes)::int as likes,
           sum(s.follows)::int as follows
    from signals s
    where s.user_id <> _business_id
    group by s.user_id
  )
  select a.user_id,
         p.full_name,
         p.username,
         p.avatar_url,
         (a.checkins * 5 + a.tickets * 3 + a.lounges * 5 + a.experiences * 5
          + a.reservations * 4 + a.comments * 2 + a.likes * 1 + a.follows * 1)::int as score,
         a.checkins as events_attended,
         a.tickets,
         a.lounges,
         a.experiences,
         a.reservations,
         a.comments,
         a.likes,
         a.follows
  from agg a
  join public.profiles p on p.id = a.user_id
  order by score desc, a.tickets desc
  limit greatest(coalesce(_limit, 10), 1)
$$;

grant execute on function public.get_business_fan_base(uuid, int) to authenticated;