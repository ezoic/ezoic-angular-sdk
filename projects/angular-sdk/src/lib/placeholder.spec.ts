import {
  EZOIC_PLACEHOLDER_ID_PREFIX,
  MAX_PLACEHOLDER_ID,
  MIN_PLACEHOLDER_ID,
  isValidPlaceholderId,
  placeholderElementId,
} from './placeholder';

describe('placeholder helpers', () => {
  describe('isValidPlaceholderId', () => {
    it('accepts ids within the inclusive 1-999 range', () => {
      expect(isValidPlaceholderId(MIN_PLACEHOLDER_ID)).toBe(true);
      expect(isValidPlaceholderId(101)).toBe(true);
      expect(isValidPlaceholderId(MAX_PLACEHOLDER_ID)).toBe(true);
    });

    it('rejects ids outside the range', () => {
      expect(isValidPlaceholderId(0)).toBe(false);
      expect(isValidPlaceholderId(1000)).toBe(false);
      expect(isValidPlaceholderId(-1)).toBe(false);
    });

    it('rejects non-integer values', () => {
      expect(isValidPlaceholderId(1.5)).toBe(false);
      expect(isValidPlaceholderId(Number.NaN)).toBe(false);
      expect(isValidPlaceholderId(Number.POSITIVE_INFINITY)).toBe(false);
    });
  });

  describe('placeholderElementId', () => {
    it('builds the ezstandalone element id', () => {
      expect(placeholderElementId(101)).toBe(`${EZOIC_PLACEHOLDER_ID_PREFIX}101`);
      expect(placeholderElementId(101)).toBe('ezoic-pub-ad-placeholder-101');
    });

    it('supports the reserved 900-range zero-config ids', () => {
      expect(placeholderElementId(909)).toBe('ezoic-pub-ad-placeholder-909');
    });

    it('throws RangeError for invalid ids', () => {
      expect(() => placeholderElementId(0)).toThrow(RangeError);
      expect(() => placeholderElementId(1000)).toThrow(RangeError);
      expect(() => placeholderElementId(1.5)).toThrow(RangeError);
    });
  });
});
