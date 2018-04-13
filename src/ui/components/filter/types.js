/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

export type Filter =
  | {
      key: string,
      value: string,
      type: 'include' | 'exclude',
    }
  | {
      key: string,
      value: Array<string>,
      type: 'enum',
      enum: Array<{
        label: string,
        color: string,
        value: string,
      }>,
      persistent?: boolean,
    };
