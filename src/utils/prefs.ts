// Centralized user preference helpers
export const RES_SORT_PREF_KEY = 'pref.sort.resources';
export const ORD_SORT_PREF_KEY = 'pref.sort.orders';
export const DATE_FMT_PREF_KEY = 'pref.date.format';

export function getPref(key: string, fallback: string) {
  try {
    const v = localStorage.getItem(key);
    return v || fallback;
  } catch {
    return fallback;
  }
}

export function getResourceSortPref() {
  return getPref(RES_SORT_PREF_KEY, '-createdDate');
}

export function getOrderSortPref() {
  return getPref(ORD_SORT_PREF_KEY, '-orderDate');
}

export function getDateFormatPref() {
  return getPref(DATE_FMT_PREF_KEY, 'YYYY-MM-DD');
}
