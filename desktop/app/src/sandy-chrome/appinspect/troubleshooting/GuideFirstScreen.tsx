/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import {Modal, Typography, Radio, Space, Button, RadioChangeEvent} from 'antd';
import {Layout} from 'flipper-plugin';
import {ModalDialog} from '../fb/TroubleshootingGuide';

const {Text} = Typography;

export function GuideFirstScreen(props: {
  toggleModal: (showModal: ModalDialog) => void;
  onAnswer: (
    answer: string,
    toggleModal: (showModal: ModalDialog) => void,
  ) => void;
}) {
  const [answer, setAnswer] = useState('');
  const handleChange = (e: RadioChangeEvent) => {
    setAnswer(e.target.value);
  };

  return (
    <Modal
      title="Troubleshooting Guide"
      visible
      width={650}
      footer={null}
      onCancel={() => props.toggleModal('next')}
      bodyStyle={{maxHeight: 800, overflow: 'auto'}}>
      <Layout.Container gap="huge">
        <Text>What problem are you facing?</Text>
        <Radio.Group onChange={handleChange}>
          <Space direction="vertical">
            <Radio value={'cannot_see_device'}>
              <Text>Can't see the device.</Text>
            </Radio>
            <Radio value={'cannot_see_app'}>
              <Text>Can see the device but not the app.</Text>
            </Radio>
            <Radio value={'cannot_see_plugin'}>
              <Text>Can see the device and the app but not the plugin.</Text>
            </Radio>
          </Space>
        </Radio.Group>
        <Button
          type="primary"
          style={{flex: 0.1, marginLeft: 500}}
          onClick={() => props.onAnswer(answer, props.toggleModal)}>
          Next
        </Button>
      </Layout.Container>
    </Modal>
  );
}
