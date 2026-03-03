export const ALL_SECTIONS = [
  'grammatik', 'wortschatz', 'pruefungen', 'leben_in_deutschland', 'derdiedas',
  'lesen_hoeren', 'dialoge', 'grammatik_training',
] as const;

export type SectionKey = typeof ALL_SECTIONS[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  grammatik: 'Grammatik',
  wortschatz: 'Wortschatz',
  pruefungen: 'Prüfungen',
  leben_in_deutschland: 'Leben in Deutschland',
  derdiedas: 'Der / Die / Das',
  lesen_hoeren: 'Lesen & Hören',
  dialoge: 'Dialoge',
  grammatik_training: 'Grammatik-Training',
};
