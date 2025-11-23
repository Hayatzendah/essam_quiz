// يزيل مسافات زائدة + يحوّل Lowercase + يزيل التشكيل العربية إن لزم
const AR_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export interface NormalizeOpts {
  lowercase?: boolean; // default: true
  trim?: boolean; // default: true
  removeArabicDiacritics?: boolean; // default: true
  collapseSpaces?: boolean; // default: true
}

export function normalizeAnswer(input: unknown, opts: NormalizeOpts = {}): string {
  const {
    lowercase = true,
    trim = true,
    removeArabicDiacritics = true,
    collapseSpaces = true,
  } = opts;

  let s = (input ?? '').toString();

  // إزالة \n و \r و tabs
  s = s.replace(/[\n\r\t]/g, '');
  
  if (trim) s = s.trim();
  if (removeArabicDiacritics) s = s.replace(AR_DIACRITICS, '');
  if (collapseSpaces) s = s.replace(/\s+/g, ' ');
  if (lowercase) s = s.toLowerCase();

  return s;
}

