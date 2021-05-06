/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useContext, useState} from 'react';
import {
  NetworkRouteContext,
  NetworkRouteManager,
  Route,
} from './NetworkRouteManager';
import {RequestId} from '../types';
import {Button, Input, Select} from 'antd';
import {Layout, produce, Tabs, Tab, theme} from 'flipper-plugin';
import {CloseCircleOutlined, WarningOutlined} from '@ant-design/icons';

type Props = {
  id: RequestId;
  route: Route;
  isDuplicated: boolean;
};

function HeaderInput(props: {
  initialValue: string;
  onUpdate: (newValue: string) => void;
  style?: React.CSSProperties;
}) {
  const [value, setValue] = useState(props.initialValue);
  return (
    <Input
      type="text"
      placeholder="Name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => props.onUpdate(value)}
      style={props.style}
    />
  );
}

function ResponseHeaders({
  routeId,
  route,
  networkRouteManager,
}: {
  routeId: string;
  route: Route;
  networkRouteManager: NetworkRouteManager;
}) {
  return (
    <Layout.Container gap style={{paddingRight: theme.space.small}}>
      {Object.entries(route.responseHeaders).map(([id, header]) => (
        <Layout.Horizontal center gap key={id}>
          <HeaderInput
            initialValue={header.key}
            onUpdate={(newValue: string) => {
              const newHeaders = produce(
                route.responseHeaders,
                (draftHeaders) => {
                  draftHeaders[id].key = newValue;
                },
              );
              networkRouteManager.modifyRoute(routeId, {
                responseHeaders: newHeaders,
              });
            }}
            style={{width: 300}}
          />
          <HeaderInput
            initialValue={header.value}
            onUpdate={(newValue: string) => {
              const newHeaders = produce(
                route.responseHeaders,
                (draftHeaders) => {
                  draftHeaders[id].value = newValue;
                },
              );
              networkRouteManager.modifyRoute(routeId, {
                responseHeaders: newHeaders,
              });
            }}
          />
          <Layout.Container
            onClick={() => {
              const newHeaders = produce(
                route.responseHeaders,
                (draftHeaders) => {
                  delete draftHeaders[id];
                },
              );
              networkRouteManager.modifyRoute(routeId, {
                responseHeaders: newHeaders,
              });
            }}>
            <CloseCircleOutlined />
          </Layout.Container>
        </Layout.Horizontal>
      ))}
    </Layout.Container>
  );
}

const httpMethods = [
  'GET',
  'POST',
  'PATCH',
  'HEAD',
  'PUT',
  'DELETE',
  'TRACE',
  'OPTIONS',
  'CONNECT',
].map((v) => ({value: v, label: v}));

export function MockResponseDetails({id, route, isDuplicated}: Props) {
  const networkRouteManager = useContext(NetworkRouteContext);
  const [nextHeaderId, setNextHeaderId] = useState(0);

  const {requestUrl, requestMethod, responseData, responseStatus} = route;

  let formattedResponse = '';
  try {
    formattedResponse = JSON.stringify(JSON.parse(responseData), null, 2);
  } catch (e) {
    formattedResponse = responseData;
  }

  return (
    <Layout.Container gap>
      <Layout.Horizontal gap>
        <Select
          value={requestMethod}
          options={httpMethods}
          onChange={(text) =>
            networkRouteManager.modifyRoute(id, {requestMethod: text})
          }
        />
        <Input
          type="text"
          placeholder="URL"
          value={requestUrl}
          onChange={(event) =>
            networkRouteManager.modifyRoute(id, {
              requestUrl: event.target.value,
            })
          }
          style={{flex: 1}}
        />
        <Input
          type="text"
          placeholder="STATUS"
          value={responseStatus}
          onChange={(event) =>
            networkRouteManager.modifyRoute(id, {
              responseStatus: event.target.value,
            })
          }
          style={{width: 100}}
        />
      </Layout.Horizontal>
      {isDuplicated && (
        <Layout.Horizontal gap>
          <WarningOutlined />
          Route is duplicated (Same URL and Method)
        </Layout.Horizontal>
      )}
      <Layout.Container height={500}>
        <Tabs grow>
          <Tab tab={'Data'}>
            <Input.TextArea
              wrap="soft"
              autoComplete="off"
              spellCheck={false}
              value={formattedResponse}
              onChange={(event) =>
                networkRouteManager.modifyRoute(id, {
                  responseData: event.target.value,
                })
              }
              style={{flex: 1}}
            />
          </Tab>
          <Tab tab={'Headers'}>
            <Layout.Top gap>
              <Layout.Horizontal>
                <Button
                  onClick={() => {
                    const newHeaders = {
                      ...route.responseHeaders,
                      [nextHeaderId.toString()]: {key: '', value: ''},
                    };
                    setNextHeaderId(nextHeaderId + 1);
                    networkRouteManager.modifyRoute(id, {
                      responseHeaders: newHeaders,
                    });
                  }}>
                  Add Header
                </Button>
              </Layout.Horizontal>
              <Layout.ScrollContainer>
                <ResponseHeaders
                  routeId={id}
                  route={route}
                  networkRouteManager={networkRouteManager}
                />
              </Layout.ScrollContainer>
            </Layout.Top>
          </Tab>
        </Tabs>
      </Layout.Container>
    </Layout.Container>
  );
}
