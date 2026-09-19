export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  error: null;
};

export type ApiErrorResponse = {
  success: false;
  data: null;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function success<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message !== undefined ? { message } : {}),
    error: null,
  };
}

export function failure(
  message: string,
  code = 'INTERNAL_ERROR',
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    data: null,
    message,
    error: {
      code,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
