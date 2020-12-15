/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {theme} from 'flipper-plugin';

// Last updated: Jan 30 2016

export const colors = {
  // FIG UI Core
  blue: '#4267b2', // Blue - Active-state nav glyphs, nav bars, links, buttons
  blueDark3: '#162643', // Blue - Dark 3 (illustrations only)
  blueDark2: '#20375f', // Blue - Dark 2 (illustrations only)
  blueDark1: '#29487d', // Blue - Dark 1 (illustrations only)
  blueDark: '#365899', // Blue - Dark 0 (blue links, blue button hover states)
  blueTint15: '#577fbc', // Blue - Tint 15 (illustrations only)
  blueTint30: '#7596c8', // Blue - Tint 30 (illustrations only)
  blueTint50: '#9cb4d8', // Blue - Tint 50 (illustrations only)
  blueTint70: '#c4d2e7', // Blue - Tint 70 (illustrations only)
  blueTint90: '#ecf0f7', // Blue - Tint 90 (illustrations only)
  highlight: '#4080ff', // Highlight - Unread, badging notifications, NUX *Use sparingly.*
  highlightDark3: '#1c4f8c', // Highlight - Dark 3 (illustrations only)
  highlightDark2: '#1d5fbf', // Highlight - Dark 2 (illustrations only)
  highlightDark1: '#3578e5', // Highlight - Dark 1 (illustrations only)
  highlightTint15: '#5d93ff', // Highlight - Tint 15 (illustrations only)
  highlightTint30: '#79a6ff', // Highlight - Tint 30 (illustrations only)
  highlightTint50: '#9fbfff', // Highlight - Tint 50 (illustrations only)
  highlightTint70: '#c6d9ff', // Highlight - Tint 70 (illustrations only)
  highlightTint90: '#ecf2ff', // Highlight - Tint 90 (illustrations only)
  highlightBackground: '#edf2fa', // Highlight Background - Background fill for unread or highlighted states. Not intended for hover / pressed states
  highlighButtonPrimaryColor: '#237FF1', // Blue color which is used in the button when its type is primary
  green: '#42b72a', // Green - Confirmation, success, commerce and status
  red: '#FC3A4B', // Red - Badges, error states
  redTint: '#FEF2F1',
  white: '#ffffff', // White - Text and glyphs in Dark UI and media views
  black: '#000000', // Black - Media backgrounds
  yellow: '#D79651', // Yellow - Warnings
  yellowTint: '#FEFBF2',
  purple: '#8C73C8', // Purple - Verbose
  purpleTint: '#E8E3F4',
  purpleLight: '#ccc9d6', // purpleLight 90 - Highlighting row's background when it matches the query
  grey: '#88A2AB', // Grey - Debug
  greyTint: '#E7ECEE',
  greyTint2: '#e5e5e5', // Grey - Can be used in demarcation with greyStackTraceTint
  greyTint3: '#515151', // Grey - Can be used as the color for the title
  greyStackTraceTint: '#f5f6f8', // Grey - It is used as the background for the stacktrace in crash reporter plugin
  cyan: '#4FC9EA', // Cyan - Info
  cyanTint: '#DCF4FB', // Cyan - Info
  // FIG UI Light
  light02: '#f6f7f9', // Light 02 – Modal Headers & Nav - Modal headers and navigation elements that sit above primary UI
  light05: '#e9ebee', // Light 05 – Mobile & Desktop Wash - Background wash color for desktop and mobile
  light10: '#dddfe2', // Light 10 – Desktop Dividers, Strokes, Borders - Desktop dividers, strokes, borders
  light15: '#ced0d4', // Light 15 – Mobile Dividers, Strokes, Borders - Mobile dividers, strokes, borders
  light20: '#bec2c9', // Light 20 – Inactive Nav Glyphs - Inactive-state nav glyphs, tertiary glyphs
  light30: '#90949c', // Light 30 – Secondary Text & Glyphs - Secondary text and glyphs, meta text and glyphs
  light50: '#4b4f56', // Light 50 – Medium Text & Primary Glyphs - Medium text and primary glyphs
  light80: '#1d2129', // Light 80 – Primary Text - Primary text
  // FIG UI Alpha
  whiteAlpha10: 'rgba(255, 255, 255, 0.10)', // Alpha 10 - Inset strokes and borders on photos
  whiteAlpha15: 'rgba(255, 255, 255, 0.15)', // Alpha 15 - Dividers, strokes, borders
  whiteAlpha30: 'rgba(255, 255, 255, 0.3)', // Alpha 30 - Secondary text and glyphs, meta text and glyphs
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)', // Alpha 40 - Overlays
  whiteAlpha50: 'rgba(255, 255, 255, 0.5)', // Alpha 50 - Medium text and primary glyphs
  whiteAlpha80: 'rgba(255, 255, 255, 0.8)', // Alpha 80 - Primary Text
  blackAlpha10: 'rgba(0, 0, 0, 0.1)', // Alpha 10 - Inset strokes and borders on photos
  blackAlpha15: 'rgba(0, 0, 0, 0.15)', // Alpha 15 - Dividers, strokes, borders
  blackAlpha30: 'rgba(0, 0, 0, 0.3)', // Alpha 30 - Secondary text and glyphs, meta text and glyphs
  blackAlpha40: 'rgba(0, 0, 0, 0.4)', // Alpha 40 - Overlays
  blackAlpha50: 'rgba(0, 0, 0, 0.5)', // Alpha 50 - Medium text and primary glyphs
  blackAlpha80: 'rgba(0, 0, 0, 0.8)', // Alpha 80 - Primary Text
  light80Alpha4: 'rgba(29, 33, 41, 0.04)', // Light 80 Alpha 4 - Hover state background fill for list views on WWW
  light80Alpha8: 'rgba(29, 33, 41, 0.08)', // Light 80 Alpha 8 - Pressed state background fill for list views on WWW and Mobile
  // FIG UI Dark
  dark20: '#cccccc', // Dark 20 – Primary Text - Primary text
  dark50: '#7f7f7f', // Dark 50 – Medium Text & Primary Glyphs - Medium text and primary glyphs
  dark70: '#4c4c4c', // Dark 70 – Secondary Text & Glyphs - Secondary text and glyphs, meta text and glyphs
  dark80: '#333333', // Dark 80 – Inactive Nav Glyphs - Inactive-state nav glyphs, tertiary glyphs
  dark85: '#262626', // Dark 85 – Dividers, Strokes, Borders - Dividers, strokes, borders
  dark90: '#191919', // Dark 90 – Nav Bar, Tab Bar, Cards - Nav bar, tab bar, cards
  dark95: '#0d0d0d', // Dark 95 – Background Wash - Background Wash
  // FIG Spectrum
  blueGrey: '#5f6673', // Blue Grey
  blueGreyDark3: '#23272f', // Blue Grey - Dark 3
  blueGreyDark2: '#303846', // Blue Grey - Dark 2
  blueGreyDark1: '#4f5766', // Blue Grey - Dark 1
  blueGreyTint15: '#777d88', // Blue Grey - Tint 15
  blueGreyTint30: '#8f949d', // Blue Grey - Tint 30
  blueGreyTint50: '#afb3b9', // Blue Grey - Tint 50
  blueGreyTint70: '#cfd1d5', // Blue Grey - Tint 70
  blueGreyTint90: '#eff0f1', // Blue Grey - Tint 90
  slate: '#b9cad2', // Slate
  slateDark3: '#688694', // Slate - Dark 3
  slateDark2: '#89a1ac', // Slate - Dark 2
  slateDark1: '#a8bbc3', // Slate - Dark 1
  slateTint15: '#c4d2d9', // Slate - Tint 15
  slateTint30: '#cedae0', // Slate - Tint 30
  slateTint50: '#dce5e9', // Slate - Tint 50
  slateTint70: '#eaeff2', // Slate - Tint 70
  slateTint90: '#f8fafb', // Slate - Tint 90
  aluminum: '#a3cedf', // Aluminum
  aluminumDark3: '#4b8096', // Aluminum - Dark 3
  aluminumDark2: '#6ca0b6', // Aluminum - Dark 2
  aluminumDark1: '#8ebfd4', // Aluminum - Dark 1
  aluminumTint15: '#b0d5e5', // Aluminum - Tint 15
  aluminumTint30: '#bfdde9', // Aluminum - Tint 30
  aluminumTint50: '#d1e7f0', // Aluminum - Tint 50
  aluminumTint70: '#e4f0f6', // Aluminum - Tint 70
  aluminumTint90: '#f6fafc', // Aluminum - Tint 90
  seaFoam: '#54c7ec', // Sea Foam
  seaFoamDark3: '#186d90', // Sea Foam - Dark 3
  seaFoamDark2: '#2088af', // Sea Foam - Dark 2
  seaFoamDark1: '#39afd5', // Sea Foam - Dark 1
  seaFoamTint15: '#6bcfef', // Sea Foam - Tint 15
  seaFoamTint30: '#84d8f2', // Sea Foam - Tint 30
  seaFoamTint50: '#a7e3f6', // Sea Foam - Tint 50
  seaFoamTint70: '#caeef9', // Sea Foam - Tint 70
  seaFoamTint90: '#eefafd', // Sea Foam - Tint 90
  teal: '#6bcebb', // Teal
  tealDark3: '#24917d', // Teal - Dark 3
  tealDark2: '#31a38d', // Teal - Dark 2
  tealDark1: '#4dbba6', // Teal - Dark 1
  tealTint15: '#80d4c4', // Teal - Tint 15
  tealTint30: '#97dccf', // Teal - Tint 30
  tealTint50: '#b4e6dd', // Teal - Tint 50
  tealTint70: '#d2f0ea', // Teal - Tint 70
  tealTint90: '#f0faf8', // Teal - Tint 90
  lime: '#a3ce71', // Lime
  limeDark3: '#629824', // Lime - Dark 3
  limeDark2: '#71a830', // Lime - Dark 2
  limeDark1: '#89be4c', // Lime - Dark 1
  limeTint15: '#b1d587', // Lime - Tint 15
  limeTint30: '#bedd9c', // Lime - Tint 30
  limeTint50: '#d1e6b9', // Lime - Tint 50
  limeTint70: '#e4f0d5', // Lime - Tint 70
  limeTint90: '#f6faf1', // Lime - Tint 90
  lemon: '#fcd872', // Lemon
  lemonDark3: '#d18f41', // Lemon - Dark 3
  lemonDark2: '#e1a43b', // Lemon - Dark 2
  lemonDark1: '#f5c33b', // Lemon - Dark 1
  lemonTint15: '#ffe18f', // Lemon - Tint 15
  lemonTint30: '#ffe8a8', // Lemon - Tint 30
  lemonTint50: '#ffecb5', // Lemon - Tint 50
  lemonTint70: '#fef2d1', // Lemon - Tint 70
  lemonTint90: '#fffbf0', // Lemon - Tint 90
  orange: '#f7923b', // Orange
  orangeDark3: '#ac4615', // Orange - Dark 3
  orangeDark2: '#cc5d22', // Orange - Dark 2
  orangeDark1: '#e07a2e', // Orange - Dark 1
  orangeTint15: '#f9a159', // Orange - Tint 15
  orangeTint30: '#f9b278', // Orange - Tint 30
  orangeTint50: '#fbc89f', // Orange - Tint 50
  orangeTint70: '#fcdec5', // Orange - Tint 70
  orangeTint90: '#fef4ec', // Orange - Tint 90
  tomato: '#fb724b', // Tomato - Tometo? Tomato.
  tomatoDark3: '#c32d0e', // Tomato - Dark 3
  tomatoDark2: '#db4123', // Tomato - Dark 2
  tomatoDark1: '#ef6632', // Tomato - Dark 1
  tomatoTint15: '#f1765e', // Tomato - Tint 15
  tomatoTint30: '#f38e7b', // Tomato - Tint 30
  tomatoTint50: '#f7afa0', // Tomato - Tint 50
  tomatoTint70: '#f9cfc7', // Tomato - Tint 70
  tomatoTint90: '#fdefed', // Tomato - Tint 90
  cherry: '#f35369', // Cherry
  cherryDark3: '#9b2b3a', // Cherry - Dark 3
  cherryDark2: '#b73749', // Cherry - Dark 2
  cherryDark1: '#e04c60', // Cherry - Dark 1
  cherryTint15: '#f36b7f', // Cherry - Tint 15
  cherryTint30: '#f58796', // Cherry - Tint 30
  cherryTint50: '#f8a9b4', // Cherry - Tint 50
  cherryTint70: '#fbccd2', // Cherry - Tint 70
  cherryTint90: '#feeef0', // Cherry - Tint 90
  pink: '#ec7ebd', // Pink
  pinkDark3: '#b0377b', // Pink - Dark 3
  pinkDark2: '#d4539b', // Pink - Dark 2
  pinkDark1: '#ec6fb5', // Pink - Dark 1
  pinkTint15: '#ef92c7', // Pink - Tint 15
  pinkTint30: '#f2a5d1', // Pink - Tint 30
  pinkTint50: '#f6bfdf', // Pink - Tint 50
  pinkTint70: '#f9d9eb', // Pink - Tint 70
  pinkTint90: '#fdf3f8', // Pink - Tint 90
  grape: '#8c72cb', // Grape
  grapeDark3: '#58409b', // Grape - Dark 3
  grapeDark2: '#6a51b2', // Grape - Dark 2
  grapeDark1: '#7b64c0', // Grape - Dark 1
  grapeTint15: '#9d87d2', // Grape - Tint 15
  grapeTint30: '#af9cda', // Grape - Tint 30
  grapeTint50: '#c6b8e5', // Grape - Tint 50
  grapeTint70: '#ddd5f0', // Grape - Tint 70
  grapeTint90: '#f4f1fa', // Grape - Tint 90
  // FIG Spectrum (Skin)
  skin1: '#f1d2b6', // Skin 1
  skin1Dark3: '#d9a170', // Skin 1 - Dark 3
  skin1Dark2: '#ddac82', // Skin 1 - Dark 2
  skin1Dark1: '#e2ba96', // Skin 1 - Dark 1
  skin1Tint15: '#f3d9c1', // Skin 1 - Tint 15
  skin1Tint30: '#f6e0cc', // Skin 1 - Tint 30
  skin1Tint50: '#f8e9db', // Skin 1 - Tint 50
  skin1Tint70: '#faf2ea', // Skin 1 - Tint 70
  skin1Tint90: '#fefbf8', // Skin 1 - Tint 90
  skin2: '#d7b195', // Skin 2
  skin2Dark3: '#af866a', // Skin 2 - Dark 3
  skin2Dark2: '#c2977a', // Skin 2 - Dark 2
  skin2Dark1: '#cfa588', // Skin 2 - Dark 1
  skin2Tint15: '#debda5', // Skin 2 - Tint 15
  skin2Tint30: '#e5c9b5', // Skin 2 - Tint 30
  skin2Tint50: '#ecd8cb', // Skin 2 - Tint 50
  skin2Tint70: '#f3e8e0', // Skin 2 - Tint 70
  skin2Tint90: '#fbf7f5', // Skin 2 - Tint 90
  skin3: '#d8a873', // Skin 3
  skin3Dark3: '#a77a4e', // Skin 3 - Dark 3
  skin3Dark2: '#ba8653', // Skin 3 - Dark 2
  skin3Dark1: '#cd9862', // Skin 3 - Dark 1
  skin3Tint15: '#e0b588', // Skin 3 - Tint 15
  skin3Tint30: '#e5c29e', // Skin 3 - Tint 30
  skin3Tint50: '#ecd4b9', // Skin 3 - Tint 50
  skin3Tint70: '#f4e5d6', // Skin 3 - Tint 70
  skin3Tint90: '#fcf6f1', // Skin 3 - Tint 90
  skin4: '#a67b4f', // Skin 4
  skin4Dark3: '#815830', // Skin 4 - Dark 3
  skin4Dark2: '#94683d', // Skin 4 - Dark 2
  skin4Dark1: '#a07243', // Skin 4 - Dark 1
  skin4Tint15: '#ae8761', // Skin 4 - Tint 15
  skin4Tint30: '#bc9d7d', // Skin 4 - Tint 30
  skin4Tint50: '#d0b9a2', // Skin 4 - Tint 50
  skin4Tint70: '#e2d5c8', // Skin 4 - Tint 70
  skin4Tint90: '#f6f1ed', // Skin 4 - Tint 90
  skin5: '#6a4f3b', // Skin 5
  skin5Dark3: '#453223', // Skin 5 - Dark 3
  skin5Dark2: '#503b2c', // Skin 5 - Dark 2
  skin5Dark1: '#624733', // Skin 5 - Dark 1
  skin5Tint15: '#8a715b', // Skin 5 - Tint 15
  skin5Tint30: '#9f8a79', // Skin 5 - Tint 30
  skin5Tint50: '#baaca0', // Skin 5 - Tint 50
  skin5Tint70: '#d5cdc6', // Skin 5 - Tint 70
  skin5Tint90: '#f2efec', // Skin 5 - Tint 90
  // macOS system colors
  macOSHighlight: '#dbe7fa', // used for text selection, tokens, etc.
  macOSHighlightActive: '#85afee', // active tokens
  macOSTitleBarBackgroundTop: '#eae9eb',
  macOSTitleBarBackgroundBottom: '#dcdbdc',
  macOSTitleBarBackgroundBlur: '#f6f6f6',
  macOSTitleBarBorder: '#c1c0c2',
  macOSTitleBarBorderBlur: '#cecece',
  macOSTitleBarIcon: '#6f6f6f',
  macOSTitleBarIconBlur: '#acacac',
  macOSTitleBarIconSelected: '#4d84f5',
  macOSTitleBarIconSelectedBlur: '#80a6f5',
  macOSTitleBarIconActive: '#4c4c4c',
  macOSTitleBarButtonBorder: '#d3d2d3',
  macOSTitleBarButtonBorderBottom: '#b0afb0',
  macOSTitleBarButtonBorderBlur: '#dbdbdb',
  macOSTitleBarButtonBackground: 'rgba(0,0,0,0.05)',
  macOSTitleBarButtonBackgroundBlur: '#f6f6f6',
  macOSTitleBarButtonBackgroundActiveHighlight: '#ededed',
  macOSTitleBarButtonBackgroundActive: '#e5e5e5',
  macOSSidebarSectionTitle: '#777',
  macOSSidebarSectionItem: '#434343',
  macOSSidebarPanelSeperator: '#b3b3b3',
  sectionHeaderBorder: '#DDDFE2',
  placeholder: '#A7AAB1',
  info: '#5ACFEC',
  // Warning colors
  warningTint: '#ecd9ad',
};

export const darkColors = {
  activeBackground: colors.dark80,
  backgroundWash: colors.dark95,
  barBackground: colors.dark90,
  barText: colors.dark20,
  dividers: colors.whiteAlpha10,
};

export const brandColors = {
  Facebook: '#0D7BED',
  Lite: '#0D7BED',
  Messenger: '#0088FA',
  Instagram: '#E61E68',
  WhatsApp: '#25D366',
  Workplace: '#20262c',
  'Work Chat': '#20262c',
  Flipper: theme.primaryColor,
};

// https://www.internalfb.com/intern/assets/set/facebook_icons/
export const brandIcons = {
  Facebook: 'app-facebook-f',
  Lite: 'app-facebook-f',
  Messenger: 'app-messenger',
  Instagram: 'app-instagram',
  WhatsApp: 'app-whatsapp',
  Workplace: 'app-workplace',
  'Work Chat': 'app-work-chat',
};
