import type {
  AttemptPayload,
  ProfileResponse,
  SessionPayload,
  SessionSummary,
} from "../types";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function startSession(
  accessToken: string,
  difficulty: string,
): Promise<SessionPayload> {
  return request<SessionPayload>("/sessions/start", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ difficulty }),
  });
}

export async function completeSession(
  accessToken: string,
  sessionId: string,
  attempts: AttemptPayload[],
): Promise<SessionSummary> {
  return request<SessionSummary>(`/sessions/${sessionId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ attempts }),
  });
}

export async function getProfile(accessToken: string): Promise<ProfileResponse> {
  return request<ProfileResponse>("/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
