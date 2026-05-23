export type PlatformErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INVARIANT_VIOLATION"
  | "PROVIDER_UNAVAILABLE";

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: PlatformErrorCode, message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.status = options.status ?? statusForPlatformError(code);
    this.details = options.details;
  }
}

export function statusForPlatformError(code: PlatformErrorCode) {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "VALIDATION_ERROR") return 400;
  if (code === "CONFLICT" || code === "INVARIANT_VIOLATION") return 409;
  if (code === "PROVIDER_UNAVAILABLE") return 503;
  return 500;
}

export function forbidden(message = "You do not have permission to perform this action.", details?: unknown): never {
  throw new PlatformError("FORBIDDEN", message, { details });
}

export function notFound(entity = "Record", details?: unknown): never {
  throw new PlatformError("NOT_FOUND", `${entity} was not found.`, { details });
}

export function validationError(message: string, details?: unknown): never {
  throw new PlatformError("VALIDATION_ERROR", message, { details });
}

export function conflict(message: string, details?: unknown): never {
  throw new PlatformError("CONFLICT", message, { details });
}
