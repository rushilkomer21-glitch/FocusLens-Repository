export type AuthMode = "sign-in" | "sign-up";

export type User = {
  id: string;
  email: string;
};

export type DistractionMode = "none" | "audio" | "haptic" | "audio_haptic";

export type Problem = {
  id: string;
  prompt: string;
  answer: number;
  operation: string;
  stageIndex: number;
  difficulty: string;
};

export type SessionStage = {
  index: number;
  label: string;
  distraction_mode: DistractionMode;
  task_count: number;
};

export type DistractionEvent = {
  task_index: number;
  mode: DistractionMode;
  intensity: number;
  audio_label: string | null;
  vibration_pattern: number[] | null;
};

export type SessionPayload = {
  session_id: string;
  started_at: string;
  difficulty: string;
  tasks: Problem[];
  stages: SessionStage[];
  distraction_schedule: DistractionEvent[];
};

export type SessionMetrics = {
  accuracy: number;
  average_latency_ms: number;
  recovery_score: number;
  focus_stability: number;
  distraction_sensitivity: number;
};

export type ResilienceProfile = {
  distraction_sensitivity: string;
  recovery_capacity: string;
  focus_stability: string;
  trend_direction: string;
  summary: string;
};

export type SessionSummary = {
  session_id: string;
  completed_at: string;
  metrics: SessionMetrics;
  resilience_profile: ResilienceProfile;
};

export type AttemptPayload = {
  task_id: string;
  task_index: number;
  response_value: string;
  correct: boolean;
  latency_ms: number;
  distraction_mode: DistractionMode;
  distraction_intensity: number;
};

export type ProfileResponse = {
  profile: ResilienceProfile | null;
  recent_sessions: Array<{
    id: string;
    completed_at: string;
    accuracy: number;
    recovery_score: number;
    focus_stability: number;
  }>;
};
