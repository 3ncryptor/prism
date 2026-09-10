export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Rate limit exceeded. Try again in ${retryAfterSeconds}s.`);
    this.name = "RateLimitExceededError";
  }
}
