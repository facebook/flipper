/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const repoUrl = 'https://github.com/facebook/flipper';

const siteConfig = {
  title: 'Flipper' /* title for your website */,
  tagline: 'Extensible mobile app debugging',
  url: 'https://fbflipper.com/' /* your website url */,
  baseUrl: '/' /* base url for your project */,
  projectName: 'flipper',
  headerLinks: [
    {doc: 'features/index', label: 'Features'},
    {doc: 'getting-started/index', label: 'Setup'},
    {doc: 'extending/index', label: 'Extending'},
    {href: repoUrl, label: 'GitHub'},
  ],
  editUrl: 'https://github.com/facebook/flipper/blob/master/docs/',
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
  algolia: {
    apiKey: '2df980e7ffc95c19552790f7cad32666',
    indexName: 'fbflipper',
    algoliaOptions: {
      hitsPerPage: 5,
    },
  },
  scripts: [
    'https://buttons.github.io/buttons.js',
    'https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.min.js',
    '/js/code-blocks-buttons.js',
    '/js/google-analytics.js',
  ],
  repoUrl,
  stylesheets: [],
  onPageNav: 'separate',
};

module.exports = siteConfig;
