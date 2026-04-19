from app.models import Attempt
from app.services.training import compute_metrics, create_session


def test_create_session_builds_nine_tasks():
    session = create_session("adaptive")
    assert len(session.tasks) == 9
    assert len(session.stages) == 3
    assert session.distraction_schedule[-1].mode == "audio_haptic"


def test_compute_metrics_returns_bounded_scores():
    attempts = [
        Attempt(
            task_id="1",
            task_index=0,
            response_value="5",
            correct=True,
            latency_ms=900,
            distraction_mode="none",
            distraction_intensity=0,
        ),
        Attempt(
            task_id="2",
            task_index=1,
            response_value="6",
            correct=False,
            latency_ms=1400,
            distraction_mode="audio_haptic",
            distraction_intensity=4,
        ),
    ]

    metrics, profile = compute_metrics(attempts)
    assert 0 <= metrics.accuracy <= 100
    assert 0 <= metrics.recovery_score <= 100
    assert profile.summary


def test_session_stages_cover_progressive_distraction():
    session = create_session("adaptive")
    assert [stage.distraction_mode for stage in session.stages] == [
        "none",
        "audio",
        "audio_haptic",
    ]
