/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const React = require('react');

class Index extends React.Component {
  render() {
    return (
      <div>
        <div className="splash">
          <div className="content">
            <h1>Extensible mobile app&nbsp;debugger</h1>
            <h2>
              Sonar is a platform for debugging mobile apps on iOS and Android.
              Visualize, inspect, and control your apps from a simple desktop
              interface. Use Sonar as is or extend it using the plugin API.
            </h2>
            <div className="row">
              <a
                className="btn primary"
                href="https://www.facebook.com/sonar/public/mac">
                Download
              </a>
              <a className="btn" href="/docs/understand.html">
                Learn more
              </a>
            </div>
            <img
              src="/img/splash.png"
              srcSet="/img/splash.png 1x, /img/splash@2x.png 2x"
              className="splashScreen"
            />
            <div className="shadow" />
          </div>
        </div>
        <div className="content row">
          <div className="col">
            <img
              src="/img/inspector.png"
              srcSet="/img/inspector.png 1x, /img/inspector@2x.png 2x"
            />
          </div>
          <div className="col">
            <h4>Tools</h4>
            <h3>Mobile development</h3>
            <p>
              Sonar aims to be your number one companion for mobile app
              development on iOS and Android. Therefore, we provide a bunch of
              useful tools including a log viewer, interactive layout inspector,
              and network inspector.
            </p>
            <a className="learnmore" href="/docs/getting-started.html">
              Learn more
            </a>
          </div>
        </div>
        <div className="content row">
          <div className="col">
            <h4>Plugins</h4>
            <h3>Extending Sonar</h3>
            <p>
              Sonar is built as a platform. In addition to using the tools
              already included, you can create your own plugins to visualize and
              debug data from your mobile apps. Sonar takes care of sending data
              back and forth, calling functions, and listening for events on the
              mobile app.
            </p>
            <a className="learnmore" href="/docs/understand.html">
              Learn more
            </a>
          </div>
          <div className="col center">
            <img
              src="/img/SonarKit.png"
              srcSet="/img/SonarKit.png 1x, /img/SonarKit@2x.png 2x"
            />
          </div>
        </div>
        <div className="content row">
          <div className="col">
            <img
              src="/img/plugins.png"
              srcSet="/img/plugins.png 1x, /img/plugins@2x.png 2x"
            />
          </div>
          <div className="col">
            <h4>Open Source</h4>
            <h3>Contributing to Sonar</h3>
            <p>
              Both Sonar's desktop app and native mobile SDKs are open-source
              and MIT licensed. This enables you to see and understand how we
              are building plugins, and of course join the community and help
              improve Sonar. We are excited to see what you will build on this
              platform.
            </p>
            <a className="learnmore" href="/docs/js-setup.html">
              Learn more
            </a>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = Index;
