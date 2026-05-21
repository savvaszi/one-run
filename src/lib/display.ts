export function displayChars(text: string): string {
  if (!text) return '';
  return text
    .replace(/^EUR /, '&euro;')
    .replace(/EUR /g, '&euro;')
    .replace(/\|/g, '&middot;')
    .replace(/\*/g, '&#9733;');
}

export function displayHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/^EUR |EUR /g, '&euro;')
    .replace(/\|/g, '&middot;')
    .replace(/\*/g, '&#9733;')
    .replace(/ -- /g, ' &mdash; ')
    .replace(/^-- /, '&mdash; ')
    .replace(/ --$/g, ' &mdash;');
}
