import {
  fileExtractionResponseSchema,
  intakeResponseSchema,
  type FileExtractionResponse,
  type IntakeResponse,
} from "@/features/matching/types/match";
import { apiFetch } from "@/lib/api/client";

const MATCHING_API_BASE_URL =
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL ?? "http://localhost:8000";

export type IntakeRequest = {
  message: string;
  follow_up_answer?: string;
  follow_up_count?: number;
};

export async function runMatchIntake(request: IntakeRequest): Promise<IntakeResponse> {
  const data = await apiFetch<unknown>("/api/v1/match/intake", {
    baseUrl: MATCHING_API_BASE_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return intakeResponseSchema.parse(data);
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
