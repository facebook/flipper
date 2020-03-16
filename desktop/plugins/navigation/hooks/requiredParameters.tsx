/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useEffect, useState} from 'react';
import {validateParameter} from '../util/uri';

export const useRequiredParameterFormValidator = (
  requiredParameters: Array<string>,
) => {
  const [values, setValuesArray] = useState<Array<string>>(
    requiredParameters.map(() => ''),
  );
  const [isValid, setIsValid] = useState(false);
  useEffect(() => {
    if (requiredParameters.length != values.length) {
      setValuesArray(requiredParameters.map(() => ''));
    }
    if (
      values.every((value, idx) =>
        validateParameter(value, requiredParameters[idx]),
      )
    ) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  });
  return {isValid, values, setValuesArray};
};
