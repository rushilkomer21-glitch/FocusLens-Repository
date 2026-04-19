import type { SessionStage } from "../types";

type ProgressRailProps = {
  stages: SessionStage[];
  currentTaskIndex: number;
  totalTasks: number;
};

export function ProgressRail({
  stages,
  currentTaskIndex,
  totalTasks,
}: ProgressRailProps) {
  const progressRatio = totalTasks === 0 ? 0 : currentTaskIndex / totalTasks;
  let completedTaskCount = 0;

  return (
    <aside className="progress-rail">
      <div className="progress-shell">
        <p className="eyebrow">Session progress</p>
        <div className="progress-bar-track" aria-hidden="true">
          <div
            className="progress-bar-fill"
            style={{
              height: `${Math.min(progressRatio * 100, 100)}%`,
              width: `${Math.min(progressRatio * 100, 100)}%`,
            }}
          />
        </div>
        <div className="progress-stage-list">
          {stages.map((stage) => {
            completedTaskCount += stage.task_count;
            const completed = currentTaskIndex >= completedTaskCount;

            return (
              <div
                className={`progress-stage ${completed ? "is-complete" : ""}`}
                key={stage.index}
              >
                <span>{stage.label}</span>
                <small>{stage.distraction_mode.replaceAll("_", " ")}</small>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
