import { NSChip, NSTypography } from "@newtonschool/grauity";
import type { StudentProfile } from "@/lib/schemas/studentProfile";
import { groupSkillsByCategory } from "@/app/student/skillCategoryLabels";
import { MUTED_TEXT_COLOR } from "@/app/student/theme";

interface ProfileSummaryProps {
  profile: StudentProfile;
}

export function ProfileSummary({ profile }: ProfileSummaryProps) {
  const skillGroups = groupSkillsByCategory(profile.skills);

  return (
    <div className="flex flex-col gap-6">
      {skillGroups.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <NSTypography variant="heading-sb-h4" as="h2">
            Skills
          </NSTypography>
          <div className="flex flex-col gap-3">
            {skillGroups.map(([label, skills]) => (
              <div key={label} className="flex flex-col gap-2">
                <NSTypography variant="paragraph-sb-l1" color={MUTED_TEXT_COLOR}>
                  {label}
                </NSTypography>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <NSChip key={skill.canonicalName} variant="brand">
                      {skill.name}
                    </NSChip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.projects.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <NSTypography variant="heading-sb-h4" as="h2">
            Projects
          </NSTypography>
          {profile.projects.map((project) => (
            <div key={project.title} className="flex flex-col gap-1">
              <NSTypography variant="paragraph-sb-p2" as="h3">
                {project.title}
              </NSTypography>
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                {project.description}
              </NSTypography>
              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {project.technologies.map((tech) => (
                    <NSChip key={tech} variant="brand" size="small">
                      {tech}
                    </NSChip>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {profile.experience.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <NSTypography variant="heading-sb-h4" as="h2">
            Experience
          </NSTypography>
          {profile.experience.map((exp) => (
            <div key={`${exp.company}-${exp.role}`} className="flex flex-col gap-1">
              <NSTypography variant="paragraph-sb-p2" as="h3">
                {exp.role} · {exp.company}
              </NSTypography>
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                {exp.description}
              </NSTypography>
            </div>
          ))}
        </div>
      )}

      {profile.education.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <NSTypography variant="heading-sb-h4" as="h2">
            Education
          </NSTypography>
          {profile.education.map((edu) => (
            <div key={`${edu.institution}-${edu.degree}`} className="flex flex-col gap-1">
              <NSTypography variant="paragraph-sb-p2" as="h3">
                {edu.degree}, {edu.field}
              </NSTypography>
              <NSTypography variant="paragraph-md-p3" color={MUTED_TEXT_COLOR}>
                {edu.institution}
                {edu.cgpa != null ? ` · CGPA ${edu.cgpa}` : ""}
              </NSTypography>
            </div>
          ))}
        </div>
      )}

      {profile.certifications.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <NSTypography variant="heading-sb-h4" as="h2">
            Certifications
          </NSTypography>
          <div className="flex flex-wrap gap-2">
            {profile.certifications.map((cert) => (
              <NSChip key={cert.name} variant="purple">
                {cert.name}
              </NSChip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
