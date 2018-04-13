/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

/* List of projects/orgs using your project for the users page */
const users = [
  {
    caption: 'User1',
    image: '/test-site/img/docusaurus.svg',
    infoLink: 'https://www.facebook.com',
    pinned: true,
  },
];

const siteConfig = {
  title: 'Sonar' /* title for your website */,
  tagline: 'Extensible mobile app debugging',
  url: 'https://fbsonar.com/' /* your website url */,
  baseUrl: '/' /* base url for your project */,
  projectName: 'sonar',
  headerLinks: [
    {doc: 'doc1', label: 'Docs'},
    {doc: 'doc4', label: 'API'},
    {page: 'help', label: 'Help'},
  ],
  users,
  /* path to images for header/footer */
  headerIcon: 'img/icon.png',
  footerIcon: 'img/icon.png',
  favicon: 'img/icon.png',
  /* colors for website */
  colors: {
    primaryColor: '#121020',
    secondaryColor: '#121020',
  },
  // This copyright info is used in /core/Footer.js and blog rss/atom feeds.
  copyright: 'Copyright © ' + new Date().getFullYear() + ' Facebook',
  // organizationName: 'deltice', // or set an env variable ORGANIZATION_NAME
  // projectName: 'test-site', // or set an env variable PROJECT_NAME
  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks
    theme: 'default',
  },
  // You may provide arbitrary config keys to be used as needed by your template.
  repoUrl: 'https://github.com/facebookincubator/sonar',
  /* On page navigation for the current documentation page */
  // onPageNav: 'separate',
  stylesheets: [],
};

module.exports = siteConfig;
