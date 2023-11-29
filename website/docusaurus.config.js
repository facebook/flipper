/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {fbContent, fbInternalOnly} = require('docusaurus-plugin-internaldocs-fb/internal');

const repoUrl = 'https://github.com/facebook/flipper';
const siteUrl = fbContent({
    internal: 'https://flipper.thefacebook.com/',
    external: 'https://fbflipper.com/',
});
const siteConfig = {
  title: fbContent({
    internal: 'Flipper @FB',
    external: 'Flipper',
  }),
  tagline: 'Extensible mobile app debugging',
  url: siteUrl,
  baseUrl: '/',
  trailingSlash: true,
  projectName: 'flipper',
  // TODO: T69061026 enable once sandy docs are complete: external_domain: 'fbflipper.com',
  themeConfig: {
    announcementBar: {
      id: 'support_ukraine',
      content:
        'Support Ukraine 🇺🇦 <a target="_blank" rel="noopener noreferrer" href="https://opensource.fb.com/support-ukraine"> Help Provide Humanitarian Aid to Ukraine</a>.',
      backgroundColor: '#20232a',
      textColor: '#fff',
      isCloseable: false,
    },
    navbar: {
      title: fbContent({
        internal: 'Flipper @FB',
        external: 'Flipper',
      }),
      logo: {
        alt: 'Flipper Logo',
        src: 'img/icon.png',
      },
      items: [
        {
          to: 'docs/features',
          label: 'Features',
          position: 'right',
        },
        {
          to: 'docs/getting-started',
          label: 'Setup',
          position: 'right',
        },
        {
          to: 'docs/tutorial/intro',
          label: 'Creating Plugins',
          position: 'right',
        },
        {
          to: 'docs/internals',
          label: 'Under the Hood',
          position: 'right',
        },
        {to: 'blog', label: 'Blog', position: 'right'},
        {
          href: repoUrl,
          position: 'right',
          'aria-label': 'GitHub repository',
          className: 'navbar-github-link',
        },
      ],
    },
    colorMode: {
      // Nothing against dark mode, but our current CSS doesn't have high contrast
      // so it needs some work before being enabled.
      defaultMode: 'light',
      disableSwitch: true,
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {
              label: 'Getting Started',
              to: 'docs/getting-started',
            },
            {
              label: 'Plugin Creation Tutorial',
              to: 'docs/tutorial/intro',
            },
          ],
        },
        {
          title: 'Plugins',
          items: [
            {
              label: 'Core Plugins',
              to: 'docs/features',
            },
            {
              label: 'Community Plugins',
              href: 'https://www.npmjs.com/search?q=keywords:flipper-plugin',
            },
          ],
        },
        {
          title: 'Legal',
          // Please do not remove the privacy and terms, it's a legal requirement.
          items: [
            {
              label: 'Privacy',
              href: 'https://opensource.facebook.com/legal/privacy/',
            },
            {
              label: 'Terms',
              href: 'https://opensource.facebook.com/legal/terms/',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Twitter',
              href: 'https://twitter.com/flipper_fb',
            },
            {
              label: 'GitHub',
              href: repoUrl,
            },
          ],
        },
      ],
      copyright: 'Copyright © ' + new Date().getFullYear() + ' Meta Platforms, Inc',
      logo: {
        alt: 'Flipper Mascot',
        src: 'img/mascot.png',
      },
    },
    algolia: fbContent({
      internal: undefined,
      external: {
        appId: 'OFCNCOG2CU',
        apiKey: '2df980e7ffc95c19552790f7cad32666',
        indexName: 'fbflipper',
        algoliaOptions: {
          hitsPerPage: 5,
        },
      },
    }),
    prism: {
      additionalLanguages: [
        'groovy',
        'java',
        'kotlin',
        'ruby',
        'swift',
        'objectivec',
      ],
    },
  },
  favicon: 'img/icon.png',
  scripts: [
    'https://buttons.github.io/buttons.js',
    'https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.min.js',
    `${siteUrl}js/code-blocks-buttons.js`,
    `${siteUrl}js/google-analytics.js`,
  ],
  stylesheets: [],
  // start_config_example
  presets: [
    [
      require.resolve('docusaurus-plugin-internaldocs-fb/docusaurus-preset'),
      {
        docs: {
          path: '../docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: fbContent({
            internal:
              'https://www.internalfb.com/intern/diffusion/FBS/browse/master/xplat/sonar/website/',
            external: 'https://github.com/facebook/flipper/blob/main/website',
          }),
        },
        theme: {
          customCss: require.resolve('./static/css/custom.css'),
        },
        staticDocsProject: 'flipper',
        trackingFile: 'fbcode/staticdocs/WATCHED_FILES',
        'remark-code-snippets': {
          baseDir: '..',
        },
        enableEditor: true,
      },
    ],
  ],
  customFields: {
    fbRepoName: 'fbsource',
    ossRepoPath: 'xplat/sonar',
  },
  // end_config_example
  plugins: [
    './src/plugins/support-symlinks',
    ...fbContent({internal: [], external: [require.resolve('docusaurus-lunr-search')]}),
    [
      require.resolve('@docusaurus/plugin-content-pages'),
      {
        id: 'embedded-pages',
        path: './src/embedded-pages/',
        mdxPageComponent: '@theme/EmbeddedMDXPage',
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: '/docs/getting-started/troubleshooting',
            from: ['/docs/fb/troubleshooting'],
          },
          {
            to: '/docs/tutorial/intro',
            from: ['/docs/extending'],
          },
          {
            to: '/docs/extending/desktop-plugin-structure',
            from: ['/docs/extending/js-setup'],
          },
          {
            to: '/docs/extending/create-plugin',
            from: [
              '/docs/extending/send-data',
              '/docs/fb/android-plugin-development-Android-interacting-0',
            ],
          },
          {
            to: '/docs/tutorial/intro',
            from: ['/docs/fb/create-new-plugin'],
          },
          {
            to: '/docs/extending/dev-setup',
            from: ['/docs/fb/developmentworkflow'],
          },
          {
            to: '/docs/getting-started',
            from: ['/docs/fb/Help-Updating-Flipper'],
          },
          {
            to: '/docs/extending/create-plugin',
            from: [
              '/docs/fb/ios-plugin-development-sending-data-to-an-ios-plugin-0',
            ],
          },
          {
            to: '/docs/extending/dev-setup',
            from: ['/docs/fb/TypeScript'],
          },
          {
            to: '/docs/extending/flipper-plugin',
            from: ['/docs/fb/using-gatekeepers'],
          },
          {
            to: '/docs/getting-started',
            from: ['/docs/fb/using-flipper-at-facebook'],
          },
          {
            to: '/docs/getting-started',
            from: ['/docs/fb'],
          },
          {
            from: ['/docs/features/network-plugin'],
            to: '/docs/features/plugins/network',
          },
          {
            from: ['/docs/features/logs-plugin'],
            to: '/docs/features/plugins/device-logs',
          },
          {
            from: ['/docs/features/layout-plugin'],
            to: '/docs/features/plugins/inspector',
          },
          {
            from: ['/docs/features/navigation-plugin'],
            to: '/docs/features/plugins/navigation',
          },
          {
            from: ['/docs/features/databases-plugin'],
            to: '/docs/features/plugins/databases',
          },
          {
            from: ['/docs/features/images-plugin'],
            to: '/docs/features/plugins/fresco',
          },
          {
            from: ['/docs/features/sandbox-plugin'],
            to: '/docs/features/plugins/sandbox',
          },
          {
            from: ['/docs/features/shared-preferences-plugin'],
            to: '/docs/features/plugins/preferences',
          },
          {
            from: ['/docs/features/leak-canary-plugin'],
            to: '/docs/features/plugins/leak-canary',
          },
          {
            from: ['/docs/features/crash-reporter-plugin'],
            to: '/docs/features/plugins/crash-reporter',
          },
          {
            from: ['/docs/setup/network-plugin'],
            to: '/docs/setup/plugins/network',
          },
          {
            from: ['/docs/setup/layout-plugin'],
            to: '/docs/setup/plugins/inspector',
          },
          {
            from: ['/docs/setup/navigation-plugin'],
            to: '/docs/setup/plugins/navigation',
          },
          {
            from: ['/docs/setup/databases-plugin'],
            to: '/docs/setup/plugins/databases',
          },
          {
            from: ['/docs/setup/images-plugin'],
            to: '/docs/setup/plugins/fresco',
          },
          {
            from: ['/docs/setup/sandbox-plugin'],
            to: '/docs/setup/plugins/sandbox',
          },
          {
            from: ['/docs/setup/shared-preferences-plugin'],
            to: '/docs/setup/plugins/preferences',
          },
          {
            from: ['/docs/setup/leak-canary-plugin'],
            to: '/docs/setup/plugins/leak-canary',
          },
          {
            from: ['/docs/setup/leak-canary-2-plugin'],
            to: '/docs/setup/plugins/leak-canary',
          },
          {
            from: ['/docs/setup/crash-reporter-plugin'],
            to: '/docs/setup/plugins/crash-reporter',
          },
          ...fbInternalOnly([
            {
              from: ['/docs/fb/Memory-Tools'],
              to: '/docs/features/plugins/memory-tools',
            },
            {
              from: ['/docs/fb/supporting-feed-inspector'],
              to: '/docs/features/plugins/feed-inspector',
            },
            {
              from: ['/docs/fb/sections'],
              to: '/docs/features/plugins/sections',
            },
            {from: ['/docs/fb/Trace'], to: '/docs/features/plugins/tracery'},
            {
              from: ['/docs/fb/mobile-config'],
              to: '/docs/features/plugins/mobile-config',
            },
          ]),
        ].map(x => ({
          ...x,
          from: x.from.reduce(
            (acc, href) => {
              acc.push(href, `${href}/index`);
              return acc;
            },
            [],
          )}),
        ),
      },
    ],
  ],
};

module.exports = siteConfig;
