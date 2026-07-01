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
export declare const ok: <T>(data: T, meta?: PaginationMeta) => ApiSuccess<T>;
export declare const fail: (code: string, message: string, details?: unknown) => ApiFailure;
//# sourceMappingURL=api-response.d.ts.map