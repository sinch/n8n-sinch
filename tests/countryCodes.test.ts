import { describe, it, expect } from 'vitest';
import {
  alpha2ToAlpha3,
  alpha3ToAlpha2,
  getCountryName,
  isValidCountryCode,
  getNames,
  getAllCountryCodes,
} from '../src/utils/countryCodes';

describe('Country Codes Utility', () => {
  describe('alpha2ToAlpha3', () => {
    it('converts valid alpha-2 codes to alpha-3', () => {
      expect(alpha2ToAlpha3('US')).toBe('USA');
      expect(alpha2ToAlpha3('GB')).toBe('GBR');
      expect(alpha2ToAlpha3('AU')).toBe('AUS');
      expect(alpha2ToAlpha3('DE')).toBe('DEU');
      expect(alpha2ToAlpha3('FR')).toBe('FRA');
      expect(alpha2ToAlpha3('JP')).toBe('JPN');
      expect(alpha2ToAlpha3('CN')).toBe('CHN');
      expect(alpha2ToAlpha3('IN')).toBe('IND');
      expect(alpha2ToAlpha3('BR')).toBe('BRA');
      expect(alpha2ToAlpha3('NZ')).toBe('NZL');
    });

    it('handles lowercase alpha-2 codes', () => {
      expect(alpha2ToAlpha3('us')).toBe('USA');
      expect(alpha2ToAlpha3('gb')).toBe('GBR');
      expect(alpha2ToAlpha3('au')).toBe('AUS');
    });

    it('handles mixed case alpha-2 codes', () => {
      expect(alpha2ToAlpha3('Us')).toBe('USA');
      expect(alpha2ToAlpha3('gB')).toBe('GBR');
    });

    it('returns undefined for invalid codes', () => {
      expect(alpha2ToAlpha3('XX')).toBeUndefined();
      expect(alpha2ToAlpha3('ZZ')).toBeUndefined();
      expect(alpha2ToAlpha3('')).toBeUndefined();
    });

    it('returns undefined for null/undefined input', () => {
      expect(alpha2ToAlpha3(null as any)).toBeUndefined();
      expect(alpha2ToAlpha3(undefined as any)).toBeUndefined();
    });
  });

  describe('alpha3ToAlpha2', () => {
    it('converts valid alpha-3 codes to alpha-2', () => {
      expect(alpha3ToAlpha2('USA')).toBe('US');
      expect(alpha3ToAlpha2('GBR')).toBe('GB');
      expect(alpha3ToAlpha2('AUS')).toBe('AU');
      expect(alpha3ToAlpha2('DEU')).toBe('DE');
      expect(alpha3ToAlpha2('FRA')).toBe('FR');
      expect(alpha3ToAlpha2('JPN')).toBe('JP');
      expect(alpha3ToAlpha2('CHN')).toBe('CN');
      expect(alpha3ToAlpha2('IND')).toBe('IN');
      expect(alpha3ToAlpha2('BRA')).toBe('BR');
      expect(alpha3ToAlpha2('NZL')).toBe('NZ');
    });

    it('handles lowercase alpha-3 codes', () => {
      expect(alpha3ToAlpha2('usa')).toBe('US');
      expect(alpha3ToAlpha2('gbr')).toBe('GB');
      expect(alpha3ToAlpha2('aus')).toBe('AU');
    });

    it('handles mixed case alpha-3 codes', () => {
      expect(alpha3ToAlpha2('UsA')).toBe('US');
      expect(alpha3ToAlpha2('gBr')).toBe('GB');
    });

    it('returns undefined for invalid codes', () => {
      expect(alpha3ToAlpha2('XXX')).toBeUndefined();
      expect(alpha3ToAlpha2('ZZZ')).toBeUndefined();
      expect(alpha3ToAlpha2('')).toBeUndefined();
    });

    it('returns undefined for null/undefined input', () => {
      expect(alpha3ToAlpha2(null as any)).toBeUndefined();
      expect(alpha3ToAlpha2(undefined as any)).toBeUndefined();
    });
  });

  describe('getCountryName', () => {
    it('returns correct country names for valid codes', () => {
      expect(getCountryName('US')).toBe('United States of America');
      expect(getCountryName('GB')).toBe('United Kingdom');
      expect(getCountryName('AU')).toBe('Australia');
      expect(getCountryName('DE')).toBe('Germany');
      expect(getCountryName('FR')).toBe('France');
      expect(getCountryName('JP')).toBe('Japan');
      expect(getCountryName('CN')).toBe('China');
      expect(getCountryName('IN')).toBe('India');
      expect(getCountryName('BR')).toBe('Brazil');
      expect(getCountryName('NZ')).toBe('New Zealand');
    });

    it('handles lowercase codes', () => {
      expect(getCountryName('us')).toBe('United States of America');
      expect(getCountryName('gb')).toBe('United Kingdom');
    });

    it('returns undefined for invalid codes', () => {
      expect(getCountryName('XX')).toBeUndefined();
      expect(getCountryName('')).toBeUndefined();
    });

    it('returns undefined for null/undefined input', () => {
      expect(getCountryName(null as any)).toBeUndefined();
      expect(getCountryName(undefined as any)).toBeUndefined();
    });
  });

  describe('isValidCountryCode', () => {
    it('returns true for valid alpha-2 codes', () => {
      expect(isValidCountryCode('US')).toBe(true);
      expect(isValidCountryCode('GB')).toBe(true);
      expect(isValidCountryCode('AU')).toBe(true);
      expect(isValidCountryCode('DE')).toBe(true);
      expect(isValidCountryCode('FR')).toBe(true);
      expect(isValidCountryCode('JP')).toBe(true);
      expect(isValidCountryCode('CN')).toBe(true);
    });

    it('handles lowercase codes', () => {
      expect(isValidCountryCode('us')).toBe(true);
      expect(isValidCountryCode('gb')).toBe(true);
    });

    it('returns false for invalid codes', () => {
      expect(isValidCountryCode('XX')).toBe(false);
      expect(isValidCountryCode('ZZ')).toBe(false);
      expect(isValidCountryCode('')).toBe(false);
    });

    it('returns false for alpha-3 codes', () => {
      expect(isValidCountryCode('USA')).toBe(false);
      expect(isValidCountryCode('GBR')).toBe(false);
    });

    it('returns false for null/undefined input', () => {
      expect(isValidCountryCode(null as any)).toBe(false);
      expect(isValidCountryCode(undefined as any)).toBe(false);
    });
  });

  describe('getNames', () => {
    it('returns an object with country names', () => {
      const names = getNames();
      expect(names).toBeDefined();
      expect(typeof names).toBe('object');
    });

    it('includes major countries', () => {
      const names = getNames();
      expect(names['US']).toBe('United States of America');
      expect(names['GB']).toBe('United Kingdom');
      expect(names['AU']).toBe('Australia');
      expect(names['DE']).toBe('Germany');
      expect(names['FR']).toBe('France');
      expect(names['JP']).toBe('Japan');
      expect(names['CN']).toBe('China');
      expect(names['IN']).toBe('India');
    });

    it('returns a new object each time', () => {
      const names1 = getNames();
      const names2 = getNames();
      expect(names1).not.toBe(names2); // Different object references
      expect(names1).toEqual(names2); // But same content
    });

    it('includes all countries from getAllCountryCodes', () => {
      const names = getNames();
      const codes = getAllCountryCodes();

      codes.forEach(code => {
        expect(names[code]).toBeDefined();
        expect(typeof names[code]).toBe('string');
      });
    });
  });

  describe('getAllCountryCodes', () => {
    it('returns an array of country codes', () => {
      const codes = getAllCountryCodes();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
    });

    it('includes major countries', () => {
      const codes = getAllCountryCodes();
      expect(codes).toContain('US');
      expect(codes).toContain('GB');
      expect(codes).toContain('AU');
      expect(codes).toContain('DE');
      expect(codes).toContain('FR');
      expect(codes).toContain('JP');
      expect(codes).toContain('CN');
      expect(codes).toContain('IN');
    });

    it('returns only alpha-2 codes (2 characters)', () => {
      const codes = getAllCountryCodes();
      codes.forEach(code => {
        expect(code.length).toBe(2);
        expect(code).toMatch(/^[A-Z]{2}$/);
      });
    });

    it('has at least 50 countries', () => {
      const codes = getAllCountryCodes();
      expect(codes.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Round-trip conversions', () => {
    it('converts alpha2 -> alpha3 -> alpha2 correctly', () => {
      const testCodes = ['US', 'GB', 'AU', 'DE', 'FR', 'JP', 'CN', 'IN', 'BR', 'MX'];

      testCodes.forEach(code => {
        const alpha3 = alpha2ToAlpha3(code);
        expect(alpha3).toBeDefined();
        const backToAlpha2 = alpha3ToAlpha2(alpha3!);
        expect(backToAlpha2).toBe(code);
      });
    });

    it('converts alpha3 -> alpha2 -> alpha3 correctly', () => {
      const testCodes = ['USA', 'GBR', 'AUS', 'DEU', 'FRA', 'JPN', 'CHN', 'IND', 'BRA', 'MEX'];

      testCodes.forEach(code => {
        const alpha2 = alpha3ToAlpha2(code);
        expect(alpha2).toBeDefined();
        const backToAlpha3 = alpha2ToAlpha3(alpha2!);
        expect(backToAlpha3).toBe(code);
      });
    });
  });

  describe('Special cases and edge countries', () => {
    it('handles Nordic countries', () => {
      expect(alpha2ToAlpha3('SE')).toBe('SWE');
      expect(alpha2ToAlpha3('NO')).toBe('NOR');
      expect(alpha2ToAlpha3('DK')).toBe('DNK');
      expect(alpha2ToAlpha3('FI')).toBe('FIN');
      expect(alpha2ToAlpha3('IS')).toBe('ISL');
    });

    it('handles Asian countries', () => {
      expect(alpha2ToAlpha3('SG')).toBe('SGP');
      expect(alpha2ToAlpha3('HK')).toBe('HKG');
      expect(alpha2ToAlpha3('TW')).toBe('TWN');
      expect(alpha2ToAlpha3('KR')).toBe('KOR');
      expect(alpha2ToAlpha3('TH')).toBe('THA');
    });

    it('handles Middle Eastern countries', () => {
      expect(alpha2ToAlpha3('AE')).toBe('ARE');
      expect(alpha2ToAlpha3('SA')).toBe('SAU');
      expect(alpha2ToAlpha3('IL')).toBe('ISR');
      expect(alpha2ToAlpha3('TR')).toBe('TUR');
    });

    it('handles South American countries', () => {
      expect(alpha2ToAlpha3('AR')).toBe('ARG');
      expect(alpha2ToAlpha3('CL')).toBe('CHL');
      expect(alpha2ToAlpha3('CO')).toBe('COL');
      expect(alpha2ToAlpha3('PE')).toBe('PER');
    });

    it('handles African countries', () => {
      expect(alpha2ToAlpha3('ZA')).toBe('ZAF');
      expect(alpha2ToAlpha3('NG')).toBe('NGA');
      expect(alpha2ToAlpha3('EG')).toBe('EGY');
      expect(alpha2ToAlpha3('KE')).toBe('KEN');
    });
  });
});
