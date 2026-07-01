export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta;
};

export type ApiFailure = {
  success: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const ok = <T>(data: T, meta?: PaginationMeta): ApiSuccess<T> => ({
  success: true,
  data,
  ...(meta ? { meta } : {}),
});

export const fail = (code: string, message: string, details?: unknown): ApiFailure => ({
  success: false,
  error: { code, message, ...(details !== undefined ? { details } : {}) },
});
