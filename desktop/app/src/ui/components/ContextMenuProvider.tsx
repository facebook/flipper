/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import electron, {MenuItemConstructorOptions} from 'electron';
import React, {useRef, memo, createContext, useMemo, useCallback} from 'react';

type MenuTemplate = Array<MenuItemConstructorOptions>;
interface ContextMenuManager {
  appendToContextMenu(items: MenuTemplate): void;
}

const Container = styled.div({
  display: 'flex',
  height: '100%',
});
Container.displayName = 'ContextMenuProvider:Container';

export const ContextMenuContext =
  createContext<ContextMenuManager | undefined>(undefined);
/**
 * Flipper's root is already wrapped with this component, so plugins should not
 * need to use this. ContextMenu is what you probably want to use.
 * @deprecated use https://ant.design/components/dropdown/#components-dropdown-demo-context-menu
 */
const ContextMenuProvider: React.FC<{}> = memo(function ContextMenuProvider({
  children,
}) {
  const menuTemplate = useRef<MenuTemplate>([]);
  const contextMenuManager = useMemo(
    () => ({
      appendToContextMenu(items: MenuTemplate) {
        menuTemplate.current = menuTemplate.current.concat(items);
      },
    }),
    [],
  );
  const onContextMenu = useCallback(() => {
    const menu = electron.remote.Menu.buildFromTemplate(menuTemplate.current);
    menuTemplate.current = [];
    menu.popup({window: electron.remote.getCurrentWindow()});
  }, []);

  return (
    <ContextMenuContext.Provider value={contextMenuManager}>
      <Container onContextMenu={onContextMenu}>{children}</Container>
    </ContextMenuContext.Provider>
  );
});

export default ContextMenuProvider;
