import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EZOIC_SDK_VERSION } from './version';

describe('EZOIC_SDK_VERSION', () => {
  it('is a semantic version string', () => {
    expect(EZOIC_SDK_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  it('matches the library package manifest version', () => {
    const manifestPath = join(__dirname, '..', '..', 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version: string };
    expect(EZOIC_SDK_VERSION).toBe(manifest.version);
  });
});
