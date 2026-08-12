import {
  fileExtractionResponseSchema,
  matchHistoryListDataSchema,
  matchRecordSchema,
  runMatchDataSchema,
  type FileExtractionResponse,
  type IntakeRequest,
  type MatchHistoryListData,
  type MatchRecord,
  type RunMatchData,
} from "@/features/matching/types/match";
import { apiFetch } from "@/lib/api/client";

const CONFIGURED_MATCHING_API_BASE_URL =
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL ?? "http://localhost:8000";

function getMatchingApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return CONFIGURED_MATCHING_API_BASE_URL;
  }

  const { hostname, protocol } = window.location;
  const isEphemeralEc2Host =
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
    /^ec2-[a-z0-9.-]+\.compute\.amazonaws\.com$/i.test(hostname);

  return isEphemeralEc2Host
    ? `${protocol}//${hostname}:8000`
    : CONFIGURED_MATCHING_API_BASE_URL;
}

export async function runMatchIntake(request: IntakeRequest): Promise<RunMatchData> {
  const data = await apiFetch<unknown>("/api/matching/intake", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return runMatchDataSchema.parse(data);
}

export async function listMatchHistory(): Promise<MatchHistoryListData> {
  const data = await apiFetch<unknown>("/api/matching/history");
  return matchHistoryListDataSchema.parse(data);
}

export async function getMatchingRun(runId: string): Promise<MatchRecord> {
  const data = await apiFetch<unknown>(
    `/api/matching/runs/${encodeURIComponent(runId)}`,
  );
  return matchRecordSchema.parse(data);
}

export async function extractFileText(file: File): Promise<FileExtractionResponse> {
  const body = new FormData();
  body.append("file", file);

  const data = await apiFetch<unknown>("/api/v1/files/extract", {
    baseUrl: getMatchingApiBaseUrl(),
    method: "POST",
    body,
  });

  return fileExtractionResponseSchema.parse(data);
}
