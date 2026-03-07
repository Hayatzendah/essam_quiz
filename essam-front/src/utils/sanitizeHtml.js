import DOMPurify from 'dompurify';

// تنسيقات الوورد: وسوم شائعة من الوورد + محاذاة وحجم خط
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'div', 'br', 'strong', 'em', 'u', 's', 'b', 'i', 'span', 'font', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'sub', 'sup'],
  ALLOWED_ATTR: ['style', 'class', 'dir', 'size', 'face', 'color', 'align'],
};

// خصائص CSS آمنة نسمح بها (تنسيقات الوورد/Quill: محاذاة، حجم خط، لون، إلخ)
const ALLOWED_STYLE_PROPS = new Set([
  'text-align', 'font-size', 'font-weight', 'font-style', 'font-family', 'color',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'line-height', 'text-indent', 'direction', 'background-color',
]);

function sanitizeStyleValue(value) {
  if (!value || typeof value !== 'string') return '';
  const safe = [];
  const parts = value.split(';');
  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    let prop = part.slice(0, colon).trim().toLowerCase().replace(/\s+/g, ' ');
    const val = part.slice(colon + 1).trim();
    if (!val) continue;
    if (/expression|javascript|url\s*\(\s*["']?\s*javascript/i.test(val)) continue;
    if (ALLOWED_STYLE_PROPS.has(prop)) safe.push(`${prop}: ${val}`);
  }
  return safe.join('; ');
}

/**
 * يصلح HTML القادم من لصق Word/Quill:
 * 1. يزيل soft hyphens المخفية
 * 2. يحول المسافات غير القابلة للكسر (&nbsp; / U+00A0) إلى مسافات عادية
 *    حتى يعمل word-wrap بشكل صحيح (الـ &nbsp; هو السبب الرئيسي لعدم الالتفاف)
 * 3. يحول الشرطة بين حروف الكلمات المركبة إلى non-breaking hyphen (U+2011)
 *    حتى لا تنكسر الكلمة المركبة عند نهاية السطر
 */
export function normalizeWordHtml(html) {
  if (!html || typeof html !== 'string') return html;
  let out = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // ✅ تحويل وسوم Word ذات النطاق (w:p, o:p) إلى وسوم عادية حتى لا يحذفها التنظيف
  out = out.replace(/<\/w:(\w+)>/gi, '</$1>').replace(/<w:(\w+)([^>]*)>/gi, '<$1$2>');
  out = out.replace(/<\/o:(\w+)>/gi, '</$1>').replace(/<o:(\w+)([^>]*)>/gi, '<$1$2>');

  // ✅ تحويل &nbsp; والمسافات غير القابلة للكسر إلى مسافات عادية
  out = out.replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');

  // إزالة soft hyphens
  out = out.replace(/\u00AD/g, '').replace(/&#173;/gi, '');

  out = out.replace(/white-space\s*:\s*nowrap/gi, 'white-space: normal');

  // ✅ شرطة الكلمات المركبة
  out = out.replace(/([\wäöüÄÖÜß])\u002D(?=[\wäöüÄÖÜß])/g, '$1\u2011');

  // ✅ تحويل align="center" إلى class="align-center" حتى تُطبَّق المحاذاة ولا تُلغى
  out = out.replace(/<(\w+)([^>]*)\salign=["'](center|right|left|justify)["']([^>]*)>/gi, (match, tag, before, alignVal, after) => {
    const rest = (before + after).trim();
    const classMatch = rest.match(/class=["']([^"']*)["']/i);
    const alignClass = 'align-' + alignVal;
    const newClass = classMatch ? (classMatch[1] + ' ' + alignClass).trim() : alignClass;
    const newRest = classMatch
      ? rest.replace(/class=["'][^"']*["']/i, 'class="' + newClass + '"')
      : rest + ' class="' + newClass + '"';
    return '<' + tag + (newRest ? ' ' + newRest : '') + '>';
  });

  return out;
}

/**
 * للنص العادي (بدون HTML): تحويل الشرطات المركبة + نهايات الأسطر.
 */
export function normalizePlainTextLineBreaks(text) {
  if (!text || typeof text !== 'string') return text;

  // ✅ تحويل non-breaking spaces إلى مسافات عادية
  let out = text.replace(/\u00A0/g, ' ');

  // ✅ تحويل الشرطة بين حروف إلى non-breaking hyphen في النص العادي أيضاً
  out = out.replace(/([\wäöüÄÖÜß])\u002D(?=[\wäöüÄÖÜß])/g, '$1\u2011');

  return out
    .split(/\n\n+/)
    .map((para) => para.replace(/\n/g, ' ').trim())
    .join('\n\n');
}

export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  // الحفاظ على تنسيقات الوورد (محاذاة، حجم خط) عبر السماح لسمة style مع خصائص آمنة فقط
  const styleHook = (node, data) => {
    if (data.attrName === 'style' && data.attrValue) {
      data.attrValue = sanitizeStyleValue(data.attrValue);
    }
  };
  DOMPurify.addHook('uponSanitizeAttribute', styleHook);
  let clean = DOMPurify.sanitize(dirty, PURIFY_CONFIG);
  DOMPurify.removeHook('uponSanitizeAttribute', styleHook);
  // ✅ تحويل non-breaking spaces في ناتج DOMPurify إلى مسافات عادية
  clean = clean.replace(/\u00A0/g, ' ');
  return clean;
}
