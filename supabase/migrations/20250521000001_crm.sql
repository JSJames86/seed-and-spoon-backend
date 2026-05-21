create type crm_role as enum ('admin', 'staff', 'board', 'volunteer', 'partner', 'client');

create table crm_user_roles (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
role crm_role not null,
assigned_by uuid references auth.users(id),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
unique(user_id, role)
);

create index idx_crm_user_roles_user_id on crm_user_roles(user_id);
create index idx_crm_user_roles_role on crm_user_roles(role);

alter table crm_user_roles enable row level security;

create policy "admins can manage roles"
on crm_user_roles for all
using (
exists (
select 1 from crm_user_roles r
where r.user_id = auth.uid() and r.role = 'admin'
)
);

create policy "users can read own role"
on crm_user_roles for select
using (user_id = auth.uid());

create type channel_type as enum ('public', 'private', 'dm');

create table channels (
id uuid primary key default gen_random_uuid(),
name text not null,
description text,
type channel_type not null default 'public',
allowed_roles crm_role[] default array[]::crm_role[],
created_by uuid references auth.users(id),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create index idx_channels_type on channels(type);

create table channel_members (
id uuid primary key default gen_random_uuid(),
channel_id uuid not null references channels(id) on delete cascade,
user_id uuid not null references auth.users(id) on delete cascade,
last_read_at timestamptz default now(),
created_at timestamptz not null default now(),
unique(channel_id, user_id)
);

create index idx_channel_members_channel_id on channel_members(channel_id);
create index idx_channel_members_user_id on channel_members(user_id);

create table messages (
id uuid primary key default gen_random_uuid(),
channel_id uuid not null references channels(id) on delete cascade,
sender_id uuid not null references auth.users(id) on delete cascade,
content text not null,
attachments jsonb default '[]'::jsonb,
reply_to uuid references messages(id),
edited_at timestamptz,
deleted_at timestamptz,
created_at timestamptz not null default now()
);

create index idx_messages_channel_id on messages(channel_id);
create index idx_messages_sender_id on messages(sender_id);
create index idx_messages_created_at on messages(created_at desc);

alter table channels enable row level security;
alter table channel_members enable row level security;
alter table messages enable row level security;

create policy "members can view their channels"
on channels for select
using (
exists (
select 1 from channel_members cm
where cm.channel_id = id and cm.user_id = auth.uid()
)
or type = 'public'
);

create policy "members can view channel membership"
on channel_members for select
using (
user_id = auth.uid()
or exists (
select 1 from channel_members cm
where cm.channel_id = channel_members.channel_id and cm.user_id = auth.uid()
)
);

create policy "members can read messages"
on messages for select
using (
exists (
select 1 from channel_members cm
where cm.channel_id = messages.channel_id and cm.user_id = auth.uid()
)
);

create policy "members can send messages"
on messages for insert
with check (
sender_id = auth.uid()
and exists (
select 1 from channel_members cm
where cm.channel_id = messages.channel_id and cm.user_id = auth.uid()
)
);

create policy "senders can edit own messages"
on messages for update
using (sender_id = auth.uid());

create type notification_type as enum (
'donation', 'message', 'mention', 'system', 'grant', 'volunteer', 'partner'
);

create type notification_channel as enum ('in_app', 'email', 'push');

create table notifications (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
type notification_type not null,
title text not null,
body text,
data jsonb default '{}'::jsonb,
channels notification_channel[] not null default array['in_app']::notification_channel[],
read_at timestamptz,
sent_at timestamptz,
created_at timestamptz not null default now()
);

create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read_at on notifications(read_at) where read_at is null;
create index idx_notifications_created_at on notifications(created_at desc);

alter table notifications enable row level security;

create policy "users can read own notifications"
on notifications for select
using (user_id = auth.uid());

create policy "users can mark own notifications read"
on notifications for update
using (user_id = auth.uid());

create table push_subscriptions (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
endpoint text not null,
p256dh text not null,
auth text not null,
user_agent text,
created_at timestamptz not null default now(),
unique(user_id, endpoint)
);

create index idx_push_subscriptions_user_id on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "users can manage own push subscriptions"
on push_subscriptions for all
using (user_id = auth.uid());

create type email_template_category as enum (
'donation', 'volunteer', 'partner', 'newsletter', 'board', 'general'
);

create table email_templates (
id uuid primary key default gen_random_uuid(),
name text not null,
subject text not null,
body_html text not null,
body_text text,
category email_template_category not null default 'general',
variables jsonb default '[]'::jsonb,
created_by uuid references auth.users(id),
updated_by uuid references auth.users(id),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create index idx_email_templates_category on email_templates(category);

create table email_sends (
id uuid primary key default gen_random_uuid(),
template_id uuid references email_templates(id),
sent_by uuid references auth.users(id),
recipients jsonb not null,
subject text not null,
body_html text not null,
resend_id text,
status text not null default 'pending',
error text,
sent_at timestamptz,
created_at timestamptz not null default now()
);

create index idx_email_sends_template_id on email_sends(template_id);
create index idx_email_sends_sent_by on email_sends(sent_by);
create index idx_email_sends_created_at on email_sends(created_at desc);

alter table email_templates enable row level security;
alter table email_sends enable row level security;

create policy "staff and admin can manage templates"
on email_templates for all
using (
exists (
select 1 from crm_user_roles r
where r.user_id = auth.uid() and r.role in ('admin', 'staff')
)
);

create policy "staff and admin can view email sends"
on email_sends for select
using (
exists (
select 1 from crm_user_roles r
where r.user_id = auth.uid() and r.role in ('admin', 'staff')
)
);

create policy "staff and admin can create email sends"
on email_sends for insert
with check (
exists (
select 1 from crm_user_roles r
where r.user_id = auth.uid() and r.role in ('admin', 'staff')
)
);

create type donation_status as enum ('pending', 'succeeded', 'failed', 'refunded');

create table donations (
id uuid primary key default gen_random_uuid(),
stripe_payment_intent_id text unique,
stripe_charge_id text,
amount integer not null,
currency text not null default 'usd',
status donation_status not null default 'pending',
donor_name text,
donor_email text,
donor_user_id uuid references auth.users(id),
metadata jsonb default '{}'::jsonb,
quickbooks_synced_at timestamptz,
quickbooks_txn_id text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create index idx_donations_stripe_payment_intent_id on donations(stripe_payment_intent_id);
create index idx_donations_status on donations(status);
create index idx_donations_created_at on donations(created_at desc);
create index idx_donations_donor_email on donations(donor_email);

alter table donations enable row level security;

create policy "admin and board can view all donations"
on donations for select
using (
exists (
select 1 from crm_user_roles r
where r.user_id = auth.uid() and r.role in ('admin', 'board', 'staff')
)
);

create policy "service role can insert donations"
on donations for insert
with check (true);

create policy "service role can update donations"
on donations for update
using (true);

insert into channels (name, description, type, allowed_roles) values
('general', 'Organization-wide announcements', 'public', array['admin','staff','board','volunteer','partner']::crm_role[]),
('staff', 'Internal staff coordination', 'private', array['admin','staff']::crm_role[]),
('board', 'Board member discussions', 'private', array['admin','board']::crm_role[]),
('volunteers', 'Volunteer coordination and updates', 'private', array['admin','staff','volunteer']::crm_role[]),
('partners', 'Partner communications', 'private', array['admin','staff','partner']::crm_role[]),
('donations', 'Donation alerts and discussion', 'private', array['admin','staff','board']::crm_role[]);
