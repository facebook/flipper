/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {fbInternalOnly, fbContent} = require('internaldocs-fb-helpers');

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
      'getting-started/index',
      {
        'Adding Flipper to your app': [
          ...fbContent({
            external: [
              'getting-started/android-native',
              'getting-started/ios-native',
            ],
            internal: [
              {
                Android: [
                  'fb/Add-flipper-to-android-app',
                  'getting-started/android-native',
                ],
                iOS: [
                  'fb/Adding-flipper-to-ios-app',
                  'getting-started/ios-native',
                ],
              },
            ],
          }),
          {
            'React Native': [
              'getting-started/react-native',
              'getting-started/react-native-android',
              'getting-started/react-native-ios',
            ],
          },
        ],
      },
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
    'Development workflow': [
      'extending/dev-setup',
      'extending/loading-custom-plugins',
      'extending/desktop-plugin-structure',
      'extending/testing',
      'extending/debugging',
      ...fbInternalOnly(['fb/adding-analytics-0']),
      'extending/plugin-distribution',
    ],
    'Desktop plugin APIs': [
      'extending/flipper-plugin',
      'extending/styling-components',
      'extending/create-table-plugin',
      'extending/search-and-filter',
      ...fbInternalOnly([
        {
          'QPL linting': ['fb/building-a-linter', 'fb/active-linters'],
        },
      ]),
      {
        'Deprecated APIs': [
          'extending/ui-components',
          'extending/js-plugin-api',
        ],
      },
    ],
    'Client plugin APIs': [
      'extending/create-plugin',
      'extending/error-handling',
      'extending/arch',
      'extending/client-plugin-lifecycle',
      'extending/layout-inspector',
    ],
  },
  internals: {
    Internals: [
      'internals/index',
      'extending/public-releases',
      'extending/testing-rn',
      ...fbInternalOnly([
        'fb/release-infra',
        'fb/LauncherConfig',
        'fb/hacking-on-launcher',
        'fb/Flipper-fbsource-Pinning',
        'fb/Flipper-Release-Cycle',
        'fb/Add-Support-Group-to-Flipper-Support-Form',
        'fb/Alerts',
        'fb/bundling',
        'fb/Certificate-Exchange-Diagram',
        'fb/Electron-Upgrade',
        'fb/flipper-analytics',
        'fb/Navigation-Plugin-Development-Guide',
        'fb/Oncall-Runbook',
        'fb/sandcastle',
        'fb/Star-Ratings',
      ]),
    ],
  },
};
