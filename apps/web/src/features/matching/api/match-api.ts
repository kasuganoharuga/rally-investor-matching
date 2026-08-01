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

const MATCHING_API_BASE_URL =
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL ?? "http://localhost:8000";

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
    baseUrl: MATCHING_API_BASE_URL,
    method: "POST",
    body,
  });

  return fileExtractionResponseSchema.parse(data);
}
