# PermitPulse AI

AI-powered weekly permit leads for contractors.

Phase 1 foundation is complete (data ingestion from 3 major sources, scoring, dashboard, feedback, and email digest).

## Tech Stack

- Next.js 16 + TypeScript
- Supabase (PostgreSQL + auth)
- Resend (email)
- Tailwind
- Jest + React Testing Library

## Key Features (Phase 1)

- Daily ingestion from Chicago, Austin, and Miami-Dade
- Rule-based lead scoring with explanations
- Dashboard showing top leads
- Thumbs up/down feedback collection
- Weekly email digest of best leads
- Full monitoring via `ingestion_log` table

## Getting Started

### 1. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
CHICAGO_SOCRATA_APP_TOKEN=optional
```

### 2. Database

Run the migration:

```bash
supabase db push
```

Or apply `supabase/migrations/20260528130425_init_permitpulse_schema.sql`

### 3. Run the App

```bash
npm install
npm run dev
```

Visit http://localhost:3000/dashboard

### 4. Run Ingestion

```bash
# Via Node (example)
node -e "
const { runDailyIngestion } = require('./lib/orchestrator/ingestion');
runDailyIngestion(100);
"
```

Or trigger via API route (to be added).

## Project Structure

```
lib/
  adapters/           # Chicago, Austin, Miami-Dade
  orchestrator/       # Daily ingestion runner
  scoring/            # Rule-based lead scoring
  email/              # Weekly digest
  schemas/            # PermitRecord + normalization

app/
  dashboard/          # Main lead view + feedback
  api/feedback/       # Feedback collection
```

## Phase 1 Status

- [x] Repository + DB schema
- [x] Testing framework
- [x] Normalization layer
- [x] 3 data source adapters
- [x] Ingestion orchestrator + monitoring
- [x] Rule-based scoring
- [x] Dashboard + feedback
- [x] Email digest
- [x] Basic E2E tests

**Next phase ideas:** ML scoring, more cities, user accounts, lead export.

## License

MIT
