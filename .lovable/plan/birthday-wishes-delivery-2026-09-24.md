# Birthday wishes delivery

## Goal
Make **Send Wishes** actually deliver a birthday greeting, then show the birthday employee a celebratory full-screen greeting when they next open or return to the app.

## What will change
- Replace the current close-only birthday button with a real **Send Wishes** action for each birthday employee.
- Save one wish per sender, recipient, and birthday year, preventing accidental duplicate wishes.
- Show clear sent, already-sent, loading, and failed states without closing the popup before delivery succeeds.
- Add a celebratory splash for the birthday employee listing colleagues who wished them, for example: **“Fauza wished you a happy birthday.”**
- Show new wishes live while the birthday employee is signed in, and on their next login if they were offline.
- Let the birthday employee dismiss the splash; record that the displayed wishes were seen so the same greeting does not repeatedly interrupt them.
- Keep the current automatic birthday gift, email, and SMS process unchanged.

## Security and data
- Add a dedicated birthday-wishes record with explicit authenticated and service grants.
- Use protected database functions to identify the signed-in employee, validate that the recipient has a birthday today, save the wish, and mark only the recipient’s wishes as seen.
- Allow senders to see only whether they already sent a wish; allow recipients to read only wishes addressed to them; keep administrator access for support and audit.

## Verification
- Test sending a wish from one employee to today’s birthday employee.
- Confirm duplicate taps do not create duplicate greetings.
- Sign in as the birthday employee and confirm the splash names the sender, dismisses correctly, and does not repeat after being seen.
- Check desktop and mobile layouts and confirm failed delivery remains visible with a retry option.
