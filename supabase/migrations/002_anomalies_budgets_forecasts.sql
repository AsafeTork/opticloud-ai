-- ─── Anomalies ────────────────────────────────────────────────────────────────
create table if not exists anomalies (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  cloud_account_id      uuid references cloud_accounts(id) on delete set null,
  provider              text not null check (provider in ('aws', 'gcp', 'azure')),
  resource_id           text not null,
  resource_type         text not null,
  severity              text not null check (severity in ('critical', 'warning', 'info')),
  title                 text not null,
  description           text not null,
  expected_cost_usd     numeric(12, 4) not null,
  actual_cost_usd       numeric(12, 4) not null,
  deviation_pct         numeric(8, 2) not null,
  detected_at           timestamptz not null default now(),
  resolved_at           timestamptz,
  metadata              jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, resource_id, provider)
);

create index if not exists idx_anomalies_org_detected
  on anomalies (organization_id, detected_at desc);
create index if not exists idx_anomalies_severity
  on anomalies (organization_id, severity, resolved_at);

-- ─── Budgets ──────────────────────────────────────────────────────────────────
create table if not exists budgets (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  name                  text not null,
  amount_usd            numeric(12, 2) not null check (amount_usd > 0),
  period                text not null default 'monthly' check (period in ('monthly', 'quarterly', 'annual')),
  provider              text not null default 'all' check (provider in ('aws', 'gcp', 'azure', 'all')),
  alert_threshold_pct   numeric(5, 2) not null default 80 check (alert_threshold_pct between 1 and 100),
  current_spend_usd     numeric(12, 2) not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_budgets_org on budgets (organization_id);

-- ─── Cost Trends (historical — populated by cloud-aggregator) ────────────────
create table if not exists cost_trends (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  month_year            text not null, -- 'YYYY-MM'
  provider              text not null check (provider in ('aws', 'gcp', 'azure')),
  cost_usd              numeric(12, 2) not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, month_year, provider)
);

create index if not exists idx_cost_trends_org_month
  on cost_trends (organization_id, month_year desc);

-- ─── Auto-update timestamps ───────────────────────────────────────────────────
create trigger trg_anomalies_updated
  before update on anomalies
  for each row execute function update_updated_at();

create trigger trg_budgets_updated
  before update on budgets
  for each row execute function update_updated_at();

create trigger trg_cost_trends_updated
  before update on cost_trends
  for each row execute function update_updated_at();

-- ─── Budget Alert Trigger ─────────────────────────────────────────────────────
-- Fires whenever current_spend_usd is updated and exceeds the alert threshold
create or replace function notify_budget_alert()
returns trigger language plpgsql as $$
declare
  v_threshold_usd numeric;
  v_pct           numeric;
begin
  v_threshold_usd := new.amount_usd * (new.alert_threshold_pct / 100.0);
  v_pct           := (new.current_spend_usd / new.amount_usd) * 100;

  if new.current_spend_usd >= v_threshold_usd
     and (old.current_spend_usd < v_threshold_usd or old is null) then
    -- Emit a Postgres NOTIFY so Supabase Realtime / Edge Function can pick it up
    perform pg_notify(
      'budget_alert',
      json_build_object(
        'organization_id', new.organization_id,
        'budget_id',       new.id,
        'budget_name',     new.name,
        'amount_usd',      new.amount_usd,
        'current_spend',   new.current_spend_usd,
        'pct_used',        round(v_pct, 1),
        'threshold_pct',   new.alert_threshold_pct
      )::text
    );
  end if;
  return new;
end;
$$;

create trigger trg_budget_alert
  after update of current_spend_usd on budgets
  for each row execute function notify_budget_alert();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table anomalies enable row level security;
alter table budgets enable row level security;
alter table cost_trends enable row level security;

create policy "org_read_anomalies"   on anomalies    for select using (organization_id = my_org_id());
create policy "org_insert_anomalies" on anomalies    for insert with check (organization_id = my_org_id());
create policy "org_update_anomalies" on anomalies    for update using (organization_id = my_org_id());

create policy "org_read_budgets"     on budgets      for select using (organization_id = my_org_id());
create policy "org_insert_budgets"   on budgets      for insert with check (organization_id = my_org_id());
create policy "org_update_budgets"   on budgets      for update using (organization_id = my_org_id());
create policy "org_delete_budgets"   on budgets      for delete using (organization_id = my_org_id());

create policy "org_read_cost_trends" on cost_trends  for select using (organization_id = my_org_id());
create policy "org_insert_cost_trends" on cost_trends for insert with check (organization_id = my_org_id());
create policy "org_update_cost_trends" on cost_trends for update using (organization_id = my_org_id());
