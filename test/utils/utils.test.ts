import { randint, isNumber, isArraysEqual } from '../../src/utils/utils.js';

describe('Utils', () => {
  describe('randint', () => {
    it('should return a number within the range [min, max] when both are provided', () => {
      const min = 1;
      const max = 10;
      const result = randint(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });

    it('should return a number within the range [0, max] when only one argument is provided', () => {
      const max = 5;
      const result = randint(max);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(max);
    });

    it('should work with negative numbers', () => {
      const min = -5;
      const max = 5;
      const result = randint(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });
  });

  describe('isNumber', () => {
    it('should return true for a number', () => {
      expect(isNumber(5)).toBe(true);
    });

    it('should return false for a string', () => {
      expect(isNumber('hello')).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isNumber(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe('isArraysEqual', () => {
    it('should return true for two equal arrays', () => {
      expect(isArraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('should return false for two different arrays', () => {
      expect(isArraysEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it('should return true for two empty arrays', () => {
      expect(isArraysEqual([], [])).toBe(true);
    });

    //it('should return false for arrays of different types that are not equal', () => {
    //  expect(isArraysEqual([1, 2, 3], ['1', '2', '3'])).toBe(false);
    //});
  });
});
