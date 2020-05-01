/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component} from 'react';
import {createPortal} from 'react-dom';
import {connect} from 'react-redux';
import {
  ACTIVE_SHEET_PLUGIN_SHEET,
  setActiveSheet,
  ActiveSheet,
} from '../../reducers/application';
import {State as Store} from '../../reducers';

export const PLUGIN_SHEET_ELEMENT_ID = 'pluginSheetContents';

type OwnProps = {
  /**
   * Function as child component (FaCC) to render the contents of the sheet.
   * A `onHide` function is passed as argument, that can be called to remove
   * the sheet.
   */
  children: (onHide: () => void) => React.ReactNode | undefined;
  onHideSheet?: () => void;
};

type StateFromProps = {
  /**
   * Function that is called when the sheet becomes hidden.
   */
  activeSheet: ActiveSheet;
};

type DispatchFromProps = {
  setActiveSheet: (sheet: ActiveSheet) => any;
};

type State = {
  content: React.ReactNode | undefined;
};

type Props = OwnProps & DispatchFromProps & StateFromProps;

/**
 * Usage: `<Sheet>{onHide => <YourSheetContent onHide={onHide} />}</Sheet>`
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

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({application: {activeSheet}}) => ({activeSheet}),
  {setActiveSheet},
)(Sheet);
