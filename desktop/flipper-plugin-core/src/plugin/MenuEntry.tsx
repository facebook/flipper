/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type MenuEntry = BuiltInMenuEntry | CustomMenuEntry;
export type DefaultKeyboardAction = keyof typeof buildInMenuEntries;

export type NormalizedMenuEntry = {
  label: string;
  accelerator?: string;
  handler: () => void;
  action: string;
};

export type CustomMenuEntry = {
  label: string;
  accelerator?: string;
  handler: () => void;
};

export type BuiltInMenuEntry = {
  action: keyof typeof buildInMenuEntries;
  handler: () => void;
};

export const buildInMenuEntries = {
  clear: {
    label: 'Clear',
    accelerator: 'CmdOrCtrl+K',
    action: 'clear',
  },
  goToBottom: {
    label: 'Go To Bottom',
    accelerator: 'CmdOrCtrl+B',
    action: 'goToBottom',
  },
  createPaste: {
    label: 'Create Paste',
    action: 'createPaste',
  },
} as const;

export function normalizeMenuEntry(entry: MenuEntry): NormalizedMenuEntry;
export function normalizeMenuEntry(entry: any): NormalizedMenuEntry {
  const builtInEntry: NormalizedMenuEntry | undefined = (
    buildInMenuEntries as any
  )[entry.action];
  return builtInEntry
    ? {...builtInEntry, ...entry}
    : {
        ...entry,
        action: entry.action || entry.label,
      };
}
