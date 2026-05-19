import type { Benchmark } from '../types';

// Locale is driven by the i18n provider so numbers/dates read natively
// (French: "182,40 m" · "19/05/26"). CSV stays machine-formatted elsewhere.
let locale = 'fr-FR';
export function setFormatLocale(lang: 'fr' | 'en'): void {
  locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
}

const nf2 = () =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Signed strokes-gained string, e.g. "+1,20" / "-0.23". */
export function sg(value: number): string {
  return (value >= 0 ? '+' : '') + nf2().format(value);
}

export function benchmarkLabel(b: Benchmark): string {
  return b.kind === 'pro' ? 'PRO' : `HC ${b.hc}`;
}

/** Distance with two decimals + unit, locale-aware. */
export function meters(value: number): string {
  return `${nf2().format(value)} m`;
}

/** Short locale-aware date, e.g. "19/05/26". */
export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(iso));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
