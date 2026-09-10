import { Typography } from "@/lib/ui/Typography";
import { Badge } from "@/lib/ui/Badge";
import type { StudentProfile } from "@/lib/schemas/studentProfile";
import { groupSkillsByCategory } from "@/app/student/skillCategoryLabels";
import { MUTED_TEXT_COLOR } from "@/lib/designTokens";

interface ProfileSummaryProps {
  profile: StudentProfile;
}

/** buildPlan.md §120 (feature 27m): migrated off Grauity's NSChip/NSTypography onto lib/ui. */
export function ProfileSummary({ profile }: ProfileSummaryProps) {
  const skillGroups = groupSkillsByCategory(profile.skills);

  return (
    <div className="flex flex-col gap-6">
      {skillGroups.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <Typography variant="h3">Skills</Typography>
          <div className="flex flex-col gap-3">
            {skillGroups.map(([label, skills]) => (
              <div key={label} className="flex flex-col gap-2">
                <Typography variant="caption" style={{ color: MUTED_TEXT_COLOR }}>
                  {label}
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill.canonicalName} tone="brand">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.projects.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <Typography variant="h3">Projects</Typography>
          {profile.projects.map((project) => (
            <div key={project.title} className="flex flex-col gap-1">
              <Typography variant="body" as="h4" className="font-semibold">
                {project.title}
              </Typography>
              <Typography variant="caption">{project.description}</Typography>
              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {project.technologies.map((tech) => (
                    <Badge key={tech} tone="brand">
                      {tech}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {profile.experience.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <Typography variant="h3">Experience</Typography>
          {profile.experience.map((exp) => (
            <div key={`${exp.company}-${exp.role}`} className="flex flex-col gap-1">
              <Typography variant="body" as="h4" className="font-semibold">
                {exp.role} · {exp.company}
              </Typography>
              <Typography variant="caption">{exp.description}</Typography>
            </div>
          ))}
        </div>
      )}

      {profile.education.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <Typography variant="h3">Education</Typography>
          {profile.education.map((edu) => (
            <div key={`${edu.institution}-${edu.degree}`} className="flex flex-col gap-1">
              <Typography variant="body" as="h4" className="font-semibold">
                {edu.degree}, {edu.field}
              </Typography>
              <Typography variant="caption">
                {edu.institution}
                {edu.cgpa != null ? ` · CGPA ${edu.cgpa}` : ""}
              </Typography>
            </div>
          ))}
        </div>
      )}

      {profile.certifications.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <Typography variant="h3">Certifications</Typography>
          <div className="flex flex-wrap gap-2">
            {profile.certifications.map((cert) => (
              <Badge key={cert.name} tone="neutral">
                {cert.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
