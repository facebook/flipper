/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type DefaultKeyboardAction = 'clear' | 'goToBottom' | 'createPaste';
export type TopLevelMenu = 'Edit' | 'View' | 'Window' | 'Help';

export type MenuEntry = BuiltInMenuEntry | CustomMenuEntry;

export type NormalizedMenuEntry = {
  label: string;
  accelerator?: string;
  topLevelMenu: TopLevelMenu;
  handler: () => void;
  action: string;
};

export type CustomMenuEntry = {
  label: string;
  accelerator?: string;
  topLevelMenu: TopLevelMenu;
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
    topLevelMenu: 'View',
    action: 'clear',
  },
  goToBottom: {
    label: 'Go To Bottom',
    accelerator: 'CmdOrCtrl+B',
    topLevelMenu: 'View',
    action: 'goToBottom',
  },
  createPaste: {
    label: 'Create Paste',
    topLevelMenu: 'Edit',
    action: 'createPaste',
  },
} as const;

export function normalizeMenuEntry(entry: MenuEntry): NormalizedMenuEntry;
export function normalizeMenuEntry(entry: any): NormalizedMenuEntry {
  const builtInEntry:
    | NormalizedMenuEntry
    | undefined = (buildInMenuEntries as any)[entry.action];
  return builtInEntry
    ? {...builtInEntry, ...entry}
    : {
        ...entry,
        action: entry.action || entry.label,
      };
}
