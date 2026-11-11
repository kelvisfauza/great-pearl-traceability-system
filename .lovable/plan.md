# Real backup and recovery page

## What you will get
- Replace the current inactive backup screen and invented figures with verified Supabase backup history, dates, status and available recovery options.
- Refresh protection status and clearly show unavailable access, connection errors or plan restrictions rather than claiming a backup succeeded.
- Create a recovery point when supported by your Supabase project. Show requested, pending and completed states separately.
- Display the actual daily backup schedule. Allow changes only when your Supabase plan supports them; the schedule controls are Enterprise-only according to Supabase's published API.
- Restore an eligible saved backup only through an explicit confirmation identifying its date, warning about lost later changes and service interruption. Require Super Admin access and record the action before submitting it. No restoration will run during development or testing.
- Remove the non-working incremental and download buttons. Show download only if Supabase supplies an actual supported download option. Database backups do not protect the contents of uploaded files; show this coverage gap separately.

## Secure setup required
Connect Supabase's management service securely before implementation of the connected controls. Existing app access does not grant backup management access. Use a private connection, never a credential entered into the ordinary Settings page or exposed in the browser.

Available features and any upgrade costs will be confirmed from your actual project after connection. Unsupported features will be clearly unavailable, not simulated.

## Technical approach
- Keep the shared Backups control in System Settings and replace `useBackups` placeholders with an authenticated server endpoint calling the documented Supabase Management API for the fixed project.
- Validate administrator access server-side through existing protected role checks; restrict restore to Super Admin, validate the selected backup against fresh provider results and require recent sign-in confirmation.
- Persist audit records for recovery and schedule actions. Retain provider request state without automatically retrying destructive operations.
- Reuse the Settings change email mechanism for committed schedule changes where applicable; do not email credentials.
- Keep backup creation/recovery provider-managed; do not build a partial financial-table import or replay triggers as a supposed full restore.

## Verification
- Test access restrictions, request validation and destructive-action confirmation.
- Verify real backup history and available plan capabilities through the connected service, then the signed-in page if the user's browser is available.
- Test failure messages and desktop/mobile layout; do not change the live backup schedule or restore production data as a test.

## Limits
A working page cannot guarantee recovery without a successful recovery drill. Production restoration, paid upgrades and separate uploaded-file protection require explicit decisions and are not performed automatically.