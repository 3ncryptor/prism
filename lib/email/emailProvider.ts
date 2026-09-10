/**
 * docs/screens.md §4.3/§4.4 (feature 27g). Mirrors the ExtractionProvider/
 * EmbeddingProvider abstraction (buildPlan.md §5.7) — swapping the
 * concrete implementation is an environment-config change, not a code
 * branch scattered through services.
 */
export interface EmailProvider {
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
  /** docs/screens.md §7.7 (feature 28). */
  sendVerificationEmail(to: string, verifyUrl: string): Promise<void>;
}
