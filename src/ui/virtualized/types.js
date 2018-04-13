/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

export type OnScroll = (params: {
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
}) => void;

export type KeyMapper = (index: number) => string;

export type RowRenderer = (params: {
  index: number,
  style: Object,
}) => React$Node;
