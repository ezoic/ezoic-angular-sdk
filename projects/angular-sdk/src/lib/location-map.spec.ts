import {
  EZOIC_LOCATION_ALIASES,
  EZOIC_LOCATION_BY_ID,
  isKnownEzoicLocation,
  resolveStaticLocationId,
} from './location-map';

describe('location-map', () => {
  describe('resolveStaticLocationId', () => {
    it('resolves canonical single-id location names', () => {
      expect(resolveStaticLocationId('top_of_page')).toBe(900);
      expect(resolveStaticLocationId('under_page_title')).toBe(901);
      expect(resolveStaticLocationId('bottom_of_page')).toBe(902);
      expect(resolveStaticLocationId('under_first_paragraph')).toBe(909);
      expect(resolveStaticLocationId('under_second_paragraph')).toBe(910);
      expect(resolveStaticLocationId('mid_content')).toBe(911);
    });

    it('returns the lowest id when a name is bound to several ids', () => {
      // 904, 905 and 906 are all `sidebar_middle`.
      expect(EZOIC_LOCATION_BY_ID[904]).toBe('sidebar_middle');
      expect(EZOIC_LOCATION_BY_ID[905]).toBe('sidebar_middle');
      expect(EZOIC_LOCATION_BY_ID[906]).toBe('sidebar_middle');
      expect(resolveStaticLocationId('sidebar_middle')).toBe(904);
    });

    it('resolves aliases before looking up an id', () => {
      expect(resolveStaticLocationId('incontent_0')).toBe(910); // under_second_paragraph
      expect(resolveStaticLocationId('incontent_1')).toBe(911); // mid_content
      expect(resolveStaticLocationId('sidebar_floating')).toBe(908); // sidebar_floating_1
      expect(resolveStaticLocationId('sidebar_floating_2')).toBe(904); // sidebar_middle
      expect(resolveStaticLocationId('sidebar_floating_3')).toBe(907); // sidebar_bottom
    });

    it('resolves the incontent range, including across the missing id 961', () => {
      expect(resolveStaticLocationId('incontent_5')).toBe(915);
      expect(resolveStaticLocationId('incontent_50')).toBe(960);
      expect(resolveStaticLocationId('incontent_51')).toBe(962);
      expect(resolveStaticLocationId('incontent_88')).toBe(999);
    });

    it('returns null for unknown or empty names', () => {
      expect(resolveStaticLocationId('not_a_real_location')).toBeNull();
      expect(resolveStaticLocationId('incontent_999')).toBeNull();
      expect(resolveStaticLocationId('')).toBeNull();
    });
  });

  describe('isKnownEzoicLocation', () => {
    it('recognises canonical names and aliases', () => {
      expect(isKnownEzoicLocation('under_first_paragraph')).toBe(true);
      expect(isKnownEzoicLocation('incontent_0')).toBe(true);
      expect(isKnownEzoicLocation('sidebar_floating')).toBe(true);
    });

    it('rejects unknown or empty names', () => {
      expect(isKnownEzoicLocation('nope')).toBe(false);
      expect(isKnownEzoicLocation('')).toBe(false);
    });
  });

  describe('map integrity', () => {
    it('covers 900-999 with id 961 intentionally absent (99 ids)', () => {
      const ids = Object.keys(EZOIC_LOCATION_BY_ID).map(Number);
      expect(ids).toHaveLength(99);
      expect(Math.min(...ids)).toBe(900);
      expect(Math.max(...ids)).toBe(999);
      expect(EZOIC_LOCATION_BY_ID[961]).toBeUndefined();
      for (const id of ids) {
        expect(id).toBeGreaterThanOrEqual(900);
        expect(id).toBeLessThanOrEqual(999);
      }
    });

    it('every alias target is a known location name', () => {
      const names = new Set(Object.values(EZOIC_LOCATION_BY_ID));
      for (const target of Object.values(EZOIC_LOCATION_ALIASES)) {
        expect(names.has(target)).toBe(true);
      }
    });
  });
});
