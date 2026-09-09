import type { Skill } from "@/lib/schemas/studentProfile";

export const SKILL_CATEGORY_LABELS: Record<Skill["category"], string> = {
  LANGUAGE: "Languages",
  FRAMEWORK: "Frameworks",
  DATABASE: "Databases",
  CLOUD: "Cloud",
  TOOL: "Tools",
  LIBRARY: "Libraries",
  CONCEPT: "Concepts",
  OTHER: "Other",
};

export function groupSkillsByCategory(skills: Skill[]): [string, Skill[]][] {
  const groups = new Map<Skill["category"], Skill[]>();
  for (const skill of skills) {
    const existing = groups.get(skill.category) ?? [];
    groups.set(skill.category, [...existing, skill]);
  }
  return Array.from(groups.entries()).map(([category, categorySkills]) => [
    SKILL_CATEGORY_LABELS[category],
    categorySkills,
  ]);
}
