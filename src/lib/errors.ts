export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INSUFFICIENT_FUNDS"
  | "BUDGET_EXCEEDED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "BAD_REQUEST";

/** Errors that are safe to show to the user verbatim. */
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Item") => new AppError("NOT_FOUND", `${what} not found.`);
