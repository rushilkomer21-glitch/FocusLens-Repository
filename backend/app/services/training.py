from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, UTC
from statistics import mean
from uuid import uuid4

from app.models import (
    Attempt,
    DistractionEvent,
    Problem,
    ResilienceProfile,
    SessionMetrics,
    SessionPayload,
    SessionStage,
)


@dataclass(frozen=True)
class StageDefinition:
    label: str
    distraction_mode: str
    task_count: int
    intensity: int
    difficulty: str


STAGES = [
    StageDefinition("Warm start", "none", 3, 0, "easy"),
    StageDefinition("Noise build", "audio", 3, 2, "medium"),
    StageDefinition("Pressure shift", "audio_haptic", 3, 4, "hard"),
]


def _build_problem(index: int, stage_index: int, difficulty: str) -> Problem:
    if difficulty == "easy":
        a = index + 3
        b = (index % 4) + 2
        prompt = f"{a} + {b}"
        answer = a + b
        operation = "addition"
    elif difficulty == "medium":
        a = index + 8
        b = (index % 5) + 3
        prompt = f"{a} - {b}"
        answer = a - b
        operation = "subtraction"
    else:
        a = (index % 6) + 4
        b = (index % 5) + 3
        prompt = f"{a} x {b}"
        answer = a * b
        operation = "multiplication"

    return Problem(
        id=str(uuid4()),
        prompt=prompt,
        answer=answer,
        operation=operation,
        stage_index=stage_index,
        difficulty=difficulty,
    )


def create_session(difficulty: str) -> SessionPayload:
    tasks: list[Problem] = []
    stages: list[SessionStage] = []
    distraction_schedule: list[DistractionEvent] = []
    task_index = 0

    for stage_index, stage in enumerate(STAGES):
        stages.append(
            SessionStage(
                index=stage_index,
                label=stage.label,
                distraction_mode=stage.distraction_mode,
                task_count=stage.task_count,
            )
        )

        for _ in range(stage.task_count):
            tasks.append(_build_problem(task_index, stage_index, stage.difficulty))
            distraction_schedule.append(
                DistractionEvent(
                    task_index=task_index,
                    mode=stage.distraction_mode,
                    intensity=stage.intensity,
                    audio_label="pink-noise pulse" if "audio" in stage.distraction_mode else None,
                    vibration_pattern=[80, 40, 80] if "haptic" in stage.distraction_mode else None,
                )
            )
            task_index += 1

    return SessionPayload(
        session_id=str(uuid4()),
        started_at=datetime.now(UTC),
        difficulty=difficulty,
        tasks=tasks,
        stages=stages,
        distraction_schedule=distraction_schedule,
    )


def compute_metrics(attempts: list[Attempt]) -> tuple[SessionMetrics, ResilienceProfile]:
    total_attempts = len(attempts) or 1
    accuracy = round(sum(1 for attempt in attempts if attempt.correct) / total_attempts * 100)
    average_latency = round(mean([attempt.latency_ms for attempt in attempts] or [0]))

    low_distraction = [attempt.latency_ms for attempt in attempts if attempt.distraction_intensity <= 1]
    high_distraction = [attempt.latency_ms for attempt in attempts if attempt.distraction_intensity >= 3]
    recovery_delta = (mean(high_distraction) if high_distraction else average_latency) - (
        mean(low_distraction) if low_distraction else average_latency
    )
    recovery_score = max(0, min(100, round(100 - recovery_delta / 20)))

    accuracy_by_band = []
    for threshold in (0, 2, 4):
        band_attempts = [attempt for attempt in attempts if attempt.distraction_intensity >= threshold]
        if band_attempts:
            accuracy_by_band.append(sum(1 for attempt in band_attempts if attempt.correct) / len(band_attempts))

    variability = 0 if len(accuracy_by_band) <= 1 else max(accuracy_by_band) - min(accuracy_by_band)
    focus_stability = max(0, min(100, round(100 - variability * 100)))
    distraction_sensitivity = max(0, min(100, round((recovery_delta / max(average_latency, 1)) * 100 + 30)))

    metrics = SessionMetrics(
        accuracy=accuracy,
        average_latency_ms=average_latency,
        recovery_score=recovery_score,
        focus_stability=focus_stability,
        distraction_sensitivity=distraction_sensitivity,
    )
    profile = ResilienceProfile(
        distraction_sensitivity=to_band(100 - distraction_sensitivity, inverse=True),
        recovery_capacity=to_band(recovery_score),
        focus_stability=to_band(focus_stability),
        trend_direction="baseline established",
        summary=f"Recovery remained {to_band(recovery_score)} while distraction sensitivity stayed {to_band(100 - distraction_sensitivity, inverse=True)}.",
    )
    return metrics, profile


def to_band(score: int, inverse: bool = False) -> str:
    adjusted = 100 - score if inverse else score
    if adjusted >= 75:
        return "strong"
    if adjusted >= 45:
        return "moderate"
    return "emerging"
