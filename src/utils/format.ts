import { getDateFormatPref } from './prefs';

// Basic date-time formatter based on user preference in Settings drawer
export function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const fmt = getDateFormatPref();
  switch (fmt) {
    case 'DD.MM.YYYY':
      return `${D}.${M}.${Y} ${hh}:${mm}`;
    case 'MM/DD/YYYY':
      return `${M}/${D}/${Y} ${hh}:${mm}`;
    case 'YYYY-MM-DD':
    default:
      return `${Y}-${M}-${D} ${hh}:${mm}`;
  }
}

export const formatDate = formatDateTime;
