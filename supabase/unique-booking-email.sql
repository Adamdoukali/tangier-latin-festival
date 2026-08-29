-- One email may own only one festival pack booking.
-- Standalone transfers and excursions have no valid pack UUID and remain
-- intentionally excluded so they can link back to the festival guest.
create unique index if not exists bookings_unique_festival_email
  on public.bookings (lower(btrim(email)))
  where pack_id is not null and btrim(coalesce(email, '')) <> '';
