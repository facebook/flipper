/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
const repoRoot = path.resolve(__dirname, '..');
const pluginsDir = path.join(
  repoRoot,
  'desktop',
  'plugins',
  'public',
);
const fbPluginsDir = path.resolve(
  repoRoot,
  'desktop',
  'plugins',
  'fb'
)
const generatedPluginsDocsDir = path.resolve(
  repoRoot,
  'docs',
  'features',
  'plugins',
);
const generatedPluginsSetupDocsDir = path.resolve(
  repoRoot,
  'docs',
  'setup',
  'plugins'
);
const generatedPluginSymlinksDir = path.resolve(
  __dirname,
  'src',
  'embedded-pages',
  'docs',
  'plugins'
);
const repoUrl = process.env.FB_INTERNAL ? 'https://www.internalfb.com/code/fbsource/xplat/sonar' : 'https://github.com/facebook/flipper/blob/master';
const relativePluginSymlinksDir = path.relative(
  generatedPluginsDocsDir,
  generatedPluginSymlinksDir,
);
async function generatePluginDocs() {
  await Promise.all([fs.emptyDir(generatedPluginsDocsDir), fs.emptyDir(generatedPluginsSetupDocsDir), fs.emptyDir(generatedPluginSymlinksDir)]);
  const publicDirs = (await fs.readdir(pluginsDir)).map(dir => path.join(pluginsDir, dir));
  const fbDirs = process.env.FB_INTERNAL ? (await fs.readdir(fbPluginsDir)).map(dir => path.join(fbPluginsDir, dir)) : [];
  const allDirs = [...publicDirs, ...fbDirs];
  for (const pluginSourceDir of allDirs) {
    const pluginSourceDocsDir = path.join(pluginSourceDir, 'docs');    
    const packageJsonPath = path.join(pluginSourceDir, 'package.json');
    if (
      (
        await Promise.all([
          fs.pathExists(pluginSourceDocsDir),
          fs.pathExists(packageJsonPath),
        ])
      ).every(p => p)
    ) {
      console.log(`Found docs in ${pluginSourceDir}`);
      const packageJson = await fs.readJson(packageJsonPath);
      const name: string = packageJson.name;
      const title: string = packageJson.title;
      const id = name.replace('flipper-plugin-', '');
      const generatedPluginResourcesPath = path.join(generatedPluginSymlinksDir, id);      
      await fs.symlink(pluginSourceDocsDir, generatedPluginResourcesPath, 'junction');
      const setupDocPath = path.join(pluginSourceDocsDir, 'setup.mdx');
      const setupDocsExists = await fs.pathExists(
        setupDocPath,
      );
      const overviewDocPath = path.join(pluginSourceDocsDir, 'overview.mdx');
      const overviewDocsExists = await fs.pathExists(
        overviewDocPath,
      );
      if (setupDocsExists) {
        const customEditUrl = `${repoUrl}/${path.relative(repoRoot, setupDocPath)}`;
        await fs.writeFile(
          path.join(generatedPluginsSetupDocsDir, `${id}.mdx`),
          `---
id: ${id}
title: ${title} Plugin Setup
sidebar_label: ${title}
custom_edit_url: ${customEditUrl}
---
import Article from '${relativePluginSymlinksDir}/${id}/setup.mdx';

<Article />
`,
        );
      }

      if (overviewDocsExists) {
        const customEditUrl = `${repoUrl}/${path.relative(repoRoot, overviewDocPath)}`;
        const linkToSetup = setupDocsExists
          ? `
→ [See setup instructions for the ${title} plugin](../../setup/plugins/${id}.mdx)
`
          : '';

        await fs.writeFile(
          path.join(generatedPluginsDocsDir, `${id}.mdx`),
          `---
id: ${id}
title: ${title} Plugin
sidebar_label: ${title}
custom_edit_url: ${customEditUrl}
---
import Article from '${relativePluginSymlinksDir}/${id}/overview.mdx';
${linkToSetup}

<Article />
`,
        );
      }
    }
  }
}

generatePluginDocs()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
