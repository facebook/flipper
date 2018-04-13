/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import {StyleSheet} from '../sheet.js';

describe('flush', () => {
  test('should remove all rules', () => {
    const sheet = new StyleSheet();
    expect(sheet.getRuleCount()).toBe(0);

    sheet.insert('foo', 'div {color: red;}');
    expect(sheet.getRuleCount()).toBe(1);

    sheet.flush();
    expect(sheet.getRuleCount()).toBe(0);
  });
});

describe('inject', () => {
  test("throw's an error when already injected", () => {
    const sheet = new StyleSheet();

    expect(() => {
      sheet.inject();
      sheet.inject();
    }).toThrow('already injected stylesheet!');
  });
});

describe('insert', () => {
  test('non-speedy', () => {
    const sheet = new StyleSheet();

    expect(sheet.getRuleCount()).toBe(0);
    sheet.insert('foo', 'div {color: red;}');
    expect(sheet.getRuleCount()).toBe(1);
  });

  test('speedy', () => {
    const sheet = new StyleSheet(true);

    expect(sheet.getRuleCount()).toBe(0);
    sheet.insert('foo', 'div {color: red;}');
    expect(sheet.getRuleCount()).toBe(1);
  });
});

describe('delete', () => {
  test('non-speedy', () => {
    const sheet = new StyleSheet();

    expect(sheet.getRuleCount()).toBe(0);
    sheet.insert('foo', 'div {color: red;}');
    expect(sheet.getRuleCount()).toBe(1);

    sheet.delete('foo');
    expect(sheet.getRuleCount()).toBe(0);
  });

  test('speedy', () => {
    const sheet = new StyleSheet(true);

    expect(sheet.getRuleCount()).toBe(0);
    sheet.insert('foo', 'div {color: red;}');
    expect(sheet.getRuleCount()).toBe(1);

    sheet.delete('foo');
    expect(sheet.getRuleCount()).toBe(0);
  });
});
