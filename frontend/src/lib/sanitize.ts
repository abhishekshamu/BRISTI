import DOMPurify from 'dompurify';

// Render-time XSS defense for CMS rich-text fields (defense-in-depth on top of
// server-side sanitize-html). Only a pragmatic prose/table tag set is allowed,
// matching what the backend persists.
const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's',
  'blockquote', 'ul', 'ol', 'li',
  'a', 'img', 'figure', 'figcaption',
  'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'span', 'div',
];

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
}