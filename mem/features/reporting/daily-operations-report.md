---
name: Daily Operations Report
description: Auto-generated 8 PM EAT PDF covering purchases, sales, trucks, quality, milling, collections, EUDR dispatch and active users, emailed + SMS'd to admins
type: feature
---
- Edge function `daily-operations-report` runs via pg_cron job `daily-operations-report-8pm` at 17:00 UTC (8 PM Africa/Kampala).
- Sections: day at a glance, coffee purchased (coffee_records), sales (sales_transactions incl. buyer/truck/driver), quality assessments, EUDR dispatch monitoring (quality_dispatch_analyses), EUDR dispatch reports, milling (milling_transactions + milling_jobs), amount collected (incl. milling_cash_transactions), most active users (user_activity).
- PDF stored in private bucket `daily-reports` at `YYYY/daily-operations-report-<date>.pdf`; email carries a 30-day signed download link. Admins (employees.role = 'Administrator', status Active) can read the bucket.
- Recipients: active Administrators. SMS alert uses messageType `daily_report` (added to the send-sms allowlist).
- Manual run/backfill: POST `{ "date": "YYYY-MM-DD", "testEmail": "x@y.com", "skipSms": true }`; passing testEmail auto-skips SMS.
