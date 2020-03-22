/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  hasNewChangesToShow,
  getRecentChangelog,
  markChangelogRead,
} from '../ChangelogSheet';

class StubStorage {
  data: Record<string, string> = {};

  setItem(key: string, value: string) {
    this.data[key] = value;
  }

  getItem(key: string) {
    return this.data[key];
  }
}

const changelog = `

# Version 2.0

* Nice feature one
* Important fix

# Version 1.0

* Not very exciting actually

`;

describe('ChangelogSheet', () => {
  let storage!: Storage;

  beforeEach(() => {
    storage = new StubStorage() as any;
  });

  test('without storage, should show changes', () => {
    expect(hasNewChangesToShow(undefined, changelog)).toBe(false);
    expect(getRecentChangelog(storage, changelog)).toEqual(changelog.trim());
    expect(hasNewChangesToShow(storage, changelog)).toBe(true);
  });

  test('with last header, should not show changes', () => {
    markChangelogRead(storage, changelog);
    expect(storage.data).toMatchInlineSnapshot(`
      Object {
        "FlipperChangelogStatus": "{\\"lastHeader\\":\\"# Version 2.0\\"}",
      }
    `);
    expect(hasNewChangesToShow(storage, changelog)).toBe(false);

    const newChangelog = `
# Version 3.0

* Cool!

# Version 2.5

* This is visible as well

${changelog}
`;

    expect(hasNewChangesToShow(storage, newChangelog)).toBe(true);
    expect(getRecentChangelog(storage, newChangelog)).toMatchInlineSnapshot(`
"# Version 3.0

* Cool!

# Version 2.5

* This is visible as well"
`);
    markChangelogRead(storage, newChangelog);
    expect(storage.data).toMatchInlineSnapshot(`
      Object {
        "FlipperChangelogStatus": "{\\"lastHeader\\":\\"# Version 3.0\\"}",
      }
    `);
    expect(hasNewChangesToShow(storage, newChangelog)).toBe(false);
  });
});
