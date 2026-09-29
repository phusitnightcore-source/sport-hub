# Fitness Membership — Readiness & Deployment

## What is implemented

- Online and counter membership registration
- Payment slip upload, staff verification, activation and renewal
- Digital membership card with dynamic name, member number, plan and expiry
- Short-lived signed QR code (45 seconds) for secure check-in
- Session-limit, branch-access, frozen and expiry validation at check-in
- Member/admin notifications for application, slip submission, activation, status changes, Freeze and check-in
- Expiry reminders at 7 days, 3 days and expiry day through the subscription cron
- Atomic tenant-scoped member number generation after the hardening migration

## Required deployment step

Apply this migration in Supabase SQL Editor or through the Supabase CLI:

`supabase/migrations/20260929020000_fitness_membership_hardening.sql`

The application has a compatibility fallback before the migration is applied, but production should use the database function to guarantee collision-free member numbers.

## Environment

Set `MEMBER_QR_SECRET` to a random value of at least 32 characters. If it is omitted, the system uses `CRON_SECRET`.

External delivery is optional. In-app notifications always work. Configure these for outbound messages:

- `LINE_CHANNEL_ACCESS_TOKEN` for LINE Messaging API
- `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` for email fallback
- `/api/cron/subscriptions` scheduled daily with the `CRON_SECRET` authorization header

## Production acceptance flow

1. Apply for a package and confirm that both member and venue receive an in-app notification.
2. Upload a slip and confirm that the venue sees the pending notification.
3. Approve payment and confirm the member becomes active and receives the activation notification.
4. Open `/me`, verify the dynamic card data and observe the QR refresh every 30 seconds.
5. Scan at `/dashboard/checkin`; verify success, session deduction when applicable, and the member notification.
6. Attempt to reuse the QR after 45 seconds and confirm it is rejected.
7. Test expired, frozen, wrong-branch and exhausted-session members.
8. Request and review Freeze, then unfreeze and confirm the adjusted expiry date.
