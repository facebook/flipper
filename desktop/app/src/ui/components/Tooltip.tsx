/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TooltipOptions, TooltipContext} from './TooltipProvider';
import styled from '@emotion/styled';
import React, {useContext, useCallback, useRef, useEffect} from 'react';

const TooltipContainer = styled.div({
  display: 'contents',
});
TooltipContainer.displayName = 'Tooltip:TooltipContainer';

type TooltipProps = {
  /** Content shown in the tooltip */
  title: React.ReactNode;
  /** Component that will show the tooltip */
  children: React.ReactNode;
  options?: TooltipOptions;
};

export default function Tooltip(props: TooltipProps) {
  const tooltipManager = useContext(TooltipContext);
  const ref = useRef<HTMLDivElement | null>();
  const isOpen = useRef<boolean>(false);
  const {title, options} = props;

  useEffect(
    () => () => {
      if (isOpen.current) {
        tooltipManager.close();
      }
    },
    [title, options],
  );

  const onMouseEnter = useCallback(() => {
    if (ref.current && title) {
      tooltipManager.open(ref.current, title, options || {});
      isOpen.current = true;
    }
  }, [options, title, isOpen, ref]);

  const onMouseLeave = useCallback(() => {
    if (isOpen.current) {
      tooltipManager.close();
      isOpen.current = false;
    }
  }, [isOpen]);

  return (
    <TooltipContainer
      ref={ref as any}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      {props.children}
    </TooltipContainer>
  );
}
