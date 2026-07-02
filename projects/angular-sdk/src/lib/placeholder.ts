/**
 * DOM id prefix Ezoic's `ezstandalone` runtime scans for when discovering ad
 * placeholders on the page. A display placeholder element must have the id
 * `ezoic-pub-ad-placeholder-<id>` and carry no styling of its own.
 *
 * @see https://docs.ezoic.com/docs/ezoicads/integration/
 */
export const EZOIC_PLACEHOLDER_ID_PREFIX = 'ezoic-pub-ad-placeholder-';

/** Smallest display-placeholder id the runtime scans for. */
export const MIN_PLACEHOLDER_ID = 1;

/**
 * Largest display-placeholder id the runtime scans for. Ids 900-999 are the
 * reserved zero-config semantic locations (e.g. `under_first_paragraph`).
 */
export const MAX_PLACEHOLDER_ID = 999;

/**
 * Returns `true` when `id` is a valid Ezoic display-placeholder id: an integer
 * in the inclusive range [1, 999].
 */
export function isValidPlaceholderId(id: number): boolean {
  return Number.isInteger(id) && id >= MIN_PLACEHOLDER_ID && id <= MAX_PLACEHOLDER_ID;
}

/**
 * Builds the DOM element id for an Ezoic display placeholder.
 *
 * @param id A valid placeholder id (integer 1-999).
 * @returns The element id string, e.g. `ezoic-pub-ad-placeholder-101`.
 * @throws RangeError when `id` is not a valid placeholder id.
 */
export function placeholderElementId(id: number): string {
  if (!isValidPlaceholderId(id)) {
    throw new RangeError(
      `Invalid Ezoic placeholder id: ${id}. Expected an integer between ${MIN_PLACEHOLDER_ID} and ${MAX_PLACEHOLDER_ID}.`,
    );
  }
  return `${EZOIC_PLACEHOLDER_ID_PREFIX}${id}`;
}
