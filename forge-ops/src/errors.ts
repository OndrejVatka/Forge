/**
 * An expected, operator-facing failure. The CLI prints its message and exits
 * non-zero without a stack trace; anything else is treated as a bug.
 */
export class OpsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpsError';
  }
}
