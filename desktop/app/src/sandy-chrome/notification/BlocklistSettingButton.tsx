/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import {Layout, theme} from 'flipper-plugin';
import {Button, Typography, Tag, Modal} from 'antd';
import {SettingOutlined} from '@ant-design/icons';

const {Title, Text} = Typography;

export default function BlocklistSettingButton(props: {
  blocklistedPlugins: Array<string>;
  blocklistedCategories: Array<string>;
  onRemovePlugin: (pluginId: string) => void;
  onRemoveCategory: (category: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        onClick={() => setShowModal(true)}
      />
      <Modal
        title="Notification Setting"
        visible={showModal}
        width={650}
        footer={null}
        onCancel={() => setShowModal(false)}>
        <Layout.Container gap="small">
          <Layout.Container key="blocklisted_plugins" gap="small">
            <Title level={4}>Blocklisted Plugins</Title>
            {props.blocklistedPlugins.length > 0 ? (
              <div>
                {props.blocklistedPlugins.map((pluginId) => (
                  <Tag
                    key={pluginId}
                    closable
                    onClose={() => props.onRemovePlugin(pluginId)}>
                    <Text style={{fontSize: theme.fontSize.smallBody}} ellipsis>
                      {pluginId}
                    </Text>
                  </Tag>
                ))}
              </div>
            ) : (
              <Text
                style={{
                  fontSize: theme.fontSize.smallBody,
                  color: theme.textColorSecondary,
                }}>
                No Blocklisted Plugin
              </Text>
            )}
          </Layout.Container>
          <Layout.Container key="blocklisted_categories" gap="small">
            <Title level={4}>Blocklisted Categories</Title>
            {props.blocklistedCategories.length > 0 ? (
              <div>
                {props.blocklistedCategories.map((category) => (
                  <Tag
                    key={category}
                    closable
                    onClose={() => props.onRemoveCategory(category)}>
                    <Text style={{fontSize: theme.fontSize.smallBody}} ellipsis>
                      {category}
                    </Text>
                  </Tag>
                ))}
              </div>
            ) : (
              <Text
                style={{
                  fontSize: theme.fontSize.smallBody,
                  color: theme.textColorSecondary,
                }}>
                No Blocklisted Category
              </Text>
            )}
          </Layout.Container>
        </Layout.Container>
      </Modal>
    </>
  );
}
