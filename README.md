# FocusLens

FocusLens is an attention resilience trainer built with React, FastAPI, and Supabase. The MVP uses short arithmetic tasks, a left-hand progress rail, and controlled noise/haptic distractions to measure recovery under interruption rather than diagnose attention disorders.

## Stack

- React + Vite frontend in `frontend/`
- FastAPI backend in `backend/`
- Supabase Auth and Postgres schema in `supabase/`

## Environment

Create a root `.env` file with:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:8000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
BACKEND_CORS_ORIGIN=http://localhost:5173
```

The existing `NEXT_PUBLIC_...` values should be copied to the `VITE_...` and backend keys above. The backend also needs the Supabase service role key.

## Run locally

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Notes

- Haptic feedback uses the browser Vibration API when available and degrades gracefully on unsupported devices.
- Noise-based distraction is generated with Web Audio in the frontend during stages marked `audio` or `audio_haptic`.
- The backend currently computes resilience metrics from session attempts and persists summaries to Supabase when service-role credentials are configured.
