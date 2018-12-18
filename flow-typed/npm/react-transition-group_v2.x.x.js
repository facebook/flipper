// flow-typed signature: 896bbb51b1a943fefff583786cd4d0c0
// flow-typed version: b6c24caf38/react-transition-group_v2.x.x/flow_>=v0.60.x

// @flow

declare module 'react-transition-group' {
  declare export type CSSTransitionClassNames = {
    appear?: string,
    appearActive?: string,
    enter?: string,
    enterActive?: string,
    enterDone?: string,
    exit?: string,
    exitActive?: string,
    exitDone?: string,
  };

  declare export type TransitionStatus = 'entering' | 'entered' | 'exiting' | 'exited' | 'unmounted';

  declare export type EndHandler = (node: HTMLElement, done: () => void) => void;
  declare export type EnterHandler = (node: HTMLElement, isAppearing: boolean) => void;
  declare export type ExitHandler = (node: HTMLElement) => void;

  declare type TransitionActions = {
    appear?: boolean;
    enter?: boolean;
    exit?: boolean;
  }

  declare type TransitionProps = TransitionActions & {
    mountOnEnter?: boolean,
    unmountOnExit?: boolean,
    onEnter?: EnterHandler,
    onEntering?: EnterHandler,
    onEntered?: EnterHandler,
    onExit?: ExitHandler,
    onExiting?: ExitHandler,
    onExited?: ExitHandler,
  } & ({
    timeout: number | { enter?: number, exit?: number },
    addEndListener?: null,
  } | {
    timeout?: number | { enter?: number, exit?: number },
    addEndListener: EndHandler,
  })

  declare export class Transition extends React$Component<TransitionProps & {
    in?: boolean,
    children: ((status: TransitionStatus) => React$Node) | React$Node,
  }> {}

  declare export class TransitionGroup extends React$Component<TransitionActions & {
    component?: React$ElementType | null,
    children?: React$Node,
    childFactory?: (child: React$Node) => React$Node,
  }> {}

  declare export class ReplaceTransition extends React$Component<TransitionProps & {
    in: boolean,
    children: React$Node,
  }> {}

  declare export class CSSTransition extends React$Component<TransitionProps & {
    in?: boolean,
    classNames: string | CSSTransitionClassNames,
    children?: ((status: TransitionStatus) => React$Node) | React$Node,
  }> {}
}
