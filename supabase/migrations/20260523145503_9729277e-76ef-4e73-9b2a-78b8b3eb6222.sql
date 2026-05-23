
-- Drop ALL policies on chat tables
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('conversation_participants', 'conversations', 'messages')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Safe helper (SECURITY DEFINER avoids recursive RLS on conversation_participants)
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conv_id
      and cp.user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated, anon;

alter table public.conversation_participants enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- conversation_participants: members can see ALL participants of their conversations
create policy "participants_select_member"
on public.conversation_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_conversation_member(conversation_id)
);

create policy "participants_insert_authenticated"
on public.conversation_participants
for insert
to authenticated
with check (true);

create policy "participants_delete_self"
on public.conversation_participants
for delete
to authenticated
using (user_id = auth.uid());

-- conversations
create policy "conversations_select_member"
on public.conversations
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_conversation_member(id)
);

create policy "conversations_insert_authenticated"
on public.conversations
for insert
to authenticated
with check (created_by = auth.uid());

create policy "conversations_update_creator"
on public.conversations
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- messages
create policy "messages_select_member"
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id));

create policy "messages_insert_member"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

create policy "messages_update_sender"
on public.messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

create policy "messages_delete_sender"
on public.messages
for delete
to authenticated
using (sender_id = auth.uid());
