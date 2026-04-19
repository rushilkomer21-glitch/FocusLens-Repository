import { useEffect, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { ResultsView } from "./components/ResultsView";
import { TrainingSession } from "./components/TrainingSession";
import { completeSession, getProfile, startSession } from "./lib/api";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import type {
  AttemptPayload,
  AuthMode,
  ProfileResponse,
  SessionPayload,
  SessionSummary,
  User,
} from "./types";

type SessionState = "idle" | "running" | "results";

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    hasSupabaseConfig
      ? "Connect with Supabase credentials to start training."
      : "Add Supabase environment variables to enable authentication.",
  );
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      const activeSession = data.session;
      if (!activeSession?.user.email) {
        return;
      }

      setUser({
        id: activeSession.user.id,
        email: activeSession.user.email,
      });
      setAccessToken(activeSession.access_token);
      void refreshProfile(activeSession.access_token);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!currentSession?.user.email) {
        setUser(null);
        setAccessToken(null);
        setProfile(null);
        return;
      }

      setUser({
        id: currentSession.user.id,
        email: currentSession.user.email,
      });
      setAccessToken(currentSession.access_token);
      void refreshProfile(currentSession.access_token);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function refreshProfile(token: string) {
    try {
      const result = await getProfile(token);
      setProfile(result);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAuth() {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (authMode === "sign-up") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw error;
        }
        setMessage("Account created. Check your inbox if email confirmation is enabled.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          throw error;
        }
        if (data.session?.access_token) {
          setAccessToken(data.session.access_token);
        }
        setMessage("Signed in.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartSession() {
    if (!accessToken) {
      setMessage("Sign in before starting a session.");
      return;
    }

    setLoading(true);
    try {
      const nextSession = await startSession(accessToken, "adaptive");
      setSession(nextSession);
      setSummary(null);
      setSessionState("running");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start a session.");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(attempts: AttemptPayload[]) {
    if (!accessToken || !session) {
      return;
    }

    const result = await completeSession(accessToken, session.session_id, attempts);
    setSummary(result);
    setSessionState("results");
    await refreshProfile(accessToken);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSessionState("idle");
    setSession(null);
    setSummary(null);
    setMessage("Signed out.");
  }

  if (!user) {
    return (
      <main className="app-shell auth-shell">
        <AuthPanel
          disabled={loading || !hasSupabaseConfig}
          email={email}
          message={message}
          mode={authMode}
          onEmailChange={setEmail}
          onModeChange={setAuthMode}
          onPasswordChange={setPassword}
          onSubmit={() => void handleAuth()}
          password={password}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1>FocusLens</h1>
        </div>
        <div className="topbar-actions">
          <span>{user.email}</span>
          <button onClick={() => void handleSignOut()} type="button">
            Sign out
          </button>
        </div>
      </header>

      {sessionState === "idle" && (
        <section className="dashboard-grid">
          <article className="hero-panel">
            <p className="eyebrow">Attention resilience</p>
            <h2>Practice arithmetic while noise and vibration compete for your focus.</h2>
            <p className="lede">
              The left rail tracks your session progress as distraction intensity rises.
            </p>
            <button className="primary-button" disabled={loading} onClick={() => void handleStartSession()} type="button">
              Start a session
            </button>
          </article>

          <article className="dashboard-card">
            <h3>Latest profile</h3>
            {profile?.profile ? (
              <>
                <p>{profile.profile.summary}</p>
                <p>Recovery: {profile.profile.recovery_capacity}</p>
                <p>Stability: {profile.profile.focus_stability}</p>
                <p>Sensitivity: {profile.profile.distraction_sensitivity}</p>
              </>
            ) : (
              <p>No sessions yet. Your first results will create a resilience profile.</p>
            )}
          </article>

          <article className="dashboard-card">
            <h3>How distractions work</h3>
            <p>Noise pulses intensify over time. Vibration triggers on supported devices.</p>
            <p>Performance is measured by latency, accuracy, and post-distraction recovery.</p>
          </article>
        </section>
      )}

      {sessionState === "running" && session && (
        <TrainingSession session={session} onComplete={handleComplete} />
      )}

      {sessionState === "results" && summary && (
        <ResultsView
          onRestart={() => {
            setSession(null);
            setSessionState("idle");
          }}
          profile={profile}
          summary={summary}
        />
      )}
    </main>
  );
}
