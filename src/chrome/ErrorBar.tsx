/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {styled, colors} from 'flipper';
import React, {useState, memo} from 'react';
import {connect} from 'react-redux';
import {FlipperError, dismissError} from '../reducers/connections';
import {State as Store} from '../reducers/index';
import {ErrorBlock, ButtonGroup, Button} from 'flipper';
import {FlexColumn, FlexRow} from 'flipper';

type StateFromProps = {
  errors: FlipperError[];
};

type DispatchFromProps = {
  dismissError: typeof dismissError;
};

type Props = DispatchFromProps & StateFromProps;

const ErrorBar = memo(function ErrorBar(props: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!props.errors.length) {
    return null;
  }

  const errorCount = props.errors.reduce(
    (sum, error) => sum + (error.occurrences || 1),
    0,
  );

  return (
    <ErrorBarContainer>
      <ErrorRows className={collapsed ? 'collapsed' : ''}>
        {props.errors.map((error, index) => (
          <ErrorTile
            onDismiss={() => props.dismissError(index)}
            key={index}
            error={error}
          />
        ))}
      </ErrorRows>
      <DismissAllErrors
        onClick={() => setCollapsed(c => !c)}
        title="Show / hide errors">
        {collapsed ? `▼ ${errorCount}` : '▲'}
      </DismissAllErrors>
    </ErrorBarContainer>
  );
});

export default connect<StateFromProps, DispatchFromProps, {}, Store>(
  ({connections: {errors}}) => ({
    errors,
  }),
  {
    dismissError,
  },
)(ErrorBar);

function ErrorTile({
  onDismiss,
  error,
}: {
  onDismiss: () => void;
  error: FlipperError;
}) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <ErrorRow>
      <FlexRow>
        <FlexColumn style={{flexGrow: 1}}>{error.message}</FlexColumn>
        {error.occurrences! > 1 && (
          <ErrorCounter title="Nr of times this error occurred">
            {error.occurrences}
          </ErrorCounter>
        )}
        <FlexColumn style={{marginLeft: '8px'}}>
          <ButtonGroup>
            {(error.details || error.error) && (
              <Button onClick={() => setCollapsed(s => !s)}>
                {collapsed ? `▼ ` : '▲ '} Details
              </Button>
            )}
            <Button onClick={onDismiss}>Dismiss</Button>
          </ButtonGroup>
        </FlexColumn>
      </FlexRow>
      {!collapsed && (
        <FlexRow>
          <ErrorDetails>
            {error.details}
            {error.error && <ErrorBlock error={error.error} />}
          </ErrorDetails>
        </FlexRow>
      )}
    </ErrorRow>
  );
}

const ErrorBarContainer = styled('div')({
  boxShadow: '2px 2px 2px #ccc',
  userSelect: 'text',
});

const DismissAllErrors = styled('div')({
  boxShadow: '2px 2px 2px #ccc',
  backgroundColor: colors.cherryDark3,
  color: '#fff',
  textAlign: 'center',
  borderBottomLeftRadius: '4px',
  borderBottomRightRadius: '4px',
  position: 'absolute',
  width: '48px',
  height: '16px',
  zIndex: 2,
  right: '20px',
  fontSize: '6pt',
  lineHeight: '16px',
  cursor: 'pointer',
  alignItems: 'center',
});

const ErrorDetails = styled('div')({
  width: '100%',
  marginTop: 4,
});

const ErrorRows = styled('div')({
  backgroundColor: colors.cherry,
  color: '#fff',
  maxHeight: '600px',
  overflowY: 'auto',
  overflowX: 'hidden',
  transition: 'max-height 0.3s ease',
  '&.collapsed': {
    maxHeight: '0px',
  },
});

const ErrorRow = styled('div')({
  padding: '4px 12px',
  borderBottom: '1px solid ' + colors.cherryDark3,
  verticalAlign: 'middle',
  lineHeight: '28px',
});

const ErrorCounter = styled(FlexColumn)({
  backgroundColor: colors.cherryDark3,
  color: colors.cherry,
  width: 24,
  height: 24,
  borderRadius: 24,
  marginTop: 2,
  lineHeight: '24px',
  textAlign: 'center',
});
