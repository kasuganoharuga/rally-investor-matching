"use client";

import { useCallback, useEffect, useState } from "react";

import {
  extractFileText,
  listMatchHistory,
  runMatchIntake,
} from "@/features/matching/api/match-api";
import type { IntakeResponse, MatchRecord } from "@/features/matching/types/match";
import { ApiError } from "@/lib/api/errors";

export type { MatchRecord } from "@/features/matching/types/match";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
};

export type UploadedFounderFile = {
  id: string;
  name: string;
  size: number;
  contentPreview: string | null;
  characterCount: number | null;
  truncated: boolean;
  errorMessage: string | null;
};

type MatchIntakeState = {
  message: string;
  baseMessage: string;
  followUpAnswer: string;
  response: IntakeResponse | null;
  messages: ChatMessage[];
  uploadedFiles: UploadedFounderFile[];
  records: MatchRecord[];
  isSubmitting: boolean;
  isReadingFiles: boolean;
  error: ApiError | null;
};

function initialState(): MatchIntakeState {
  return {
    message: "",
    baseMessage: "",
    followUpAnswer: "",
    response: null,
    messages: [
      {
        id: "assistant-initial",
        role: "assistant",
        content:
          "Tell us about the company, round, market, sector, model, raise amount, and lead need.",
        timestamp: new Date().toISOString(),
      },
    ],
    uploadedFiles: [],
    records: [],
    isSubmitting: false,
    isReadingFiles: false,
    error: null,
  };
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError({
    code: "MATCH_INTAKE_FAILED",
    message: "Unable to run investor matching",
    status: 500,
  });
}

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function chatMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: messageId(role),
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFilesForPrompt(files: UploadedFounderFile[]): string {
  if (files.length === 0) {
    return "";
  }

  const sections = files.map((file) => {
    const body = file.contentPreview
      ? file.contentPreview
      : `[uploaded file: ${file.name}, ${formatFileSize(file.size)}; text extraction failed: ${
          file.errorMessage ?? "unknown error"
        }]`;
    return `File: ${file.name}\n${body}`;
  });
  return `\n\nUploaded founder files:\n${sections.join("\n\n")}`;
}

function buildRequestMessage(message: string, files: UploadedFounderFile[]): string {
  return `${message.trim()}${formatFilesForPrompt(files)}`;
}

function userChatContent(message: string, files: UploadedFounderFile[]): string {
  const trimmedMessage = message.trim();
  if (files.length === 0) {
    return trimmedMessage;
  }
  if (!trimmedMessage) {
    return `Attached: ${files.map((file) => file.name).join(", ")}`;
  }
  return `${trimmedMessage}\n\nAttached: ${files.map((file) => file.name).join(", ")}`;
}

function assistantSummary(response: IntakeResponse): string {
  if (response.status === "needs_follow_up") {
    return response.follow_up_question ?? "Could you share a little more detail?";
  }

  const names = response.matches
    .slice(0, 5)
    .map((match) => match.investor_name)
    .join(", ");
  if (names) {
    return `Matched ${response.matches.length} investors. Top results: ${names}.`;
  }
  return "I extracted the profile, but there are no investor matches yet.";
}

export function useMatchIntake() {
  const [state, setState] = useState<MatchIntakeState>(() => initialState());

  const refreshHistory = useCallback(async () => {
    const history = await listMatchHistory();
    setState((current) => ({ ...current, records: history.items }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listMatchHistory()
      .then((history) => {
        if (!cancelled) {
          setState((current) => ({ ...current, records: history.items }));
        }
      })
      .catch(() => {
        // History is useful, but failure to load it should not block a new match.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateMessage = useCallback((message: string) => {
    setState((current) => ({ ...current, message }));
  }, []);

  const updateFollowUpAnswer = useCallback((followUpAnswer: string) => {
    setState((current) => ({ ...current, followUpAnswer }));
  }, []);

  const addFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setState((current) => ({ ...current, isReadingFiles: true, error: null }));
    const nextFiles = await Promise.all(
      Array.from(fileList).map(async (file) => {
        try {
          const extracted = await extractFileText(file);
          return {
            id: messageId("file"),
            name: extracted.file_name,
            size: file.size,
            contentPreview: extracted.text,
            characterCount: extracted.character_count,
            truncated: extracted.truncated,
            errorMessage: null,
          };
        } catch (error) {
          const apiError = toApiError(error);
          return {
            id: messageId("file"),
            name: file.name,
            size: file.size,
            contentPreview: null,
            characterCount: null,
            truncated: false,
            errorMessage: apiError.message,
          };
        }
      }),
    );
    setState((current) => ({
      ...current,
      uploadedFiles: [...current.uploadedFiles, ...nextFiles],
      isReadingFiles: false,
    }));
  }, []);

  const removeFile = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      uploadedFiles: current.uploadedFiles.filter((file) => file.id !== id),
    }));
  }, []);

  const submitInitial = useCallback(async () => {
    const requestMessage = buildRequestMessage(state.message, state.uploadedFiles);
    setState((current) => ({ ...current, isSubmitting: true, error: null }));
    try {
      const { response, record } = await runMatchIntake({ message: requestMessage });
      setState((current) => ({
        ...current,
        baseMessage: requestMessage,
        message: "",
        response,
        followUpAnswer: "",
        uploadedFiles: [],
        messages: [
          ...current.messages,
          chatMessage("user", userChatContent(state.message, state.uploadedFiles)),
          chatMessage("assistant", assistantSummary(response)),
        ],
        records: record
          ? [record, ...current.records.filter((item) => item.id !== record.id)]
          : current.records,
        isSubmitting: false,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isSubmitting: false,
        error: toApiError(error),
      }));
    }
  }, [state.message, state.uploadedFiles]);

  const submitFollowUp = useCallback(async () => {
    setState((current) => ({ ...current, isSubmitting: true, error: null }));
    try {
      const { response, record } = await runMatchIntake({
        message: state.baseMessage,
        follow_up_answer: state.followUpAnswer,
        follow_up_count: state.response?.follow_up_count ?? 1,
      });
      setState((current) => ({
        ...current,
        response,
        followUpAnswer: "",
        messages: [
          ...current.messages,
          chatMessage("user", state.followUpAnswer.trim()),
          chatMessage("assistant", assistantSummary(response)),
        ],
        records: record
          ? [record, ...current.records.filter((item) => item.id !== record.id)]
          : current.records,
        isSubmitting: false,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isSubmitting: false,
        error: toApiError(error),
      }));
    }
  }, [state.baseMessage, state.followUpAnswer, state.response?.follow_up_count]);

  const reset = useCallback(() => {
    setState((current) => ({
      ...initialState(),
      records: current.records,
    }));
  }, []);

  const selectRecord = useCallback((record: MatchRecord) => {
    setState((current) => ({
      ...current,
      response: record.response,
      message: "",
      baseMessage: "",
      followUpAnswer: "",
      uploadedFiles: [],
      error: null,
    }));
  }, []);

  return {
    ...state,
    updateMessage,
    updateFollowUpAnswer,
    addFiles,
    removeFile,
    submitInitial,
    submitFollowUp,
    selectRecord,
    refreshHistory,
    reset,
  };
}
