export function formatBoroughAxisLabel(name: string | null | undefined): string {
  if (name == null || name === '') return '';
  const s = String(name).trim();
  if (/^staten\s*island$/i.test(s)) return 'Staten Is.';
  return s;
}

export function formatBoroughAxisCompact(name: string | null | undefined): string {
  const key = String(name ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  const map: Record<string, string> = {
    MANHATTAN: 'Manh.',
    BROOKLYN: 'Bklyn',
    QUEENS: 'Qns',
    BRONX: 'Bronx',
    'STATEN ISLAND': 'S.I.',
    UNKNOWN: 'Unk.',
  };
  if (map[key]) return map[key];
  return formatBoroughAxisLabel(name);
}

export const COLORS = ['#FF6B6B', '#7B61FF', '#00D4FF', '#FFD166', '#4ECDC4'];
