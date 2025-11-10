export class ProviderHttpError extends Error {
  statusCode?: number;
  response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'ProviderHttpError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class SinchApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  details?: unknown;

  constructor(message: string, statusCode?: number, errorCode?: string, details?: unknown) {
    super(message);
    this.name = 'SinchApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}


