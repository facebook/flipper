/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {CSSProperties, ReactNode} from 'react';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import {getFlipperLib, theme} from 'flipper-plugin';

const Container = styled.div({
  padding: 10,
});
const Row = styled.div({
  marginTop: 5,
  marginBottom: 5,
  lineHeight: 1.34,
});
const Heading = styled.div({fontSize: 18, marginTop: 10, marginBottom: 10});
const SubHeading = styled.div({
  fontSize: 12,
  textTransform: 'uppercase',
  color: theme.textColorSecondary,
  marginTop: 10,
  marginBottom: 10,
  fontWeight: 'bold',
});
const ListItem = styled.li({
  listStyleType: 'circle',
  listStylePosition: 'inside',
  marginLeft: 10,
});
const Strong = styled.span({
  fontWeight: 'bold',
  color: theme.textColorPrimary,
});
const Emphasis = styled.span({
  fontStyle: 'italic',
});
const Quote = styled(Row)({
  padding: 10,
  backgroundColor: theme.backgroundWash,
  fontSize: 13,
});
const Code = styled.span({
  fontFamily: '"Courier New", Courier, monospace',
  backgroundColor: theme.backgroundWash,
});
const Pre = styled(Row)({
  padding: 10,
  backgroundColor: theme.backgroundWash,
});
function CodeBlock(props: {
  children: ReactNode[];
  className?: string;
  inline?: boolean;
}) {
  return props.inline ? (
    <Code>{props.children}</Code>
  ) : (
    <Pre>
      <Code>{props.children}</Code>
    </Pre>
  );
}
const Link = styled.span({
  color: theme.textColorActive,
});
function LinkReference(props: {href: string; children: Array<ReactNode>}) {
  return (
    <Link onClick={() => getFlipperLib().openLink(props.href)}>
      {props.children}
    </Link>
  );
}

export function Markdown(props: {source: string; style?: CSSProperties}) {
  return (
    <Container style={props.style}>
      <ReactMarkdown
        components={{
          h1: Heading,
          h2: SubHeading,
          h3: 'h2',
          li: ListItem,
          p: Row,
          strong: Strong,
          em: Emphasis,
          code: CodeBlock,
          blockquote: Quote,
          // @ts-ignore props missing href but existing run-time
          a: LinkReference,
        }}>
        {props.source}
      </ReactMarkdown>
    </Container>
  );
}
