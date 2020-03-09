/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, FlexColumn, Input, Sheet, styled, Glyph, colors} from 'flipper';
import {
  replaceRequiredParametersWithValues,
  parameterIsNumberType,
  parameterIsBooleanType,
  validateParameter,
  liveEdit,
} from '../util/uri';
import {useRequiredParameterFormValidator} from '../hooks/requiredParameters';
import React from 'react';

import {URI} from '../types';

type Props = {
  uri: string;
  requiredParameters: Array<string>;
  shouldShow: boolean;
  onHide?: () => void;
  onSubmit: (uri: URI) => void;
};

const Container = styled(FlexColumn)({
  padding: 10,
  width: 600,
});

const Title = styled.span({
  display: 'flex',
  marginTop: 8,
  marginLeft: 2,
  marginBottom: 8,
});

const Text = styled.span({
  lineHeight: 1.3,
});

const ErrorLabel = styled.span({
  color: colors.yellow,
  lineHeight: 1.4,
});

const URIContainer = styled.div({
  lineHeight: 1.3,
  marginLeft: 2,
  marginBottom: 8,
  marginTop: 10,
  overflowWrap: 'break-word',
});

const ButtonContainer = styled.div({
  marginLeft: 'auto',
});

const RequiredParameterInput = styled(Input)({
  margin: 0,
  marginTop: 8,
  height: 30,
  width: '100%',
});

const WarningIconContainer = styled.span({
  marginRight: 8,
});

export default (props: Props) => {
  const {shouldShow, onHide, onSubmit, uri, requiredParameters} = props;
  const {isValid, values, setValuesArray} = useRequiredParameterFormValidator(
    requiredParameters,
  );
  if (uri == null || !shouldShow) {
    return null;
  } else {
    return (
      <Sheet onHideSheet={onHide}>
        {(hide: () => void) => {
          return (
            <Container>
              <Title>
                <WarningIconContainer>
                  <Glyph
                    name="caution-triangle"
                    size={16}
                    variant="filled"
                    color={colors.yellow}
                  />
                </WarningIconContainer>
                <Text>
                  This uri has required parameters denoted by {'{parameter}'}.
                </Text>
              </Title>
              {requiredParameters.map((paramater, idx) => (
                <div key={idx}>
                  <RequiredParameterInput
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setValuesArray([
                        ...values.slice(0, idx),
                        event.target.value,
                        ...values.slice(idx + 1),
                      ])
                    }
                    name={paramater}
                    placeholder={paramater}
                  />
                  {values[idx] &&
                  parameterIsNumberType(paramater) &&
                  !validateParameter(values[idx], paramater) ? (
                    <ErrorLabel>Parameter must be a number</ErrorLabel>
                  ) : null}
                  {values[idx] &&
                  parameterIsBooleanType(paramater) &&
                  !validateParameter(values[idx], paramater) ? (
                    <ErrorLabel>
                      Parameter must be either 'true' or 'false'
                    </ErrorLabel>
                  ) : null}
                </div>
              ))}
              <URIContainer>{liveEdit(uri, values)}</URIContainer>
              <ButtonContainer>
                <Button
                  onClick={() => {
                    if (onHide != null) {
                      onHide();
                    }
                    setValuesArray([]);
                    hide();
                  }}
                  compact
                  padded>
                  Cancel
                </Button>
                <Button
                  type={isValid ? 'primary' : undefined}
                  onClick={() => {
                    onSubmit(replaceRequiredParametersWithValues(uri, values));
                    if (onHide != null) {
                      onHide();
                    }
                    setValuesArray([]);
                    hide();
                  }}
                  disabled={!isValid}
                  compact
                  padded>
                  Submit
                </Button>
              </ButtonContainer>
            </Container>
          );
        }}
      </Sheet>
    );
  }
};
