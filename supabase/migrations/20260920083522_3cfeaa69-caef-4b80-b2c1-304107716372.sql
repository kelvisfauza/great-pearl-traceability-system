do $$
declare src text;
begin
  select command into src from cron.job where jobname = 'daily-loyalty-payout-8pm' limit 1;
  if src is null then raise exception 'source job not found'; end if;
  src := replace(src, 'daily-loyalty-payout', 'onedrive-excel-loyalty');
  perform cron.unschedule('onedrive-excel-loyalty-hourly') where exists (select 1 from cron.job where jobname='onedrive-excel-loyalty-hourly');
  perform cron.schedule('onedrive-excel-loyalty-hourly', '25 * * * *', src);
end $$;