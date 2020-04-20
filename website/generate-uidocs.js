/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const reactDocs = require('react-docgen');
const glob = require('glob');
const fs = require('fs');
const babylon = require('@babel/parser');
const docblockParser = require('docblock-parser');

const HEADER = `---
id: ui-components
title: UI Components
---

Flipper has a lot of built in React components to build UIs. You can import them directly using e.g. \`import {Button} from 'flipper'\`.`;

const TARGET = __dirname + '/../docs/extending/ui-components.md';

glob(__dirname + '/../desktop/app/src/ui/components/**/*.tsx', (err, files) => {
  const content = files
    .map(f => [f, fs.readFileSync(f)])
    .map(([name, file]) => {
      try {
        const doc = reactDocs.parse(file, null, null, {filename: name});
        console.log(`✅  ${name}`);
        return doc;
      } catch (e) {
        const doc = parseHOC(name, file);
        if (doc) {
          console.log(`✅  HOC: ${name}`);
          return doc;
        } else {
          console.error(`❌  ${name}: ${e.message}`);
          return null;
        }
      }
    })
    .filter(Boolean)
    .map(generateMarkdown)
    .reduce((acc, cv) => acc + cv, '');
  fs.writeFileSync(TARGET, HEADER + content);
});

// HOC are not supported by react-docgen. This means, styled-components will not
// work. This is why we implement our own parser to information from these HOCs.
function parseHOC(name, file) {
  try {
    const ast = babylon.parse(file.toString(), {
      sourceType: 'module',
      plugins: ['typescript', 'objectRestSpread', 'classProperties'],
    });

    // find the default export from the file
    const exportDeclaration = ast.program.body.find(
      node => node.type === 'ExportDefaultDeclaration',
    );

    if (exportDeclaration) {
      // find doc comment right before the export
      const comment = ast.comments.find(
        c => c.end + 1 === exportDeclaration.start,
      );
      if (comment) {
        return {
          // use the file's name as name for the component
          displayName: name
            .split('/')
            .reverse()[0]
            .replace(/\.js$/, ''),
          description: docblockParser.parse(comment.value).text,
        };
      }
    }
  } catch (e) {}
  return null;
}

function generateMarkdown(component) {
  let props;
  if (component.props && Object.keys(component.props).length > 0) {
    props = '| Property | Type | Description |\n';
    props += '|---------|------|-------------|\n';
    Object.keys(component.props).forEach(prop => {
      let {tsType, description} = component.props[prop];

      let type = '';
      if (tsType) {
        if (tsType.nullable) {
          type += '?';
        }

        type +=
          tsType.name === 'signature' ||
          tsType.name === 'union' ||
          tsType.name === 'Array'
            ? tsType.raw
            : tsType.name;
      }

      // escape pipes and new lines because they will break tables
      type = type.replace(/\n/g, ' ').replace(/\|/g, '⎮');
      description = description
        ? description.replace(/\n/g, ' ').replace(/\|/g, '⎮')
        : '';

      props += `| \`${prop}\` | \`${type}\` | ${description} |\n`;
    });
  }
  return `
## ${component.displayName}

${component.description || ''}

${props || ''}
  `;
}
