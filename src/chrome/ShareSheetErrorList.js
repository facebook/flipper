/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {PureComponent, FlexColumn, Text, styled} from 'flipper';

type Props = {|
  errors: Array<Error>,
|};

const ErrorMessage = styled(Text)({
  display: 'block',
  marginTop: 6,
  wordBreak: 'break-all',
  whiteSpace: 'pre-line',
  lineHeight: 1.35,
});

const Padder = styled('div')(
  ({paddingLeft, paddingRight, paddingBottom, paddingTop}) => ({
    paddingLeft: paddingLeft || 0,
    paddingRight: paddingRight || 0,
    paddingBottom: paddingBottom || 0,
    paddingTop: paddingTop || 0,
  }),
);

const Title = styled(Text)({
  marginBottom: 6,
});

export function formatError(e: Error): string {
  const estr = e.toString();

  if (estr === '[object Object]') {
    try {
      return JSON.stringify(e);
    } catch (e) {
      return '<unrepresentable error>';
    }
  }

  return estr;
}

export default class Popover extends PureComponent<Props> {
  render() {
    if (this.props.errors.length === 0) {
      return null;
    }
    return (
      <>
        <Padder paddingBottom={8}>
          <FlexColumn>
            <Title bold>
              The following errors occurred while exporting your data
            </Title>
            {this.props.errors.map((e: Error) => (
              <ErrorMessage code>{formatError(e)}</ErrorMessage>
            ))}
          </FlexColumn>
        </Padder>
      </>
    );
  }
}
