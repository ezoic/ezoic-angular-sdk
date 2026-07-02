/**
 * Reserved semantic ("zero-config") placeholder locations.
 *
 * Instead of hand-assigning a numeric placeholder id, a publisher can place an
 * ad by intent — `"under_first_paragraph"`, `"mid_content"`, `"top_of_page"` —
 * and let the SDK resolve that name to a fixed placeholder id in the reserved
 * 900-999 range that the Ezoic runtime scans for.
 *
 * When the runtime has loaded it resolves names itself (DOM-aware, via
 * `ezstandalone.GetGeneratedIdAsync`); the map below is the SDK's static
 * fallback for names resolved before the runtime is available. It is
 * DOM-unaware: it always returns the canonical id for a location name.
 *
 * @see https://docs.ezoic.com/docs/ezoicads/integration/
 */

/**
 * Canonical id -> semantic location name for the reserved 900-999 range.
 *
 * A few names are intentionally shared by several ids (e.g. the three
 * `sidebar_middle` slots); resolution returns the lowest id bound to a name.
 * Note the range is not fully contiguous — id 961 is intentionally not a
 * placement id (960 is `incontent_50`, 962 is `incontent_51`).
 */
export const EZOIC_LOCATION_BY_ID: Readonly<Record<number, string>> = {
  900: 'top_of_page',
  901: 'under_page_title',
  902: 'bottom_of_page',
  903: 'sidebar',
  904: 'sidebar_middle',
  905: 'sidebar_middle',
  906: 'sidebar_middle',
  907: 'sidebar_bottom',
  908: 'sidebar_floating_1',
  909: 'under_first_paragraph',
  910: 'under_second_paragraph',
  911: 'mid_content',
  912: 'long_content',
  913: 'longer_content',
  914: 'longest_content',
  915: 'incontent_5',
  916: 'incontent_6',
  917: 'incontent_7',
  918: 'incontent_8',
  919: 'incontent_9',
  920: 'incontent_10',
  921: 'incontent_11',
  922: 'incontent_12',
  923: 'incontent_13',
  924: 'incontent_14',
  925: 'incontent_15',
  926: 'incontent_16',
  927: 'incontent_17',
  928: 'incontent_18',
  929: 'incontent_19',
  930: 'incontent_20',
  931: 'incontent_21',
  932: 'incontent_22',
  933: 'incontent_23',
  934: 'incontent_24',
  935: 'incontent_25',
  936: 'incontent_26',
  937: 'incontent_27',
  938: 'incontent_28',
  939: 'incontent_29',
  940: 'incontent_30',
  941: 'incontent_31',
  942: 'incontent_32',
  943: 'incontent_33',
  944: 'incontent_34',
  945: 'incontent_35',
  946: 'incontent_36',
  947: 'incontent_37',
  948: 'incontent_38',
  949: 'incontent_39',
  950: 'incontent_40',
  951: 'incontent_41',
  952: 'incontent_42',
  953: 'incontent_43',
  954: 'incontent_44',
  955: 'incontent_45',
  956: 'incontent_46',
  957: 'incontent_47',
  958: 'incontent_48',
  959: 'incontent_49',
  960: 'incontent_50',
  962: 'incontent_51',
  963: 'incontent_52',
  964: 'incontent_53',
  965: 'incontent_54',
  966: 'incontent_55',
  967: 'incontent_56',
  968: 'incontent_57',
  969: 'incontent_58',
  970: 'incontent_59',
  971: 'incontent_60',
  972: 'incontent_61',
  973: 'incontent_62',
  974: 'incontent_63',
  975: 'incontent_64',
  976: 'incontent_65',
  977: 'incontent_66',
  978: 'incontent_67',
  979: 'incontent_68',
  980: 'incontent_69',
  981: 'incontent_70',
  982: 'incontent_71',
  983: 'incontent_72',
  984: 'incontent_73',
  985: 'incontent_74',
  986: 'incontent_75',
  987: 'incontent_76',
  988: 'incontent_77',
  989: 'incontent_78',
  990: 'incontent_79',
  991: 'incontent_80',
  992: 'incontent_81',
  993: 'incontent_82',
  994: 'incontent_83',
  995: 'incontent_84',
  996: 'incontent_85',
  997: 'incontent_86',
  998: 'incontent_87',
  999: 'incontent_88',
};

/**
 * Location-name aliases. An alias resolves to its target name before an id is
 * looked up, so `"incontent_0"` behaves as `"under_second_paragraph"`.
 */
export const EZOIC_LOCATION_ALIASES: Readonly<Record<string, string>> = {
  incontent_0: 'under_second_paragraph',
  incontent_1: 'mid_content',
  incontent_2: 'long_content',
  incontent_3: 'longer_content',
  incontent_4: 'longest_content',
  sidebar_floating: 'sidebar_floating_1',
  sidebar_floating_2: 'sidebar_middle',
  sidebar_floating_3: 'sidebar_bottom',
};

/** location name -> lowest id bound to it (built once from {@link EZOIC_LOCATION_BY_ID}). */
const ID_BY_LOCATION: ReadonlyMap<string, number> = (() => {
  const byLocation = new Map<string, number>();
  const ids = Object.keys(EZOIC_LOCATION_BY_ID)
    .map(Number)
    .sort((a, b) => a - b);
  for (const id of ids) {
    const name = EZOIC_LOCATION_BY_ID[id];
    if (!byLocation.has(name)) {
      byLocation.set(name, id);
    }
  }
  return byLocation;
})();

/**
 * Resolves a semantic location name to its canonical placeholder id using the
 * static map — the SDK's fallback for when the Ezoic runtime is not yet loaded.
 *
 * Aliases are resolved first; a name bound to several ids resolves to the
 * lowest one, matching the runtime's own precise-match order. This is
 * DOM-unaware (unlike the runtime, it never skips an id that is already on the
 * page).
 *
 * @param location A semantic location name or alias.
 * @returns The placeholder id (900-999), or `null` when the name is unknown.
 */
export function resolveStaticLocationId(location: string): number | null {
  if (!location) {
    return null;
  }
  const name = EZOIC_LOCATION_ALIASES[location] ?? location;
  return ID_BY_LOCATION.get(name) ?? null;
}

/** Returns `true` when `location` is a known semantic location name or alias. */
export function isKnownEzoicLocation(location: string): boolean {
  if (!location) {
    return false;
  }
  const name = EZOIC_LOCATION_ALIASES[location] ?? location;
  return ID_BY_LOCATION.has(name);
}
