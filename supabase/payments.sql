-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Payment tracking for Moroccan guests (MAD)
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

-- 1. Amount a Moroccan booking must pay, in dirhams. NULL = computed from
--    the pack price (EUR × rate) in the admin "Paiements Maroc" section.
alter table public.bookings
  add column if not exists amount_due_mad numeric;

-- 2. One row per payment received (partial payments supported)
create table if not exists public.booking_payments (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id) on delete cascade,
  amount_mad       numeric not null check (amount_mad > 0),
  method           text not null default 'virement', -- 'virement' | 'especes' | 'cheque' | 'autre'
  paid_at          date not null default current_date,
  note             text,
  proof_path       text,   -- object path inside the 'payment-proofs' storage bucket
  proof_name       text,   -- original file name shown in the admin
  receipt_sent_at  timestamptz,
  recorded_by      text,   -- admin name
  created_at       timestamptz not null default now()
);

create index if not exists booking_payments_booking_idx on public.booking_payments (booking_id);

alter table public.booking_payments enable row level security;
drop policy if exists "tlf_all_booking_payments" on public.booking_payments;
create policy "tlf_all_booking_payments" on public.booking_payments for all using (true) with check (true);

-- 3. Private bucket for proof photos (bank transfer screenshots, cash notes).
--    Files are served through short-lived signed URLs from the admin only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "tlf_payment_proofs_select" on storage.objects;
drop policy if exists "tlf_payment_proofs_insert" on storage.objects;
drop policy if exists "tlf_payment_proofs_delete" on storage.objects;
create policy "tlf_payment_proofs_select" on storage.objects for select using (bucket_id = 'payment-proofs');
create policy "tlf_payment_proofs_insert" on storage.objects for insert with check (bucket_id = 'payment-proofs');
create policy "tlf_payment_proofs_delete" on storage.objects for delete using (bucket_id = 'payment-proofs');
