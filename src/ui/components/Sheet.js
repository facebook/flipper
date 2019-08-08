/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import {createPortal} from 'react-dom';
import {connect} from 'react-redux';
import {
  ACTIVE_SHEET_PLUGIN_SHEET,
  setActiveSheet,
} from '../../reducers/application.tsx';

import type {ActiveSheet} from '../../reducers/application.tsx';

export const PLUGIN_SHEET_ELEMENT_ID = 'pluginSheetContents';

type Props = {
  /**
   * Function as child component (FaCC) to render the contents of the sheet.
   * A `onHide` function is passed as argument, that can be called to remove
   * the sheet.
   */
  children: (onHide: () => void) => ?React.Node,
  /**
   * Function that is called when the sheet becomes hidden.
   */
  onHideSheet: () => void,
  setActiveSheet: (sheet: ActiveSheet) => any,
  activeSheet: ActiveSheet,
};

type State = {
  content: ?React.Node,
};

/**
 * Usage: <Sheet>{onHide => <YourSheetContent onHide={onHide} />}</Sheet>
 */
class Sheet extends Component<Props, State> {
  static getDerivedStateFromProps(props: Props) {
    if (props.activeSheet === 'PLUGIN_SHEET') {
      return {
        content: props.children(() => {
          props.setActiveSheet(null);
        }),
      };
    }
    return null;
  }

  state = {
    content: this.props.children(() => {
      this.props.setActiveSheet(null);
    }),
  };

  componentDidMount() {
    this.showSheetIfContentsAvailable();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState.content !== this.state.content) {
      this.showSheetIfContentsAvailable();
    }
    if (
      prevProps.activeSheet === ACTIVE_SHEET_PLUGIN_SHEET &&
      this.props.activeSheet !== ACTIVE_SHEET_PLUGIN_SHEET
    ) {
      this.onHideSheet();
    }
  }

  onHideSheet = () => {
    if (this.props.onHideSheet != null) {
      this.props.onHideSheet();
    }
  };

  showSheetIfContentsAvailable = () => {
    if (this.state.content) {
      this.props.setActiveSheet('PLUGIN_SHEET');
    } else {
      this.props.setActiveSheet(null);
    }
  };

  render() {
    const container = document.getElementById(PLUGIN_SHEET_ELEMENT_ID);
    if (this.state.content && container) {
      return createPortal(this.state.content, container);
    }
    if (this.state.content) {
      console.warn(
        `The <Sheet> could not be displayed, because there was not element#${PLUGIN_SHEET_ELEMENT_ID}.`,
      );
    }
    return null;
  }
}

// $FlowFixMe
export default connect(
  ({application: {activeSheet}}) => ({activeSheet}),
  {setActiveSheet},
)(Sheet);
