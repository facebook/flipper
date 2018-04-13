/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const invariant = require('invariant');

function makeStyleTag(): HTMLStyleElement {
  const tag = document.createElement('style');
  tag.type = 'text/css';
  tag.appendChild(document.createTextNode(''));

  const {head} = document;
  invariant(head, 'expected head');
  head.appendChild(tag);

  return tag;
}

export class StyleSheet {
  constructor(isSpeedy?: boolean) {
    this.injected = false;
    this.isSpeedy = Boolean(isSpeedy);

    this.flush();
    this.inject();
  }

  ruleIndexes: Array<string>;
  injected: boolean;
  isSpeedy: boolean;
  tag: HTMLStyleElement;

  getRuleCount(): number {
    return this.ruleIndexes.length;
  }

  flush() {
    this.ruleIndexes = [];
    if (this.tag) {
      this.tag.innerHTML = '';
    }
  }

  inject() {
    if (this.injected) {
      throw new Error('already injected stylesheet!');
    }

    this.tag = makeStyleTag();
    this.injected = true;
  }

  delete(key: string) {
    const index = this.ruleIndexes.indexOf(key);
    if (index < 0) {
      // TODO maybe error
      return;
    }

    this.ruleIndexes.splice(index, 1);

    const tag = this.tag;
    if (this.isSpeedy) {
      const sheet = tag.sheet;
      invariant(sheet, 'expected sheet');

      // $FlowFixMe: sheet is actually CSSStylesheet
      sheet.deleteRule(index);
    } else {
      tag.removeChild(tag.childNodes[index + 1]);
    }
  }

  insert(key: string, rule: string) {
    const tag = this.tag;

    if (this.isSpeedy) {
      const sheet = tag.sheet;
      invariant(sheet, 'expected sheet');

      // $FlowFixMe: sheet is actually CSSStylesheet
      sheet.insertRule(rule, sheet.cssRules.length);
    } else {
      tag.appendChild(document.createTextNode(rule));
    }

    this.ruleIndexes.push(key);
  }
}
