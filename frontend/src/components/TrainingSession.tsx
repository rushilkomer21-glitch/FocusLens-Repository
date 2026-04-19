import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AttemptPayload,
  DistractionEvent,
  Problem,
  SessionPayload,
} from "../types";
import { ProgressRail } from "./ProgressRail";

type TrainingSessionProps = {
  session: SessionPayload;
  onComplete: (attempts: AttemptPayload[]) => Promise<void>;
};

function createTone(frequency: number, durationMs: number, volume: number) {
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  const audioContext = new AudioContextCtor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + durationMs / 1000);

  oscillator.onended = () => {
    void audioContext.close();
  };
}

function triggerDistraction(event: DistractionEvent | undefined) {
  if (!event || event.mode === "none") {
    return;
  }

  if (event.mode.includes("audio")) {
    createTone(180 + event.intensity * 80, 400, 0.03 + event.intensity * 0.01);
  }

  if (event.mode.includes("haptic") && navigator.vibrate && event.vibration_pattern) {
    navigator.vibrate(event.vibration_pattern);
  }
}

export function TrainingSession({ session, onComplete }: TrainingSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<AttemptPayload[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [flashMessage, setFlashMessage] = useState("Center your attention and begin.");
  const taskStartedAt = useRef<number>(performance.now());
  const activeProblem = session.tasks[currentIndex];
  const distractionEvent = session.distraction_schedule.find(
    (entry) => entry.task_index === currentIndex,
  );

  useEffect(() => {
    taskStartedAt.current = performance.now();
    triggerDistraction(distractionEvent);
    setFlashMessage(
      distractionEvent && distractionEvent.mode !== "none"
        ? `Distraction active: ${distractionEvent.mode.replaceAll("_", " ")}`
        : "No distraction in this segment.",
    );
  }, [currentIndex, distractionEvent]);

  const accuracy = useMemo(() => {
    if (attempts.length === 0) {
      return 0;
    }

    const correct = attempts.filter((attempt) => attempt.correct).length;
    return Math.round((correct / attempts.length) * 100);
  }, [attempts]);

  async function handleSubmit() {
    if (!activeProblem) {
      return;
    }

    const parsed = Number(answer);
    const latency = Math.round(performance.now() - taskStartedAt.current);
    const nextAttempt: AttemptPayload = {
      task_id: activeProblem.id,
      task_index: currentIndex,
      response_value: answer,
      correct: parsed === activeProblem.answer,
      latency_ms: latency,
      distraction_mode: distractionEvent?.mode ?? "none",
      distraction_intensity: distractionEvent?.intensity ?? 0,
    };

    const updatedAttempts = [...attempts, nextAttempt];
    setAttempts(updatedAttempts);
    setAnswer("");

    if (currentIndex + 1 >= session.tasks.length) {
      setSubmitting(true);
      await onComplete(updatedAttempts);
      setSubmitting(false);
      return;
    }

    setCurrentIndex((value) => value + 1);
  }

  if (!activeProblem) {
    return null;
  }

  return (
    <div className="training-layout">
      <ProgressRail
        currentTaskIndex={currentIndex}
        stages={session.stages}
        totalTasks={session.tasks.length}
      />

      <section className="training-main">
        <div className="training-header">
          <div>
            <p className="eyebrow">Live session</p>
            <h2>Recover quickly. Keep the math steady.</h2>
          </div>
          <div className="session-stats">
            <span>{currentIndex + 1} / {session.tasks.length} tasks</span>
            <span>{accuracy}% accuracy</span>
          </div>
        </div>

        <div className={`distraction-banner ${distractionEvent?.mode ?? "none"}`}>
          <strong>{flashMessage}</strong>
          <span>
            {distractionEvent?.audio_label
              ? `Noise profile: ${distractionEvent.audio_label}`
              : "Stay with the task."}
          </span>
        </div>

        <article className="problem-card">
          <p className="problem-meta">
            {activeProblem.operation} · {activeProblem.difficulty}
          </p>
          <p className="problem-prompt">{activeProblem.prompt}</p>
          <label className="answer-row">
            <span className="sr-only">Enter your answer</span>
            <input
              autoFocus
              inputMode="numeric"
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSubmit();
                }
              }}
              placeholder="Type the answer"
              value={answer}
            />
          </label>
          <button
            className="primary-button"
            disabled={answer.trim().length === 0 || submitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {currentIndex + 1 >= session.tasks.length ? "Finish session" : "Submit answer"}
          </button>
        </article>
      </section>
    </div>
  );
}
