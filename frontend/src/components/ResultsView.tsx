import type { ProfileResponse, SessionSummary } from "../types";

type ResultsViewProps = {
  summary: SessionSummary;
  profile: ProfileResponse | null;
  onRestart: () => void;
};

export function ResultsView({ summary, profile, onRestart }: ResultsViewProps) {
  return (
    <section className="results-shell">
      <div className="results-card">
        <p className="eyebrow">Session summary</p>
        <h2>Your recovery pattern is becoming more legible.</h2>
        <p className="lede">{summary.resilience_profile.summary}</p>

        <div className="metric-grid">
          <div>
            <span>Accuracy</span>
            <strong>{summary.metrics.accuracy}%</strong>
          </div>
          <div>
            <span>Recovery score</span>
            <strong>{summary.metrics.recovery_score}</strong>
          </div>
          <div>
            <span>Focus stability</span>
            <strong>{summary.metrics.focus_stability}</strong>
          </div>
          <div>
            <span>Distraction sensitivity</span>
            <strong>{summary.metrics.distraction_sensitivity}</strong>
          </div>
        </div>

        <div className="profile-panels">
          <div className="panel">
            <h3>Resilience profile</h3>
            <p>Recovery capacity: {summary.resilience_profile.recovery_capacity}</p>
            <p>Focus stability: {summary.resilience_profile.focus_stability}</p>
            <p>Sensitivity: {summary.resilience_profile.distraction_sensitivity}</p>
            <p>Trend: {summary.resilience_profile.trend_direction}</p>
          </div>
          <div className="panel">
            <h3>Recent sessions</h3>
            {profile?.recent_sessions.length ? (
              profile.recent_sessions.slice(0, 4).map((item) => (
                <p key={item.id}>
                  {new Date(item.completed_at).toLocaleDateString()} · {item.accuracy}% accuracy ·
                  recovery {item.recovery_score}
                </p>
              ))
            ) : (
              <p>Complete more sessions to reveal trend lines.</p>
            )}
          </div>
        </div>

        <button className="primary-button" onClick={onRestart} type="button">
          Start another session
        </button>
      </div>
    </section>
  );
}
