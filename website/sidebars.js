/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 Adds content only if building internal FB version of documentations
 e.g. ...FBInternalOnly({'sected-id'})
*/
function NotInFBInternal(elements) {
  return process.env.FB_INTERNAL ? [] : elements;
}

function FBInternalOnly(elements, fallback) {
  return process.env.FB_INTERNAL == 1 ? elements : fallback || [];
}

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
    ],
  },
  setup: {
    'Getting Started': [
      ...FBInternalOnly(['getting-started/fb/using-flipper-at-facebook']),
      'getting-started/index',
      'getting-started/android-native',
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
    'Extending Flipper': ['extending/index'],
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
      'extending/js-plugin-api',
      'extending/create-table-plugin',
      'extending/ui-components',
      'extending/styling-components',
      'extending/search-and-filter',
      'extending/create-plugin',
      'extending/client-plugin-lifecycle',
      'extending/send-data',
      'extending/error-handling',
      'extending/testing',
      'extending/debugging',
      ...FBInternalOnly(['extending/fb/desktop-plugin-releases']),
      ...FBInternalOnly([
        // TODO: Remove once sandy is public T69061061
        'extending/fb/sandy/sandy-plugins',
      ]),
    ],
    'Other Platforms': [
      'extending/new-clients',
      'extending/establishing-a-connection',
      'extending/supporting-layout',
    ],
    Internals: [
      'extending/arch',
      'extending/layout-inspector',
      'extending/testing-rn',
    ],
  },
  'fb-internal': {
    'FB Internal': FBInternalOnly([
      'fb/active-linters',
      'fb/Add-flipper-to-android-app',
      'fb/adding-analytics-0',
      'fb/Adding-flipper-to-ios-app',
      'fb/adding-npm-dependencies-0',
      'fb/Add-Support-Group-to-Flipper-Support-Form',
      'fb/android-plugin-development-Android-interacting-0',
      'fb/android-plugin-development-testing-android-plugins-0',
      'fb/building-a-linter',
      'fb/create-new-plugin',
      'fb/developmentworkflow',
      'fb/Flipper-fbsource-Pinning',
      'fb/Flipper-Release-Cycle',
      'fb/Flipper-Strict-TypeScript',
      'fb/Help-Updating-Flipper',
      'fb/ios-plugin-development-sending-data-to-an-i-o-s-plugin-0',
      'fb/ios-plugin-development-testing-i-o-s-plugins-0',
      'fb/LauncherConfig',
      'fb/layout-extending-android-layout-inspector',
      'fb/layout-extending-i-o-s-layout-inspector',
      'fb/Memory-Tools',
      'fb/mobile-config',
      'fb/Navigation-Plugin',
      'fb/plugins',
      'fb/sections',
      'fb/supporting-feed-inspector',
      'fb/Trace',
      'fb/troubleshooting',
      'fb/TypeScript',
      'fb/using-gatekeepers',
      'fb/index',
    ]),
  },
};
