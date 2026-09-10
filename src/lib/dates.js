const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Parse as local time - `new Date('2026-09-10')` is UTC midnight and can
 *  slide a day backwards for anyone west of Greenwich. */
function parse(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export const dayName = (iso) => (parse(iso) ? DAYS[parse(iso).getDay()].slice(0, 3) : '');
export const dayNum = (iso) => (parse(iso) ? String(parse(iso).getDate()).padStart(2, '0') : '--');
export const monthShort = (iso) => (parse(iso) ? MONTHS[parse(iso).getMonth()] : '');

export function longDate(iso) {
  const d = parse(iso);
  if (!d) return 'Date TBC';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()].toUpperCase()} ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
