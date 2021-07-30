/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Modal, Button, Alert, Input, Typography} from 'antd';
import {Layout} from 'flipper-plugin';
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
  onHide: () => void;
  onSubmit: (uri: URI) => void;
};

export function RequiredParametersDialog(props: Props) {
  const {onHide, onSubmit, uri, requiredParameters} = props;
  const {isValid, values, setValuesArray} =
    useRequiredParameterFormValidator(requiredParameters);
  return (
    <Modal
      visible
      onCancel={onHide}
      title="Provide bookmark details"
      footer={
        <>
          <Button
            onClick={() => {
              onHide();
              setValuesArray([]);
            }}>
            Cancel
          </Button>
          <Button
            type={'primary'}
            onClick={() => {
              onSubmit(replaceRequiredParametersWithValues(uri, values));
              onHide();
            }}
            disabled={!isValid}>
            Submit
          </Button>
        </>
      }>
      <Layout.Container gap>
        <Alert
          type="info"
          message="This uri has required parameters denoted by '{parameter}'}."
        />

        {requiredParameters.map((paramater, idx) => (
          <div key={idx}>
            <Input
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
              <Alert type="error" message="Parameter must be a number" />
            ) : null}
            {values[idx] &&
            parameterIsBooleanType(paramater) &&
            !validateParameter(values[idx], paramater) ? (
              <Alert
                type="error"
                message="Parameter must be either 'true' or 'false'"
              />
            ) : null}
          </div>
        ))}
        <Typography.Text code>{liveEdit(uri, values)}</Typography.Text>
      </Layout.Container>
    </Modal>
  );
}
