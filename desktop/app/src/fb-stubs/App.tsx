/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {useState, useEffect} from 'react';
import FlipperApp from '../App';
import WarningEmployee from '../chrome/WarningEmployee';
import fbConfig from '../fb-stubs/config';
import {isFBEmployee} from '../utils/fbEmployee';
import {Logger} from '../fb-interfaces/Logger';
import isSandyEnabled from '../utils/isSandyEnabled';
import {SandyApp} from '../sandy-chrome/SandyApp';

type Props = {logger: Logger};

export default function App(props: Props) {
  const [warnEmployee, setWarnEmployee] = useState(false);
  useEffect(() => {
    if (fbConfig.warnFBEmployees) {
      isFBEmployee().then((isEmployee) => {
        setWarnEmployee(isEmployee);
      });
    }
  }, []);
  return warnEmployee ? (
    <WarningEmployee
      onClick={() => {
        setWarnEmployee(false);
      }}
    />
  ) : isSandyEnabled() ? (
    <SandyApp />
  ) : (
    <FlipperApp logger={props.logger} />
  );
}
