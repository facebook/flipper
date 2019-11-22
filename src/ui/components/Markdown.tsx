/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {PureComponent, RefObject} from 'react';
import styled from 'react-emotion';
import ReactMarkdown from 'react-markdown';
import ReactDOM from 'react-dom';
import {colors} from './colors';
import {shell} from 'electron';

const Row = styled('div')({
  marginTop: 5,
  marginBottom: 5,
});
const Heading = styled('div')((props: {level: number}) => ({
  fontSize: Math.max(10, 20 - (props.level - 1) * 4),
  marginBottom: 10,
  fontWeight: 'bold',
}));
const ListItem = styled('li')({
  'list-style-type': 'circle',
  'list-style-position': 'inside',
  marginLeft: 10,
});
const Strong = styled('span')({
  fontWeight: 'bold',
});
const Emphasis = styled('span')({
  fontStyle: 'italic',
});
const Quote = styled(Row)({
  padding: 10,
  backgroundColor: '#f1f2f3',
});
const Code = styled('span')({
  fontFamily: '"Courier New", Courier, monospace',
  backgroundColor: '#f1f2f3',
});
const Pre = styled(Row)({
  padding: 10,
  backgroundColor: '#f1f2f3',
});
class CodeBlock extends PureComponent<{value: string; language: string}> {
  render() {
    return (
      <Pre>
        <Code>{this.props.value}</Code>
      </Pre>
    );
  }
}
const Link = styled('span')({
  color: colors.blue,
  textDecoration: 'underline',
});
class LinkReference extends PureComponent<{href: string}> {
  render() {
    return (
      <Link onClick={() => shell.openExternal(this.props.href)}>
        {this.props.children}
      </Link>
    );
  }
}

export function Markdown(props: {source: string}) {
  return (
    <ReactMarkdown
      source={props.source}
      renderers={{
        heading: Heading,
        listItem: ListItem,
        paragraph: Row,
        strong: Strong,
        emphasis: Emphasis,
        inlineCode: Code,
        code: CodeBlock,
        blockquote: Quote,
        link: LinkReference,
        linkReference: LinkReference,
      }}
    />
  );
}
