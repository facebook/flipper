/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const React = require('react');

class Docs extends React.Component {
  render() {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: "window.location.href = '/docs/getting-started.html'",
        }}
      />
    );
  }
}

module.exports = Docs;
