import { parsePhoneNumber } from './phoneValidation';

export type NormalizeResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Normalize a phone number to E.164 format using custom phone validation
 *
 * This implementation matches the Zapier approach:
 * - International numbers (starting with +) work without country code
 * - Local/national numbers REQUIRE a country code to be specified
 * - Properly validates numbers according to each country's rules
 *
 * @param input - Phone number in any format (with spaces, hyphens, brackets, etc.)
 * @param defaultCountry - Country code (e.g., 'AU', 'US', 'GB', 'NZ') - REQUIRED for local numbers
 * @returns Normalized phone number in E.164 format or error
 *
 * @example
 * normalizePhoneNumberToE164('+61 437 536 808') // { ok: true, value: '+61437536808' }
 * normalizePhoneNumberToE164('0437 536 808', 'AU') // { ok: true, value: '+61437536808' }
 * normalizePhoneNumberToE164('022 045 0450', 'NZ') // { ok: true, value: '+6422045045' }
 * normalizePhoneNumberToE164('0437 536 808') // { ok: false, error: 'Country required...' }
 */
export function normalizePhoneNumberToE164(
  input: string,
  defaultCountry?: string
): NormalizeResult {
  let trimmed = (input || '').trim();
  if (!trimmed) return { ok: false, error: 'Phone number is empty' };

  // Convert 00 prefix (international exit code) to + for proper parsing
  if (trimmed.startsWith('00') && trimmed.length > 2) {
    trimmed = '+' + trimmed.substring(2);
  }

  // Check if number starts with + (international format)
  const isInternational = trimmed.startsWith('+');

  // Require country for local/national numbers (same as Zapier)
  if (!isInternational && !defaultCountry) {
    return {
      ok: false,
      error: 'A country is required to be selected for numbers not in international format.'
    };
  }

  try {
    // Parse the number with the country code
    const parsed = parsePhoneNumber(trimmed, defaultCountry);

    // Validate the parsed number (this prevents false positives like 0220450450 → +61220450450)
    if (!parsed.isValid || !parsed.e164Format) {
      return {
        ok: false,
        error: defaultCountry
          ? `Phone number cannot be formatted into valid international number for country ${defaultCountry}.`
          : 'Phone number cannot be formatted into valid international number.'
      };
    }

    // Return E.164 format
    return { ok: true, value: parsed.e164Format };

  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to parse phone number'
    };
  }
}


