import type { SkillTaxonomyRepository } from "@/lib/db/repositories/skillTaxonomyRepository";
import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";

/**
 * buildPlan.md §99/§113.3: "start with a manually curated taxonomy." ~40
 * skills common in university placements, across the categories the
 * extraction schema recognizes.
 */
const SEED_SKILLS: {
  canonicalName: string;
  displayName: string;
  category: SkillTaxonomyEntry["category"];
  aliases: string[];
}[] = [
  { canonicalName: "javascript", displayName: "JavaScript", category: "LANGUAGE", aliases: ["js"] },
  { canonicalName: "typescript", displayName: "TypeScript", category: "LANGUAGE", aliases: ["ts"] },
  { canonicalName: "python", displayName: "Python", category: "LANGUAGE", aliases: [] },
  { canonicalName: "java", displayName: "Java", category: "LANGUAGE", aliases: [] },
  { canonicalName: "c++", displayName: "C++", category: "LANGUAGE", aliases: ["cpp"] },
  { canonicalName: "c", displayName: "C", category: "LANGUAGE", aliases: [] },
  { canonicalName: "c#", displayName: "C#", category: "LANGUAGE", aliases: ["csharp"] },
  { canonicalName: "go", displayName: "Go", category: "LANGUAGE", aliases: ["golang"] },
  { canonicalName: "rust", displayName: "Rust", category: "LANGUAGE", aliases: [] },
  { canonicalName: "sql", displayName: "SQL", category: "LANGUAGE", aliases: [] },
  { canonicalName: "html", displayName: "HTML", category: "LANGUAGE", aliases: ["html5"] },
  { canonicalName: "css", displayName: "CSS", category: "LANGUAGE", aliases: ["css3"] },

  { canonicalName: "react", displayName: "React", category: "FRAMEWORK", aliases: ["react.js", "reactjs"] },
  { canonicalName: "next.js", displayName: "Next.js", category: "FRAMEWORK", aliases: ["nextjs"] },
  { canonicalName: "node.js", displayName: "Node.js", category: "FRAMEWORK", aliases: ["nodejs", "node"] },
  { canonicalName: "express", displayName: "Express", category: "FRAMEWORK", aliases: ["express.js", "expressjs"] },
  { canonicalName: "angular", displayName: "Angular", category: "FRAMEWORK", aliases: ["angularjs"] },
  { canonicalName: "vue", displayName: "Vue.js", category: "FRAMEWORK", aliases: ["vue.js", "vuejs"] },
  { canonicalName: "django", displayName: "Django", category: "FRAMEWORK", aliases: [] },
  { canonicalName: "flask", displayName: "Flask", category: "FRAMEWORK", aliases: [] },
  { canonicalName: "spring", displayName: "Spring", category: "FRAMEWORK", aliases: ["spring boot", "springboot"] },
  { canonicalName: "django rest framework", displayName: "Django REST Framework", category: "FRAMEWORK", aliases: ["drf"] },

  { canonicalName: "mongodb", displayName: "MongoDB", category: "DATABASE", aliases: ["mongo"] },
  { canonicalName: "postgresql", displayName: "PostgreSQL", category: "DATABASE", aliases: ["postgres"] },
  { canonicalName: "mysql", displayName: "MySQL", category: "DATABASE", aliases: [] },
  { canonicalName: "redis", displayName: "Redis", category: "DATABASE", aliases: [] },
  { canonicalName: "sqlite", displayName: "SQLite", category: "DATABASE", aliases: [] },

  { canonicalName: "aws", displayName: "AWS", category: "CLOUD", aliases: ["amazon web services"] },
  { canonicalName: "azure", displayName: "Azure", category: "CLOUD", aliases: ["microsoft azure"] },
  { canonicalName: "gcp", displayName: "GCP", category: "CLOUD", aliases: ["google cloud", "google cloud platform"] },
  { canonicalName: "docker", displayName: "Docker", category: "CLOUD", aliases: [] },
  { canonicalName: "kubernetes", displayName: "Kubernetes", category: "CLOUD", aliases: ["k8s"] },

  { canonicalName: "git", displayName: "Git", category: "TOOL", aliases: [] },
  { canonicalName: "github", displayName: "GitHub", category: "TOOL", aliases: [] },
  { canonicalName: "postman", displayName: "Postman", category: "TOOL", aliases: [] },
  { canonicalName: "figma", displayName: "Figma", category: "TOOL", aliases: [] },
  { canonicalName: "jira", displayName: "Jira", category: "TOOL", aliases: [] },
  { canonicalName: "webpack", displayName: "Webpack", category: "TOOL", aliases: [] },

  { canonicalName: "pandas", displayName: "pandas", category: "LIBRARY", aliases: [] },
  { canonicalName: "numpy", displayName: "NumPy", category: "LIBRARY", aliases: [] },
  { canonicalName: "tensorflow", displayName: "TensorFlow", category: "LIBRARY", aliases: [] },
  { canonicalName: "pytorch", displayName: "PyTorch", category: "LIBRARY", aliases: [] },

  { canonicalName: "rest apis", displayName: "REST APIs", category: "CONCEPT", aliases: ["rest api", "restful api", "restful apis"] },
  { canonicalName: "data structures and algorithms", displayName: "Data Structures & Algorithms", category: "CONCEPT", aliases: ["dsa"] },
  { canonicalName: "machine learning", displayName: "Machine Learning", category: "CONCEPT", aliases: ["ml"] },
  { canonicalName: "object-oriented programming", displayName: "Object-Oriented Programming", category: "CONCEPT", aliases: ["oop"] },
];

/**
 * Idempotent (buildPlan.md §56): upserts by canonicalName so `npm run seed`
 * can be re-run without duplicating taxonomy entries.
 */
export async function seedSkillTaxonomy(
  taxonomy: Pick<SkillTaxonomyRepository, "upsertByCanonicalName">,
  createdBy: string,
): Promise<SkillTaxonomyEntry[]> {
  const created: SkillTaxonomyEntry[] = [];
  for (const skill of SEED_SKILLS) {
    created.push(await taxonomy.upsertByCanonicalName({ ...skill, createdBy }));
  }
  return created;
}
