# Candidate Testing Platform

Next.js (App Router) + TypeScript + Tailwind CSS for secure candidate assessments, with Monday.com integration.

## Initialize (if starting from scratch elsewhere)

From an empty folder:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

This repo is already scaffolded with the same stack. Install dependencies:

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env.local
# Windows PowerShell:
# Copy-Item .env.example .env.local
```

Edit `.env.local` with your Monday.com credentials.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start dev server (Turbopack) |
| `npm run build`| Production build         |
| `npm run start`| Run production server    |
| `npm run lint` | ESLint                   |

## Folder structure

```
src/
├── app/
│   ├── (admin)/admin/     # Admin route group
│   ├── (candidate)/test/  # Candidate assessment UI
│   ├── api/               # Route handlers (secrets stay server-side)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   ├── candidate/
│   └── admin/
├── hooks/
├── lib/
│   ├── env.ts             # Validated server env vars
│   └── monday/            # Monday.com API client
└── types/
public/
.env.example               # Committed template (no secrets)
.env.local                 # Your secrets (gitignored)
```

## Environment variables

| Variable           | Where used | Notes                                      |
| ------------------ | ---------- | ------------------------------------------ |
| `MONDAY_API_KEY`   | Server only | Never expose with `NEXT_PUBLIC_` prefix |
| `MONDAY_BOARD_ID`  | Server only | Board ID from Monday.com URL               |
| `NEXT_PUBLIC_APP_URL` | Client + server | Magic links and exam invite emails |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Server only | Nodemailer SMTP (default user: `dev@beyondtcode.com`) |
| `QSTASH_URL` / `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` | Server only | Upstash QStash publish + webhook signature verification |

### QStash exam invites (event-driven)

When an admin creates a candidate, the app schedules **one** QStash message for that Monday item at the chosen exam time (`deduplicationId`: `exam-invite-{itemId}`). The same alarm is (re)scheduled when a candidate is approved via `/api/candidate/respond` or when Monday posts to `/api/webhooks/monday-status-change` (configure the board webhook on column `color_mm3y4vv1` → **אושר**). At fire time, QStash POSTs to `/api/webhooks/send-exam-invite`, which loads the item, checks eligibility (approved, not started, valid email/token), and sets Monday `examStatus` (`color_mm3xcqrz`) to **שלח מבחן כעת** so SuperMail sends the invite. Set `NEXT_PUBLIC_APP_URL` to your public deployment URL so QStash and Monday can reach the webhooks.

Access via `src/lib/env.ts` in Server Components, Route Handlers, or Server Actions only.

## Security notes

- Keep `.env.local` out of version control (already in `.gitignore`).
- Do not prefix Monday variables with `NEXT_PUBLIC_`.
- Call Monday.com only from `src/app/api/*` or other server code.
