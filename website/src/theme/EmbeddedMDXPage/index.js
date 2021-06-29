/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import EmbeddedLayout from '@theme/EmbeddedLayout';
import {MDXProvider} from '@mdx-js/react';
import MDXComponents from '@theme/MDXComponents';
import {ThemeClassNames} from '@docusaurus/theme-common';

function EmbeddedMDXPage(props) {
  const {content: MDXPageContent} = props;
  return (
    <EmbeddedLayout
      wrapperClassName={ThemeClassNames.wrapper.mdxPages}
      pageClassName={ThemeClassNames.page.mdxPage}>
      <main>
        <MDXProvider components={MDXComponents}>
          <MDXPageContent />
        </MDXProvider>
      </main>
    </EmbeddedLayout>
  );
}

export default EmbeddedMDXPage;
