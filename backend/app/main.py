from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.deps import get_current_user
from app.models import (
    ProfileResponse,
    SessionCompleteRequest,
    SessionEventsRequest,
    SessionPayload,
    SessionStartRequest,
    SessionSummary,
)
from app.services.supabase_client import get_supabase_admin
from app.services.training import compute_metrics, create_session

settings = get_settings()
app = FastAPI(title="FocusLens API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.backend_cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck() -> dict:
    return {"status": "ok"}


@app.post("/sessions/start", response_model=SessionPayload)
def start_session(
    payload: SessionStartRequest,
    user: dict = Depends(get_current_user),
) -> SessionPayload:
    session = create_session(payload.difficulty)
    supabase = get_supabase_admin()

    if supabase:
        supabase.table("training_sessions").insert(
            {
                "id": session.session_id,
                "user_id": user["id"],
                "difficulty": payload.difficulty,
                "started_at": session.started_at.isoformat(),
                "status": "started",
                "session_payload": session.model_dump(mode="json"),
            }
        ).execute()

    return session


@app.get("/sessions/{session_id}", response_model=SessionPayload)
def get_session(session_id: str, user: dict = Depends(get_current_user)) -> SessionPayload:
    supabase = get_supabase_admin()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase service role key is required to read stored sessions.",
        )

    response = (
        supabase.table("training_sessions")
        .select("session_payload")
        .eq("id", session_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    return SessionPayload.model_validate(response.data["session_payload"])


@app.post("/sessions/{session_id}/events")
def store_session_events(
    session_id: str,
    payload: SessionEventsRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    supabase = get_supabase_admin()
    if supabase and payload.events:
        supabase.table("distraction_events").insert(
            [
                {
                    "session_id": session_id,
                    "user_id": user["id"],
                    "task_index": event.task_index,
                    "event_type": event.event_type,
                    "distraction_mode": event.distraction_mode,
                    "intensity": event.intensity,
                    "created_at": (event.created_at or datetime.now(timezone.utc)).isoformat(),
                }
                for event in payload.events
            ]
        ).execute()

    return {"status": "recorded", "count": len(payload.events)}


@app.post("/sessions/{session_id}/complete", response_model=SessionSummary)
def complete_session(
    session_id: str,
    payload: SessionCompleteRequest,
    user: dict = Depends(get_current_user),
) -> SessionSummary:
    metrics, profile = compute_metrics(payload.attempts)
    completed_at = datetime.now(timezone.utc)
    summary = SessionSummary(
        session_id=session_id,
        completed_at=completed_at,
        metrics=metrics,
        resilience_profile=profile,
    )
    supabase = get_supabase_admin()

    if supabase:
        supabase.table("task_attempts").insert(
            [
                {
                    "session_id": session_id,
                    "user_id": user["id"],
                    **attempt.model_dump(),
                }
                for attempt in payload.attempts
            ]
        ).execute()
        supabase.table("training_sessions").update(
            {
                "status": "completed",
                "completed_at": completed_at.isoformat(),
                "accuracy": metrics.accuracy,
                "recovery_score": metrics.recovery_score,
                "focus_stability": metrics.focus_stability,
                "distraction_sensitivity": metrics.distraction_sensitivity,
            }
        ).eq("id", session_id).eq("user_id", user["id"]).execute()
        supabase.table("resilience_profiles").upsert(
            {
                "user_id": user["id"],
                "distraction_sensitivity_band": profile.distraction_sensitivity,
                "recovery_capacity_band": profile.recovery_capacity,
                "focus_stability_band": profile.focus_stability,
                "trend_direction": profile.trend_direction,
                "summary": profile.summary,
                "updated_at": completed_at.isoformat(),
            }
        ).execute()

    return summary


@app.get("/profile", response_model=ProfileResponse)
def get_profile(user: dict = Depends(get_current_user)) -> ProfileResponse:
    supabase = get_supabase_admin()
    if not supabase:
        return ProfileResponse(profile=None, recent_sessions=[])

    profile_response = supabase.table("resilience_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
    sessions_response = (
        supabase.table("training_sessions")
        .select("id, completed_at, accuracy, recovery_score, focus_stability")
        .eq("user_id", user["id"])
        .eq("status", "completed")
        .order("completed_at", desc=True)
        .limit(8)
        .execute()
    )

    profile_row = profile_response.data[0] if profile_response.data else None
    profile = None
    if profile_row:
        profile = {
            "distraction_sensitivity": profile_row["distraction_sensitivity_band"],
            "recovery_capacity": profile_row["recovery_capacity_band"],
            "focus_stability": profile_row["focus_stability_band"],
            "trend_direction": profile_row["trend_direction"],
            "summary": profile_row["summary"],
        }

    return ProfileResponse(profile=profile, recent_sessions=sessions_response.data)
