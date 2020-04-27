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
  title: 'Flipper',
  tagline: 'Extensible mobile app debugging',
  url: 'https://fbflipper.com/',
  baseUrl: '/',
  projectName: 'flipper',
  themeConfig: {
    navbar: {
      title: 'Flipper',
      logo: {
        alt: 'Flipper Logo',
        src: 'img/icon.png',
      },
      links: [
        {to: 'docs/features/index', label: 'Features', position: 'right'},
        {to: 'docs/getting-started/index', label: 'Setup', position: 'right'},
        {to: 'docs/extending/index', label: 'Extending', position: 'right'},
        {href: repoUrl, label: 'GitHub', position: 'right'},
      ],
    },
    disableDarkMode: true,
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Getting Started', to: 'docs/getting-started/index'},
            {label: 'Plugin Creation Tutorial', to: 'docs/tutorial/intro'},
          ],
        },
        {
          title: 'Plugins',
          items: [
            {label: 'Core Plugins', to: 'docs/features'},
            {
              label: 'Community Plugins',
              to: 'https://www.npmjs.com/search?q=keywords:flipper-plugin',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Twitter', to: 'https://twitter.com/flipper_fb'},
            {label: 'GitHub', to: repoUrl},
          ],
        },
      ],
      copyright: 'Copyright © ' + new Date().getFullYear() + ' Facebook',
      logo: {
        alt: 'Flipper Mascot',
        src: 'img/mascot.png',
        title: "I'm a dolphin not a whale!",
      },
    },
    algolia: {
      apiKey: '2df980e7ffc95c19552790f7cad32666',
      indexName: 'fbflipper',
      algoliaOptions: {
        hitsPerPage: 5,
      },
    },
  },
  favicon: 'img/icon.png',
  scripts: [
    'https://buttons.github.io/buttons.js',
    'https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.min.js',
    '/js/code-blocks-buttons.js',
    '/js/google-analytics.js',
  ],
  stylesheets: [],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: require.resolve('./sidebars.json'),
          editUrl: 'https://github.com/facebook/flipper/blob/master/website',
        },
        theme: {
          customCss: require.resolve('./static/css/custom.css'),
        },
      },
    ],
  ],
};

module.exports = siteConfig;
