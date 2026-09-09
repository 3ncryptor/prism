import dotenv from "dotenv";

/**
 * Next.js auto-loads .env for `next dev`/`next build`; Jest gets it via
 * jest.setup.ts. Plain `tsx`-run entrypoints (scripts/, workers/) get
 * neither — import this file first (side-effect only) in any such
 * entrypoint. Safe no-op if .env doesn't exist or vars are already set
 * by the platform (dotenv never overrides an existing process.env value).
 */
dotenv.config({ quiet: true });
