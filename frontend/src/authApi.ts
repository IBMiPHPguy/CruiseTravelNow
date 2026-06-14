import { clearToken, getToken, setToken } from "./authStorage";
import type { AuthResponse, RegisterInput, User } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

function authHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseError(response: Response, fallback: string): Promise<string> {
  const error = await response.json().catch(() => ({ detail: fallback }));
  if (Array.isArray(error.detail)) {
    return (
      error.detail
        .map((item: { msg?: string }) => item.msg)
        .filter(Boolean)
        .join(" ") || fallback
    );
  }
  return typeof error.detail === "string" ? error.detail : fallback;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Login failed."));
  }

  const data: AuthResponse = await response.json();
  setToken(data.access_token);
  return data;
}

export async function register(payload: RegisterInput): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Registration failed."));
  }

  return response.json();
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    clearToken();
    throw new Error("Session expired.");
  }

  return response.json();
}

export function logout(): void {
  clearToken();
}

export { authHeaders };
