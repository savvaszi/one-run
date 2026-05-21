export function displayChars(text: string): string {
  if (!text) return '';
  return text
    .replace(/^EUR /, '\u20AC')
    .replace(/EUR /g, '\u20AC')
    .replace(/\|/g, '\u00B7')
    .replace(/\*/g, '\u2605')
    .replace(/ -- /g, ' \u2014 ')
    .replace(/^-- /, '\u2014 ')
    .replace(/ --$/g, ' \u2014');
}
