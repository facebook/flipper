/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {PureComponent, CSSProperties} from 'react';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import {colors} from './colors';
import {shell} from 'electron';

const Container = styled.div({
  padding: 10,
});
const Row = styled.div({
  marginTop: 5,
  marginBottom: 5,
  lineHeight: 1.34,
});
const Heading = styled.div<{level: number}>((props) => ({
  fontSize: props.level === 1 ? 18 : 12,
  textTransform: props.level > 1 ? 'uppercase' : undefined,
  color: props.level > 1 ? '#90949c' : undefined,
  marginTop: 10,
  marginBottom: 10,
  fontWeight: props.level > 1 ? 'bold' : 'normal',
}));
const ListItem = styled.li({
  listStyleType: 'circle',
  listStylePosition: 'inside',
  marginLeft: 10,
});
const Strong = styled.span({
  fontWeight: 'bold',
  color: '#1d2129',
});
const Emphasis = styled.span({
  fontStyle: 'italic',
});
const Quote = styled(Row)({
  padding: 10,
  backgroundColor: '#f1f2f3',
  fontSize: 13,
});
const Code = styled.span({
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
const Link = styled.span({
  color: colors.blue,
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

export function Markdown(props: {source: string; style?: CSSProperties}) {
  return (
    <Container style={props.style}>
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
    </Container>
  );
}
