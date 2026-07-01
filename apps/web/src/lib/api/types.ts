export type ApiErrorPayload = {
  code: string;
  message: string;
  request_id?: string;
};

export type ApiErrorBody = {
  error: ApiErrorPayload;
};

export type ApiSuccessBody<T> = {
  data: T;
};
