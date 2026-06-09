/**
 * Application error carrying a machine-readable code and HTTP-ish status.
 * Tool handlers throw these; the MCP server turns them into clean tool errors
 * without leaking internals to the caller.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** A requested entity (project, ticket, …) does not exist. */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/** Caller input was structurally valid but semantically rejected. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION', 400);
    this.name = 'ValidationError';
  }
}

/** A database/infrastructure operation failed. */
export class RepositoryError extends AppError {
  constructor(message: string) {
    super(message, 'REPOSITORY', 500);
    this.name = 'RepositoryError';
  }
}
