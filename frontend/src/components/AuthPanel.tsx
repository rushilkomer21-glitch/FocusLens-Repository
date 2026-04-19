import type { AuthMode } from "../types";

type AuthPanelProps = {
  mode: AuthMode;
  email: string;
  password: string;
  message: string;
  onModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
};

export function AuthPanel(props: AuthPanelProps) {
  const {
    mode,
    email,
    password,
    message,
    onModeChange,
    onEmailChange,
    onPasswordChange,
    onSubmit,
    disabled,
  } = props;

  return (
    <section className="auth-card">
      <div>
        <p className="eyebrow">FocusLens</p>
        <h1>Train attention recovery under controlled distraction.</h1>
        <p className="lede">
          This product builds resilience. It does not diagnose ADHD or replace
          clinical care.
        </p>
      </div>

      <div className="mode-toggle">
        <button
          className={mode === "sign-in" ? "is-active" : ""}
          onClick={() => onModeChange("sign-in")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={mode === "sign-up" ? "is-active" : ""}
          onClick={() => onModeChange("sign-up")}
          type="button"
        >
          Create account
        </button>
      </div>

      <label>
        Email
        <input
          autoComplete="email"
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="name@example.com"
          type="email"
          value={email}
        />
      </label>

      <label>
        Password
        <input
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Minimum 6 characters"
          type="password"
          value={password}
        />
      </label>

      <button className="primary-button" disabled={disabled} onClick={onSubmit} type="button">
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </button>

      <p className="status-text">{message}</p>
    </section>
  );
}
