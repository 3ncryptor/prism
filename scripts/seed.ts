/**
 * Prism - Database Seed Script
 *
 * Populates the database with fake dev accounts (and, in later features,
 * students/JDs/taxonomy/scoring config — see buildPlan.md §94). Idempotent:
 * safe to run repeatedly.
 *
 * Run with: npm run seed
 */
import "@/lib/config/loadEnv";
import { getDb } from "@/lib/db/client";
import { ensureIndexes } from "@/lib/db/indexes";
import { userRepository } from "@/lib/db/repositories/userRepository";
import { skillTaxonomyRepository } from "@/lib/db/repositories/skillTaxonomyRepository";
import { scoringConfigRepository } from "@/lib/db/repositories/scoringConfigRepository";
import { seedUsers, DEV_PASSWORD } from "@/lib/db/seed/seedUsers";
import { seedSkillTaxonomy } from "@/lib/db/seed/seedSkillTaxonomy";
import { seedScoringConfig } from "@/lib/db/seed/seedScoringConfig";
import { logger } from "@/lib/logger";

async function main() {
  logger.info("Starting seed process...");

  await ensureIndexes(await getDb());
  logger.info("Indexes ensured.");

  const users = await seedUsers(userRepository);
  logger.info(
    { count: users.length, emails: users.map((u) => u.email), devPassword: DEV_PASSWORD },
    "Seeded users (dev password logged above — dev-only, never used in prod)",
  );

  const admin = users.find((u) => u.role === "ADMIN");
  if (!admin) {
    throw new Error("Expected an ADMIN user to be seeded before skill taxonomy");
  }
  const skills = await seedSkillTaxonomy(skillTaxonomyRepository, admin._id);
  logger.info({ count: skills.length }, "Seeded skill taxonomy");

  const scoringConfig = await seedScoringConfig(scoringConfigRepository, admin._id);
  logger.info({ version: scoringConfig.version }, "Seeded scoring config");

  logger.info("Seed completed successfully.");
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Seeding failed");
  process.exit(1);
});
