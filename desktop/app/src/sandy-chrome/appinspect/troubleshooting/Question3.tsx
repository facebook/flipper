/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Modal} from 'antd';
import {ModalDialog} from '../fb/TroubleshootingGuide';

export function Question3(props: {
  toggleModal: (showModal: ModalDialog) => void;
}) {
  return (
    <Modal
      title="Work in progress Q3 !"
      visible
      width={650}
      footer={null}
      onCancel={() => props.toggleModal('next')}
      bodyStyle={{maxHeight: 800, overflow: 'auto'}}></Modal>
  );
}
