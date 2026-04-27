/**
 * bilingualHelpers.ts
 * Utilities for handling bilingual data returned from the backend.
 *
 * The backend now stores dynamic AI-generated text as:
 *   { "en": "English text", "hi": "हिंदी पाठ" }
 *
 * getBilingualText() safely extracts the correct language.
 * It is backward-compatible with legacy plain-string data.
 */

import { Language } from '../context/LanguageContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BilingualString {
  en: string;
  hi: string;
}

export type BilingualValue = BilingualString | string | null | undefined;

// ─── Core Helper ─────────────────────────────────────────────────────────────

/**
 * Safely extracts a string in the requested language from a bilingual value.
 *
 * @param value  - The field value: can be { en, hi }, a plain string, null, or undefined
 * @param lang   - The target language ('en' | 'hi')
 * @param fallback - Optional fallback string when the value is empty/null
 * @returns      - The localized string or fallback
 */
export function getBilingualText(
  value: BilingualValue,
  lang: Language,
  fallback: string = '—'
): string {
  if (!value) return fallback;

  // Case 1: Bilingual object { en, hi }
  if (typeof value === 'object') {
    const v = value as BilingualString;
    if (lang === 'hi' && v.hi?.trim()) return v.hi.trim();
    if (v.en?.trim()) return v.en.trim();
    return fallback;
  }

  // Case 2: Legacy plain string (backward compatible — always show as-is)
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

// ─── Array Helper ─────────────────────────────────────────────────────────────

/**
 * Like getBilingualText but for arrays of bilingual strings.
 * e.g. key_complaints: [{ en: "No water", hi: "पानी नहीं" }, ...]
 */
export function getBilingualArray(
  value: BilingualValue[] | string[] | null | undefined,
  lang: Language
): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.map((item) => getBilingualText(item as BilingualValue, lang));
}

// ─── Check Helper ─────────────────────────────────────────────────────────────

/**
 * Returns true if a value is a proper bilingual object (has both languages).
 */
export function isBilingual(value: any): value is BilingualString {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.en === 'string' &&
    typeof value.hi === 'string'
  );
}

// ─── Flatten Helper (for Firestore storage) ────────────────────────────────

/**
 * Creates a bilingual string object from two plain strings.
 * Useful on the frontend when manually composing bilingual data.
 */
export function makeBilingual(en: string, hi: string): BilingualString {
  return { en, hi };
}
