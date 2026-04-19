from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


DistractionMode = Literal["none", "audio", "haptic", "audio_haptic"]


class SessionStartRequest(BaseModel):
    difficulty: str = "adaptive"


class Problem(BaseModel):
    id: str
    prompt: str
    answer: int
    operation: str
    stage_index: int
    difficulty: str


class SessionStage(BaseModel):
    index: int
    label: str
    distraction_mode: DistractionMode
    task_count: int


class DistractionEvent(BaseModel):
    task_index: int
    mode: DistractionMode
    intensity: int = Field(ge=0, le=5)
    audio_label: str | None = None
    vibration_pattern: list[int] | None = None


class SessionPayload(BaseModel):
    session_id: str
    started_at: datetime
    difficulty: str
    tasks: list[Problem]
    stages: list[SessionStage]
    distraction_schedule: list[DistractionEvent]


class SessionEvent(BaseModel):
    task_index: int
    event_type: str
    distraction_mode: DistractionMode
    intensity: int = Field(ge=0, le=5)
    created_at: datetime | None = None


class SessionEventsRequest(BaseModel):
    events: list[SessionEvent]


class Attempt(BaseModel):
    task_id: str
    task_index: int
    response_value: str
    correct: bool
    latency_ms: int = Field(ge=0)
    distraction_mode: DistractionMode
    distraction_intensity: int = Field(ge=0, le=5)


class SessionCompleteRequest(BaseModel):
    attempts: list[Attempt]


class SessionMetrics(BaseModel):
    accuracy: int
    average_latency_ms: int
    recovery_score: int
    focus_stability: int
    distraction_sensitivity: int


class ResilienceProfile(BaseModel):
    distraction_sensitivity: str
    recovery_capacity: str
    focus_stability: str
    trend_direction: str
    summary: str


class SessionSummary(BaseModel):
    session_id: str
    completed_at: datetime
    metrics: SessionMetrics
    resilience_profile: ResilienceProfile


class ProfileResponse(BaseModel):
    profile: ResilienceProfile | None
    recent_sessions: list[dict]
