/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import noConsoleErrorWithoutContext, {
  RULE_NAME as noConsoleErrorWithoutContextRuleName,
} from './rules/noConsoleErrorWithoutContext';
import noTsFileExtension, {
  RULE_NAME as noTsFileExtensionRuleName,
} from './rules/noTsFileExtension';
import noIPrefixInterfaces, {
  RULE_NAME as noIPrefixInterfacesRuleName,
} from './rules/noIPrefixInterfaces';
import noInterfaceProps, {
  RULE_NAME as noInterfacePropsRuleName,
} from './rules/noInterfacePropsOrState';

module.exports = {
  rules: {
    [noRelativeImportsAcrossPackagesRuleName]: noRelativeImportsAcrossPackages,
    [noElectronRemoteImportsRuleName]: noElectronRemoteImports,
    [noConsoleErrorWithoutContextRuleName]: noConsoleErrorWithoutContext,
    [noTsFileExtensionRuleName]: noTsFileExtension,
    [noIPrefixInterfacesRuleName]: noIPrefixInterfaces,
    [noInterfacePropsRuleName]: noInterfaceProps,
  },
};
