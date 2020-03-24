/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {styled, colors, Glyph} from 'flipper';
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
  const [collapsed, setCollapsed] = useState(true);

  if (!props.errors.length) {
    return null;
  }

  const errorCount = props.errors.reduce(
    (sum, error) => sum + (error.occurrences || 1),
    0,
  );

  const urgentErrors = props.errors.filter((e) => e.urgent);

  return (
    <ErrorBarContainer>
      <ErrorRows
        className={collapsed && urgentErrors.length === 0 ? 'collapsed' : ''}>
        {(collapsed ? urgentErrors : props.errors).map((error, index) => (
          <ErrorTile
            onDismiss={() => props.dismissError(index)}
            key={index}
            error={error}
          />
        ))}
      </ErrorRows>
      <DismissAllErrors
        onClick={() => setCollapsed((c) => !c)}
        title="Show / hide errors">
        <Glyph
          color={colors.white}
          size={8}
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          style={{marginRight: 4}}
        />
        {collapsed && errorCount}
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
    <ErrorRow className={`${error.urgent ? 'urgent' : ''}`}>
      <FlexRow style={{flexDirection: 'row-reverse'}}>
        <ButtonSection>
          <ButtonGroup>
            {(error.details || error.error) && (
              <Button
                onClick={() => setCollapsed((s) => !s)}
                icon={collapsed ? `chevron-down` : 'chevron-up'}
                iconSize={12}
              />
            )}
            <Button onClick={onDismiss} icon="cross-circle" iconSize={12} />
          </ButtonGroup>
        </ButtonSection>
        {error.occurrences! > 1 && (
          <ErrorCounter title="Nr of times this error occurred">
            {error.occurrences}
          </ErrorCounter>
        )}
        <FlexColumn
          style={
            collapsed
              ? {overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1}
              : {flexGrow: 1}
          }
          title={error.message}>
          {error.message}
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

const ErrorBarContainer = styled.div({
  boxShadow: '2px 2px 2px #ccc',
  userSelect: 'text',
});

const DismissAllErrors = styled.div({
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

const ErrorDetails = styled.div({
  width: '100%',
  marginTop: 4,
});

const ErrorRows = styled.div({
  color: '#fff',
  maxHeight: '600px',
  overflowY: 'auto',
  overflowX: 'hidden',
  transition: 'max-height 0.3s ease',
  borderBottom: '1px solid #b3b3b3',
  '&.collapsed': {
    maxHeight: '0px',
    borderBottom: 'none',
  },
});

const ErrorRow = styled.div({
  padding: '4px 12px',
  verticalAlign: 'middle',
  lineHeight: '28px',
  backgroundColor: colors.yellowTint,
  color: colors.yellow,
  '&.urgent': {
    backgroundColor: colors.redTint,
    color: colors.red,
  },
});

const ButtonSection = styled(FlexColumn)({
  marginLeft: '8px',
  flexShrink: 0,
  flexGrow: 0,
});

const ErrorCounter = styled(FlexColumn)({
  border: `1px solid ${colors.light20}`,
  color: colors.light20,
  width: 20,
  height: 20,
  borderRadius: 20,
  marginTop: 4,
  lineHeight: '18px',
  textAlign: 'center',
  flexShrink: 0,
  flexGrow: 0,
  marginLeft: '8px',
  fontSize: '10px',
});
