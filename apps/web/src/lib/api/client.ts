import {
  ApiError,
  apiErrorFromPayload,
  apiErrorFromUnknown,
  isApiErrorBody,
} from "@/lib/api/errors";
import type { ApiSuccessBody } from "@/lib/api/types";

type ApiFetchOptions = RequestInit & {
  baseUrl?: string;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { baseUrl = "", ...init } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw apiErrorFromPayload(body.error, response.status);
    }
    throw apiErrorFromUnknown(response.status);
  }

  if (typeof body !== "object" || body === null || !("data" in body)) {
    throw new ApiError({
      code: "INVALID_RESPONSE",
      message: "API response is missing a data envelope",
      status: response.status,
    });
  }

  return (body as ApiSuccessBody<T>).data;
}
