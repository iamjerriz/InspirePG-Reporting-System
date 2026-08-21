import type { LogEntry } from "../types";

interface ApiResult {
  success: boolean;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJson(response: Response): Promise<ApiResult> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new ApiError(data?.message || "Request failed. Please try again.", response.status);
  }
  return data;
}

export async function checkAdminSession(): Promise<boolean> {
  const response = await fetch("/api/admin/session", { credentials: "include" });
  if (!response.ok) return false;
  const data = await response.json().catch(() => null);
  return Boolean(data?.authenticated);
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  await parseJson(response);
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
}

export async function fetchLogEntries(): Promise<LogEntry[]> {
  const response = await fetch("/api/admin/logs", { credentials: "include" });
  const data = await parseJson(response);
  return (data as ApiResult & { rows: LogEntry[] }).rows;
}

export async function updateLogEntry(id: number, formData: FormData): Promise<void> {
  const response = await fetch(`/api/admin/logs/${id}`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
  await parseJson(response);
}

export async function deleteLogEntry(id: number): Promise<void> {
  const response = await fetch(`/api/admin/logs/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson(response);
}
