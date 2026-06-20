-- ─── Organizations ────────────────────────────────────────────────────────────
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  plan        text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  full_name       text,
  avatar_url      text,
  organization_id uuid references organizations(id) on delete set null,
  role            text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Cloud Accounts ───────────────────────────────────────────────────────────
create table if not exists cloud_accounts (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  provider          text not null check (provider in ('aws', 'gcp', 'azure')),
  account_id        text not null,
  account_name      text not null,
  status            text not null default 'active' check (status in ('active', 'syncing', 'error', 'inactive')),
  monthly_cost_usd  numeric(12, 2),
  last_sync_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, provider, account_id)
);

-- ─── Metrics ──────────────────────────────────────────────────────────────────
create table if not exists metrics (
  id                uuid primary key default gen_random_uuid(),
  cloud_account_id  uuid not null references cloud_accounts(id) on delete cascade,
  resource_id       text not null,
  resource_type     text not null,
  metric_name       text not null,
  value             numeric not null,
  unit              text not null,
  recorded_at       timestamptz not null default now()
);

create index if not exists idx_metrics_account_recorded on metrics (cloud_account_id, recorded_at desc);
create index if not exists idx_metrics_resource on metrics (resource_id, metric_name, recorded_at desc);

-- ─── Recommendations ──────────────────────────────────────────────────────────
create table if not exists recommendations (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  cloud_account_id      uuid references cloud_accounts(id) on delete set null,
  category              text not null check (category in ('cost', 'performance', 'security', 'reliability')),
  priority              text not null check (priority in ('critical', 'high', 'medium', 'low')),
  status                text not null default 'pending' check (status in ('pending', 'applied', 'dismissed', 'in_progress')),
  title                 text not null,
  description           text not null,
  estimated_savings_usd numeric(10, 2),
  resource_ids          text[] not null default '{}',
  ai_confidence         numeric(3, 2) not null default 0.0 check (ai_confidence between 0 and 1),
  metadata              jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_recommendations_org_status on recommendations (organization_id, status);
create index if not exists idx_recommendations_priority on recommendations (organization_id, priority, status);

-- ─── Auto-update timestamps ───────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated before update on organizations for each row execute function update_updated_at();
create trigger trg_profiles_updated before update on profiles for each row execute function update_updated_at();
create trigger trg_cloud_accounts_updated before update on cloud_accounts for each row execute function update_updated_at();
create trigger trg_recommendations_updated before update on recommendations for each row execute function update_updated_at();

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_org_id  uuid;
  v_slug    text;
begin
  v_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || substr(new.id::text, 1, 8);

  insert into organizations (name, slug)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), v_slug)
  returning id into v_org_id;

  insert into profiles (id, email, full_name, avatar_url, organization_id, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_org_id,
    'owner'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table cloud_accounts enable row level security;
alter table metrics enable row level security;
alter table recommendations enable row level security;

-- Helper: get caller's org
create or replace function my_org_id() returns uuid language sql stable as $$
  select organization_id from profiles where id = auth.uid()
$$;

create policy "org_members_read_org" on organizations for select using (id = my_org_id());

create policy "self_read" on profiles for select using (id = auth.uid());
create policy "org_members_read_profiles" on profiles for select using (organization_id = my_org_id());
create policy "self_update" on profiles for update using (id = auth.uid());

create policy "org_read_accounts" on cloud_accounts for select using (organization_id = my_org_id());
create policy "org_insert_accounts" on cloud_accounts for insert with check (organization_id = my_org_id());
create policy "org_update_accounts" on cloud_accounts for update using (organization_id = my_org_id());
create policy "org_delete_accounts" on cloud_accounts for delete using (organization_id = my_org_id());

create policy "org_read_metrics" on metrics for select
  using (cloud_account_id in (select id from cloud_accounts where organization_id = my_org_id()));

create policy "org_read_recs" on recommendations for select using (organization_id = my_org_id());
create policy "org_update_recs" on recommendations for update using (organization_id = my_org_id());
