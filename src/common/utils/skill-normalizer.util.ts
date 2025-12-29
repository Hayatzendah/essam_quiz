import { ExamSkillEnum } from '../enums';

/**
 * Normalizes skill value to match ExamSkillEnum (case-insensitive)
 * @param skill - Skill value (can be any case: "Hoeren", "HOEREN", "hoeren", "Grammar", "GRAMMAR", "grammar")
 * @returns Normalized skill value from ExamSkillEnum, or the original value if not found (for validation to catch)
 */
export function normalizeSkill(skill: string | undefined | null): ExamSkillEnum | string | undefined {
  if (!skill) return undefined;

  const trimmed = String(skill).trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();

  // Find matching enum value (case-insensitive)
  const enumValues = Object.values(ExamSkillEnum) as string[];
  const matched = enumValues.find((value) => value.toLowerCase() === normalized);

  if (matched) {
    return matched as ExamSkillEnum;
  }

  // Handle common uppercase variations
  const uppercaseVariations: Record<string, ExamSkillEnum> = {
    'hoeren': ExamSkillEnum.HOEREN,
    'lesen': ExamSkillEnum.LESEN,
    'schreiben': ExamSkillEnum.SCHREIBEN,
    'sprechen': ExamSkillEnum.SPRECHEN,
    'grammar': ExamSkillEnum.GRAMMAR,
    'mixed': ExamSkillEnum.MIXED,
    'misc': ExamSkillEnum.MISC,
    'leben_test': ExamSkillEnum.LEBEN_TEST,
  };

  if (uppercaseVariations[normalized]) {
    return uppercaseVariations[normalized];
  }

  // If no match found, return original value (validation will catch it)
  return trimmed;
}

