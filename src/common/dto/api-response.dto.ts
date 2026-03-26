export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ApiPaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    details: string | string[];
  };
  message: string;
}
