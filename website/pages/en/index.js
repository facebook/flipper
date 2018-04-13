/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

const React = require('react');

class Index extends React.Component {
  render() {
    return (
      <div>
        <div className="splash">
          <div className="content">
            <h1>Extensible mobile app debugger</h1>
            <h2>
              Sonar is a platform for debugging your mobile apps on iOS and
              Android. You can visualize all kinds of data from the device and
              create plugins to show the data on the desktop or use the plugins
              we already built.
            </h2>
            <div className="row">
              <a
                className="btn primary"
                href="https://facebook.com/sonar/download/mac">
                Download
              </a>
              <a className="btn" href="">
                Learn more
              </a>
            </div>
          </div>
        </div>
        <div className="content row">
          <div className="col">image</div>
          <div className="col">
            <h4>Plugins</h4>
            <h3>Extending Sonar</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Suspendisse dolor urna, placerat sed condimentum commodo,
              malesuada id quam. Vivamus vestibulum blandit turpis. Suspendisse
              id cursus neque, sit amet pellentesque arcu.
            </p>
          </div>
        </div>
        <div className="content row">
          <div className="col">
            <h4>Plugins</h4>
            <h3>Extending Sonar</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Suspendisse dolor urna, placerat sed condimentum commodo,
              malesuada id quam. Vivamus vestibulum blandit turpis. Suspendisse
              id cursus neque, sit amet pellentesque arcu.
            </p>
          </div>
          <div className="col">image</div>
        </div>
        <div className="content row">
          <div className="col">image</div>
          <div className="col">
            <h4>Plugins</h4>
            <h3>Extending Sonar</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Suspendisse dolor urna, placerat sed condimentum commodo,
              malesuada id quam. Vivamus vestibulum blandit turpis. Suspendisse
              id cursus neque, sit amet pellentesque arcu.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = Index;
