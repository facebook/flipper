/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Button, Modal} from 'antd';
import {Layout} from 'flipper-plugin';
import {getInstance as getFormInstance} from '../../../fb-stubs/Logger';
import {useDispatch} from '../../../utils/useStore';
import {setStaticView} from '../../../reducers/connections';
import SupportRequestFormV2 from '../../../fb-stubs/SupportRequestFormV2';

export function GuideEndScreen(props: {
  showModal: boolean;
  toggleModal: (arg0: boolean) => void;
}) {
  const dispatch = useDispatch();
  const problemSolved = () => {
    props.toggleModal(false);
  };
  const loadForm = () => {
    getFormInstance().track('usage', 'support-form-source', {
      source: 'sidebar',
      group: undefined,
    });
    dispatch(setStaticView(SupportRequestFormV2));
    problemSolved();
  };

  return (
    <Modal
      title="Has your problem been solved OR do you want to file a support request?"
      visible={props.showModal}
      width={650}
      footer={null}
      onCancel={() => props.toggleModal(false)}
      bodyStyle={{maxHeight: 800, overflow: 'auto'}}>
      <Layout.Horizontal gap="huge">
        <Button
          type="primary"
          style={{flex: 1, marginBottom: 18}}
          onClick={problemSolved}>
          Problem Solved
        </Button>
      </Layout.Horizontal>
      <Layout.Horizontal gap="huge">
        <Button type="primary" style={{flex: 1}} onClick={loadForm}>
          File Support Request
        </Button>
      </Layout.Horizontal>
    </Modal>
  );
}
