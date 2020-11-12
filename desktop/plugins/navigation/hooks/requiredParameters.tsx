/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useMemo, useState} from 'react';
import {validateParameter} from '../util/uri';

export const useRequiredParameterFormValidator = (
  requiredParameters: Array<string>,
) => {
  const [values, setValuesArray] = useState<Array<string>>(
    requiredParameters.map(() => ''),
  );
  const isValid = useMemo(() => {
    if (requiredParameters.length != values.length) {
      setValuesArray(requiredParameters.map(() => ''));
    }
    if (
      values.every((value, idx) =>
        validateParameter(value, requiredParameters[idx]),
      )
    ) {
      return true;
    } else {
      return false;
    }
  }, [requiredParameters, values]);
  return {isValid, values, setValuesArray};
};
