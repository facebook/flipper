/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {fbContent, fbInternalOnly} = require('internaldocs-fb-helpers');

module.exports = {
  features: {
    Features: [
      'features/index',
      'features/logs-plugin',
      'features/layout-plugin',
      'features/navigation-plugin',
      'features/network-plugin',
      'features/databases-plugin',
      'features/images-plugin',
      'features/sandbox-plugin',
      'features/shared-preferences-plugin',
      'features/leak-canary-plugin',
      'features/crash-reporter-plugin',
      'features/share-flipper-data',
      'features/react-native',
      ...fbInternalOnly([
        'fb/Memory-Tools',
        'fb/Navigation-Plugin',
        'fb/supporting-feed-inspector',
        'fb/sections',
        'fb/Trace',
        'fb/mobile-config',
      ]),
    ],
  },
  setup: {
    'Getting Started': [
      ...fbInternalOnly(['getting-started/fb/using-flipper-at-facebook']),
      'getting-started/index',
      ...fbInternalOnly(['fb/Add-flipper-to-android-app']),
      'getting-started/android-native',
      ...fbInternalOnly(['fb/Adding-flipper-to-ios-app']),
      'getting-started/ios-native',
      'getting-started/react-native',
      'getting-started/react-native-android',
      'getting-started/react-native-ios',
      'troubleshooting',
    ],
    'Plugin Setup': [
      'setup/layout-plugin',
      'setup/navigation-plugin',
      'setup/network-plugin',
      'setup/databases-plugin',
      'setup/images-plugin',
      'setup/sandbox-plugin',
      'setup/shared-preferences-plugin',
      'setup/leak-canary-plugin',
      'setup/crash-reporter-plugin',
    ],
    Advanced: ['custom-ports', 'stetho'],
  },
  extending: {
    Tutorial: [
      'tutorial/intro',
      'tutorial/ios',
      'tutorial/android',
      'tutorial/react-native',
      'tutorial/js-setup',
      'tutorial/js-table',
      'tutorial/js-custom',
      'tutorial/js-publishing',
    ],
    'Plugin Development': [
      'extending/js-setup',
      'extending/flipper-plugin',
      'extending/create-table-plugin',
      'extending/styling-components',
      'extending/search-and-filter',
      'extending/create-plugin',
      'extending/client-plugin-lifecycle',
      'extending/send-data',
      'extending/error-handling',
      'extending/testing',
      'extending/debugging',
      ...fbInternalOnly(['extending/fb/desktop-plugin-releases']),
    ],
    'Deprecated APIs': ['extending/ui-components', 'extending/js-plugin-api'],
    // end-internal-sidebars-example
    'Other Platforms': [
      'extending/new-clients',
      'extending/establishing-a-connection',
      'extending/supporting-layout',
    ],
    Internals: [
      'extending/arch',
      'extending/layout-inspector',
      'extending/testing-rn',
      'extending/public-releases',
    ],
  },
  'fb-internal': {
    'FB Internal': fbInternalOnly([
      'fb/release-infra',
      'fb/LauncherConfig',
      'fb/Flipper-fbsource-Pinning',
      'fb/Flipper-Release-Cycle',
      'fb/Flipper-Strict-TypeScript',
      'fb/Help-Updating-Flipper',
      {
        'Internal Plugins': ['fb/plugins'],
      },
      {
        'Plugin Development': [
          'fb/developmentworkflow',
          'fb/TypeScript',
          'fb/adding-npm-dependencies-0',
          'fb/adding-analytics-0',
          {
            Android: [
              'fb/android-plugin-development-Android-interacting-0',
              'fb/android-plugin-development-testing-android-plugins-0',
            ],
          },
          {
            iOS: [
              'fb/ios-plugin-development-sending-data-to-an-ios-plugin-0',
              'fb/ios-plugin-development-testing-ios-plugins-0',
            ],
          },
          'fb/Add-Support-Group-to-Flipper-Support-Form',
        ],
      },
      {
        Lints: ['fb/building-a-linter', 'fb/active-linters'],
      },
      'fb/index',
    ]),
  },
};
