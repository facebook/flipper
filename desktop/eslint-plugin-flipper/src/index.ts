/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import noRelativeImportsAcrossPackages, {
  RULE_NAME as noRelativeImportsAcrossPackagesRuleName,
} from './rules/noRelativeImportsAcrossPackages';
import noElectronRemoteImports, {
  RULE_NAME as noElectronRemoteImportsRuleName,
} from './rules/noElectronRemoteImports';

module.exports = {
  rules: {
    [noRelativeImportsAcrossPackagesRuleName]: noRelativeImportsAcrossPackages,
    [noElectronRemoteImportsRuleName]: noElectronRemoteImports,
  },
};
