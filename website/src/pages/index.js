/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {usePluginData} from '@docusaurus/useGlobalData';
import {isInternal} from 'internaldocs-fb-helpers';

export default function Index() {
  const FB_INTERNAL = isInternal();

  return (
    <Layout title="Extensible mobile app debugger">
      <div>
        <div className="splash">
          <div className="content">
            <h1>Extensible mobile app&nbsp;debugger</h1>
            <h2>
              Flipper is a platform for debugging iOS, Android and React Native
              apps. Visualize, inspect, and control your apps from a simple
              desktop interface. Use Flipper as is or extend it using the plugin
              API.
            </h2>
            {FB_INTERNAL ? (
              <h2>
                Facebook employees should download the internal version of
                Flipper from Managed Software Center
              </h2>
            ) : (
              <div>
                <p
                  className="landing-btn landing-btn-left landing-btn-label"
                  href="https://www.facebook.com/fbflipper/public/mac">
                  Download
                </p>
                <a
                  className="landing-btn landing-btn-middle primary"
                  href="https://www.facebook.com/fbflipper/public/mac">
                  Mac
                </a>
                <a
                  className="landing-btn landing-btn-middle primary"
                  href="https://www.facebook.com/fbflipper/public/linux">
                  Linux
                </a>
                <a
                  className="landing-btn landing-btn-right primary"
                  href="https://www.facebook.com/fbflipper/public/windows">
                  Windows
                </a>
                <a
                  className="landing-btn"
                  href={useBaseUrl('docs/features/index')}>
                  Learn more
                </a>
              </div>
            )}
            <div className="slideshow">
              <img src={useBaseUrl('img/logs.png')} className="splashScreen" />
              <img
                src={useBaseUrl('img/layout.png')}
                className="splashScreen"
              />
              <img
                src={useBaseUrl('img/network.png')}
                className="splashScreen"
              />
              <img
                src={useBaseUrl('img/crashreporterplugin.png')}
                className="splashScreen"
              />
            </div>
            <div className="shadow" />
          </div>
        </div>
        <div className="content row">
          <div className="col">
            <img
              src={useBaseUrl('img/inspector.png')}
              srcSet={`${useBaseUrl('img/inspector.png')} 1x, ${useBaseUrl(
                'img/inspector@2x.png',
              )} 2x`}
            />
          </div>
          <div className="col">
            <h4>Tools</h4>
            <h3>Mobile development</h3>
            <p>
              Flipper aims to be your number one companion for mobile app
              development on iOS and Android. Therefore, we provide a bunch of
              useful tools including a log viewer, interactive layout inspector,
              and network inspector.
            </p>
            <a className="learnmore" href={useBaseUrl('docs/features/index')}>
              Learn more
            </a>
          </div>
        </div>
        <div className="content row">
          <div className="col">
            <h4>Plugins</h4>
            <h3>Extending Flipper</h3>
            <p>
              Flipper is built as a platform. In addition to using the tools
              already included, you can create your own plugins to visualize and
              debug data from your mobile apps. Flipper takes care of sending
              data back and forth, calling functions, and listening for events
              on the mobile app.
            </p>
            <a className="learnmore" href={useBaseUrl('docs/extending/index')}>
              Learn more
            </a>
          </div>
          <div className="col center">
            <img
              src={useBaseUrl('img/FlipperKit.png')}
              srcSet={`${useBaseUrl('img/FlipperKit.png')} 1x, ${useBaseUrl(
                'img/FlipperKit@2x.png',
              )} 2x`}
            />
          </div>
        </div>
        <div className="content row">
          <div className="col">
            <img
              src={useBaseUrl('img/plugins.png')}
              srcSet={`${useBaseUrl('img/plugins.png')} 1x, ${useBaseUrl(
                'img/plugins@2x.png',
              )} 2x`}
            />
          </div>
          <div className="col">
            <h4>Open Source</h4>
            <h3>Contributing to Flipper</h3>
            <p>
              Both Flipper's desktop app and native mobile SDKs are open-source
              and MIT licensed. This enables you to see and understand how we
              are building plugins, and of course join the community and help
              improve Flipper. We are excited to see what you will build on this
              platform.
            </p>
            <a
              className="learnmore"
              href="https://github.com/facebook/flipper"
              target="_blank">
              Learn more
            </a>
          </div>
        </div>
        <div className="wrapper landing-cta">
          <a
            href={useBaseUrl('docs/getting-started/index')}
            className="landing-btn primary">
            Integrate Flipper In Your App
          </a>
          {FB_INTERNAL ? null : (
            <a
              href="https://www.facebook.com/fbflipper/public/mac"
              target="_blank"
              className="landing-btn">
              Download Flipper
            </a>
          )}
        </div>
      </div>
    </Layout>
  );
}
