/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {fbInternalOnly} = require('internaldocs-fb-helpers');

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
        'fb/supporting-feed-inspector',
        'fb/sections',
        'fb/Trace',
        'fb/mobile-config',
        'fb/plugins',
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
      {
        'Other Platforms': [
          'extending/new-clients',
          'extending/establishing-a-connection',
          'extending/supporting-layout',
        ],
      },
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
    'Desktop plugin APIs': [
      'extending/flipper-plugin',
      'extending/styling-components',
      'extending/create-table-plugin',
      'extending/search-and-filter',
      fbInternalOnly({
        'QPL linting': ['fb/building-a-linter', 'fb/active-linters'],
      }),
      {
        'Deprecated APIs': [
          'extending/ui-components',
          'extending/js-plugin-api',
        ],
      },
    ],
    'Client plugin APIs': [
      'extending/create-plugin',
      'extending/send-data',
      'extending/error-handling',
      'extending/testing',
      'extending/arch',
      'extending/client-plugin-lifecycle',
      'extending/layout-inspector',
      ...fbInternalOnly([
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
      ]),
    ],
    Workflow: [
      'extending/js-setup',
      'extending/debugging',
      ...fbInternalOnly([
        'extending/fb/desktop-plugin-releases',
        'fb/developmentworkflow',
        'fb/TypeScript',
        'fb/adding-npm-dependencies-0',
        'fb/adding-analytics-0',
      ]),
    ],
  },
  'fb-internal': {
    'FB Internal': fbInternalOnly([
      'fb/index',
      'extending/public-releases',
      'fb/release-infra',
      'fb/LauncherConfig',
      'fb/hacking-on-launcher',
      'fb/Flipper-fbsource-Pinning',
      'fb/Flipper-Release-Cycle',
      'fb/Add-Support-Group-to-Flipper-Support-Form',
      'fb/Help-Updating-Flipper',
      'extending/testing-rn',
    ]),
  },
};
