alter function public.mark_meal_forms_printed(text[]) security invoker;
grant update (printed_at) on public.meal_plan_forms to authenticated;
create policy "Procurement marks own meal forms printed" on public.meal_plan_forms for update to authenticated
 using (public.is_procurement_reviewer(auth.uid()) and created_by = auth.uid())
 with check (public.is_procurement_reviewer(auth.uid()) and created_by = auth.uid());