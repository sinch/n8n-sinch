import { describe, it, expect } from 'vitest';
import {
  parsePhoneNumber,
  formatToE164,
  isValidPhoneNumber,
  formatInternational,
  getCountryCallingCode,
  parseAndKeepRawInput,
  isValidNumber,
  format,
  type PhoneNumber,
} from '../src/utils/phoneValidation';

describe('Phone Validation Utility', () => {
  describe('getCountryCallingCode', () => {
    it('returns correct calling codes for major countries', () => {
      expect(getCountryCallingCode('US')).toBe('1');
      expect(getCountryCallingCode('CA')).toBe('1');
      expect(getCountryCallingCode('GB')).toBe('44');
      expect(getCountryCallingCode('AU')).toBe('61');
      expect(getCountryCallingCode('DE')).toBe('49');
      expect(getCountryCallingCode('FR')).toBe('33');
      expect(getCountryCallingCode('JP')).toBe('81');
      expect(getCountryCallingCode('CN')).toBe('86');
      expect(getCountryCallingCode('IN')).toBe('91');
      expect(getCountryCallingCode('BR')).toBe('55');
    });

    it('handles lowercase country codes', () => {
      expect(getCountryCallingCode('us')).toBe('1');
      expect(getCountryCallingCode('gb')).toBe('44');
      expect(getCountryCallingCode('au')).toBe('61');
    });

    it('returns undefined for invalid country codes', () => {
      expect(getCountryCallingCode('XX')).toBeUndefined();
      expect(getCountryCallingCode('')).toBeUndefined();
      expect(getCountryCallingCode('ZZ')).toBeUndefined();
    });

    it('returns undefined for null/undefined input', () => {
      expect(getCountryCallingCode(null as any)).toBeUndefined();
      expect(getCountryCallingCode(undefined as any)).toBeUndefined();
    });
  });

  describe('parsePhoneNumber', () => {
    describe('International format (with +)', () => {
      it('parses US phone numbers correctly', () => {
        const result = parsePhoneNumber('+14155552671');
        expect(result.isValid).toBe(true);
        expect(result.countryCode).toBe('1');
        expect(result.nationalNumber).toBe('4155552671');
        expect(result.e164Format).toBe('+14155552671');
      });

      it('parses UK phone numbers correctly', () => {
        const result = parsePhoneNumber('+442071234567');
        expect(result.isValid).toBe(true);
        expect(result.countryCode).toBe('44');
        expect(result.nationalNumber).toBe('2071234567');
        expect(result.e164Format).toBe('+442071234567');
      });

      it('parses Australian phone numbers correctly', () => {
        const result = parsePhoneNumber('+61437536808');
        expect(result.isValid).toBe(true);
        expect(result.countryCode).toBe('61');
        expect(result.nationalNumber).toBe('437536808');
        expect(result.e164Format).toBe('+61437536808');
      });

      it('parses phone numbers with spaces and dashes', () => {
        const result = parsePhoneNumber('+1 415-555-2671');
        expect(result.isValid).toBe(true);
        expect(result.countryCode).toBe('1');
        expect(result.nationalNumber).toBe('4155552671');
        expect(result.e164Format).toBe('+14155552671');
      });

      it('parses phone numbers with parentheses', () => {
        const result = parsePhoneNumber('+1 (415) 555-2671');
        expect(result.isValid).toBe(true);
        expect(result.countryCode).toBe('1');
        expect(result.nationalNumber).toBe('4155552671');
        expect(result.e164Format).toBe('+14155552671');
      });

      it('handles different country codes', () => {
        // Germany
        expect(parsePhoneNumber('+4930123456').countryCode).toBe('49');
        // France
        expect(parsePhoneNumber('+33123456789').countryCode).toBe('33');
        // Japan
        expect(parsePhoneNumber('+81312345678').countryCode).toBe('81');
        // Singapore
        expect(parsePhoneNumber('+6512345678').countryCode).toBe('65');
      });
    });

    describe('Local format (without +)', () => {
      it('parses US local numbers with country code', () => {
        const result = parsePhoneNumber('4155552671', 'US');
        expect(result.isValid).toBe(true);
        expect(result.countryCode).toBe('1');
        expect(result.nationalNumber).toBe('4155552671');
        expect(result.e164Format).toBe('+14155552671');
      });

      it('parses Australian local numbers with country code', () => {
        const result = parsePhoneNumber('0437536808', 'AU');
        expect(result.isValid).toBe(true);
        expect(result.countryCode).toBe('61');
        expect(result.nationalNumber).toBe('437536808'); // Leading 0 removed
        expect(result.e164Format).toBe('+61437536808');
      });

      it('removes leading zero from local numbers', () => {
        const result = parsePhoneNumber('02071234567', 'GB');
        expect(result.countryCode).toBe('44');
        expect(result.nationalNumber).toBe('2071234567');
      });

      it('returns invalid when no country code provided for local number', () => {
        const result = parsePhoneNumber('4155552671');
        expect(result.isValid).toBe(false);
        expect(result.e164Format).toBeUndefined();
      });

      it('returns invalid when country code is invalid', () => {
        const result = parsePhoneNumber('4155552671', 'XX');
        expect(result.isValid).toBe(false);
        expect(result.e164Format).toBeUndefined();
      });
    });

    describe('Validation rules', () => {
      it('rejects phone numbers that are too short', () => {
        const result = parsePhoneNumber('+1123');
        expect(result.isValid).toBe(false);
        expect(result.e164Format).toBeUndefined();
      });

      it('rejects phone numbers that are too long', () => {
        const result = parsePhoneNumber('+11234567890123456');
        expect(result.isValid).toBe(false);
        expect(result.e164Format).toBeUndefined();
      });

      it('requires at least 4 digits in national number', () => {
        const result = parsePhoneNumber('+1123', 'US');
        expect(result.isValid).toBe(false);
      });

      it('accepts phone numbers with 7-15 total digits', () => {
        // 7 digits total (min)
        expect(parsePhoneNumber('+1234567').isValid).toBe(true);
        // 15 digits total (max)
        expect(parsePhoneNumber('+123456789012345').isValid).toBe(true);
      });

      it('handles empty phone number', () => {
        const result = parsePhoneNumber('');
        expect(result.isValid).toBe(false);
        expect(result.countryCode).toBe('');
        expect(result.nationalNumber).toBe('');
      });

      it('handles whitespace-only phone number', () => {
        const result = parsePhoneNumber('   ');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('formatToE164', () => {
    it('formats international numbers to E.164', () => {
      expect(formatToE164('+1 415 555 2671')).toBe('+14155552671');
      expect(formatToE164('+44 20 7123 4567')).toBe('+442071234567');
      expect(formatToE164('+61 437 536 808')).toBe('+61437536808');
    });

    it('formats local numbers with country code to E.164', () => {
      expect(formatToE164('415-555-2671', 'US')).toBe('+14155552671');
      expect(formatToE164('0437 536 808', 'AU')).toBe('+61437536808');
      expect(formatToE164('020 7123 4567', 'GB')).toBe('+442071234567');
    });

    it('returns null for invalid phone numbers', () => {
      expect(formatToE164('123')).toBeNull();
      expect(formatToE164('')).toBeNull();
      expect(formatToE164('invalid')).toBeNull();
    });

    it('returns null when local number has no country code', () => {
      expect(formatToE164('4155552671')).toBeNull();
    });

    it('handles numbers with various formatting', () => {
      expect(formatToE164('+1 (415) 555-2671')).toBe('+14155552671');
      expect(formatToE164('+1.415.555.2671')).toBe('+14155552671');
      expect(formatToE164('+1-415-555-2671')).toBe('+14155552671');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('returns true for valid international phone numbers', () => {
      expect(isValidPhoneNumber('+14155552671')).toBe(true);
      expect(isValidPhoneNumber('+442071234567')).toBe(true);
      expect(isValidPhoneNumber('+61437536808')).toBe(true);
      expect(isValidPhoneNumber('+33123456789')).toBe(true);
    });

    it('returns true for valid local format numbers', () => {
      expect(isValidPhoneNumber('4155552671')).toBe(true);
      expect(isValidPhoneNumber('02071234567')).toBe(true);
      expect(isValidPhoneNumber('0437536808')).toBe(true);
    });

    it('returns false for numbers that are too short', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('+1234')).toBe(false);
    });

    it('returns false for numbers that are too long', () => {
      expect(isValidPhoneNumber('12345678901234567')).toBe(false);
      expect(isValidPhoneNumber('+12345678901234567')).toBe(false);
    });

    it('returns false for empty strings', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('   ')).toBe(false);
    });

    it('handles numbers with formatting characters', () => {
      expect(isValidPhoneNumber('+1 (415) 555-2671')).toBe(true);
      expect(isValidPhoneNumber('415-555-2671')).toBe(true);
    });
  });

  describe('formatInternational', () => {
    it('formats phone numbers in international display format', () => {
      const result = formatInternational('+14155552671');
      expect(result).toBe('+1 4155552671');
    });

    it('formats various countries correctly', () => {
      expect(formatInternational('+442071234567')).toBe('+44 2071234567');
      expect(formatInternational('+61437536808')).toBe('+61 437536808');
      expect(formatInternational('+33123456789')).toBe('+33 123456789');
    });

    it('handles numbers with existing formatting', () => {
      expect(formatInternational('+1 (415) 555-2671')).toBe('+1 4155552671');
    });

    it('returns original number if invalid', () => {
      expect(formatInternational('123')).toBe('123');
      expect(formatInternational('')).toBe('');
      expect(formatInternational('invalid')).toBe('invalid');
    });

    it('handles numbers without + prefix', () => {
      const result = formatInternational('invalid-format');
      expect(result).toBe('invalid-format'); // Returns original if can't parse
    });
  });

  describe('parseAndKeepRawInput (compatibility)', () => {
    it('behaves like parsePhoneNumber', () => {
      const result = parseAndKeepRawInput('+14155552671');
      expect(result.isValid).toBe(true);
      expect(result.countryCode).toBe('1');
      expect(result.nationalNumber).toBe('4155552671');
      expect(result.e164Format).toBe('+14155552671');
    });

    it('accepts country code parameter', () => {
      const result = parseAndKeepRawInput('4155552671', 'US');
      expect(result.isValid).toBe(true);
      expect(result.e164Format).toBe('+14155552671');
    });
  });

  describe('isValidNumber (compatibility)', () => {
    it('returns true for valid parsed numbers', () => {
      const parsed = parsePhoneNumber('+14155552671');
      expect(isValidNumber(parsed)).toBe(true);
    });

    it('returns false for invalid parsed numbers', () => {
      const parsed = parsePhoneNumber('123');
      expect(isValidNumber(parsed)).toBe(false);
    });
  });

  describe('format (compatibility)', () => {
    it('returns E.164 format for valid numbers', () => {
      const parsed = parsePhoneNumber('+14155552671');
      expect(format(parsed)).toBe('+14155552671');
    });

    it('returns empty string for invalid numbers', () => {
      const parsed = parsePhoneNumber('123');
      expect(format(parsed)).toBe('');
    });
  });

  describe('Edge cases and special scenarios', () => {
    it('handles numbers with multiple formatting characters', () => {
      const result = parsePhoneNumber('+1 (415) 555-2671 ext. 123');
      // Non-digits are stripped, so "ext. 123" becomes "123"
      expect(result.isValid).toBe(true);
    });

    it('handles numbers with dots', () => {
      const result = parsePhoneNumber('+1.415.555.2671');
      expect(result.isValid).toBe(true);
      expect(result.e164Format).toBe('+14155552671');
    });

    it('handles very long country codes correctly', () => {
      // Finland has a 3-digit country code (358)
      const result = parsePhoneNumber('+358123456789');
      expect(result.countryCode).toBe('358');
      expect(result.isValid).toBe(true);
    });

    it('handles shared country codes (NANP)', () => {
      // US, Canada, Jamaica all use country code 1
      expect(parsePhoneNumber('+14155552671').countryCode).toBe('1');
      expect(parsePhoneNumber('+16135551234').countryCode).toBe('1'); // Canada
      expect(parsePhoneNumber('+18765551234').countryCode).toBe('1'); // Jamaica
    });

    it('preserves all digits from input', () => {
      const result = parsePhoneNumber('+1 (415) 555-2671');
      const totalDigits = result.countryCode.length + result.nationalNumber.length;
      expect(totalDigits).toBe(11); // 1 + 4155552671
    });

    it('handles minimum valid phone number length', () => {
      // 7 digits total (1 country + 6 national, but needs at least 4 national)
      const result = parsePhoneNumber('+1234567');
      expect(result.isValid).toBe(true);
      expect(result.nationalNumber.length).toBeGreaterThanOrEqual(4);
    });

    it('handles maximum valid phone number length', () => {
      // 15 digits total (international standard)
      const result = parsePhoneNumber('+123456789012345');
      expect(result.isValid).toBe(true);
    });

    it('handles New Zealand numbers with leading zero', () => {
      const result = parsePhoneNumber('022 045 0450', 'NZ');
      expect(result.isValid).toBe(true);
      expect(result.nationalNumber).toBe('220450450'); // Leading 0 removed
      expect(result.countryCode).toBe('64');
    });
  });

  describe('Real-world phone number examples', () => {
    it('handles US phone numbers', () => {
      expect(formatToE164('(415) 555-2671', 'US')).toBe('+14155552671');
      expect(formatToE164('415.555.2671', 'US')).toBe('+14155552671');
      expect(formatToE164('+1-415-555-2671')).toBe('+14155552671'); // International format
    });

    it('handles UK phone numbers', () => {
      expect(formatToE164('020 7123 4567', 'GB')).toBe('+442071234567');
      expect(formatToE164('+44 20 7123 4567')).toBe('+442071234567');
    });

    it('handles Australian phone numbers', () => {
      expect(formatToE164('0437 536 808', 'AU')).toBe('+61437536808');
      expect(formatToE164('+61 437 536 808')).toBe('+61437536808');
    });

    it('handles German phone numbers', () => {
      expect(formatToE164('030 12345678', 'DE')).toBe('+493012345678');
      expect(formatToE164('+49 30 12345678')).toBe('+493012345678');
    });

    it('handles Japanese phone numbers', () => {
      expect(formatToE164('03-1234-5678', 'JP')).toBe('+81312345678');
      expect(formatToE164('+81 3-1234-5678')).toBe('+81312345678');
    });

    it('handles Singapore phone numbers', () => {
      expect(formatToE164('1234 5678', 'SG')).toBe('+6512345678');
      expect(formatToE164('+65 1234 5678')).toBe('+6512345678');
    });
  });
});
