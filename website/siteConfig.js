/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
const repoUrl = 'https://github.com/facebook/sonar';

const siteConfig = {
  title: 'Sonar' /* title for your website */,
  tagline: 'Extensible mobile app debugging',
  url: 'https://fbsonar.com/' /* your website url */,
  baseUrl: '/' /* base url for your project */,
  projectName: 'sonar',
  headerLinks: [
    {doc: 'getting-started', label: 'Getting Started'},
    {doc: 'understand', label: 'Docs'},
    {href: repoUrl, label: 'GitHub'},
  ],
  /* path to images for header/footer */
  headerIcon: 'img/icon.png',
  footerIcon: 'img/mascot.png',
  favicon: 'img/icon.png',
  /* colors for website */
  colors: {
    primaryColor: '#121020',
    secondaryColor: '#121020',
    accentColor: '#785BA3',
    actionColor: '#008cf2',
  },
  copyright: 'Copyright © ' + new Date().getFullYear() + ' Facebook',
  highlight: {
    theme: 'default',
  },
  repoUrl,
  scripts: ['https://buttons.github.io/buttons.js'],
  stylesheets: [],
};

module.exports = siteConfig;
