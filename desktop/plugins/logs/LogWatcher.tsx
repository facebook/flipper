/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TableBodyRow} from 'flipper';

import {
  PureComponent,
  FlexColumn,
  Panel,
  Input,
  Toolbar,
  Text,
  ManagedTable,
  Button,
  colors,
  styled,
} from 'flipper';
import React from 'react';

export type Counter = {
  readonly expression: RegExp;
  readonly count: number;
  readonly notify: boolean;
  readonly label: string;
};

type Props = {
  readonly onChange: (counters: ReadonlyArray<Counter>) => void;
  readonly counters: ReadonlyArray<Counter>;
};

type State = {
  readonly input: string;
  readonly highlightedRow: string | null;
};

const ColumnSizes = {
  expression: '70%',
  count: '15%',
  notify: 'flex',
};

const Columns = {
  expression: {
    value: 'Expression',
    resizable: false,
  },
  count: {
    value: 'Count',
    resizable: false,
  },
  notify: {
    value: 'Notify',
    resizable: false,
  },
};

const Count = styled(Text)({
  alignSelf: 'center',
  background: colors.macOSHighlightActive,
  color: colors.white,
  fontSize: 12,
  fontWeight: 500,
  textAlign: 'center',
  borderRadius: '999em',
  padding: '4px 9px 3px',
  lineHeight: '100%',
  marginLeft: 'auto',
});

const Checkbox = styled(Input)({
  lineHeight: '100%',
  padding: 0,
  margin: 0,
  height: 'auto',
  alignSelf: 'center',
});

const ExpressionInput = styled(Input)({
  flexGrow: 1,
});

const WatcherPanel = styled(Panel)({
  minHeight: 200,
});

export default class LogWatcher extends PureComponent<Props, State> {
  state = {
    input: '',
    highlightedRow: null,
  };

  _inputRef: HTMLInputElement | undefined;

  onAdd = () => {
    if (
      this.props.counters.findIndex(({label}) => label === this.state.input) >
        -1 ||
      this.state.input.length === 0
    ) {
      // prevent duplicates
      return;
    }
    this.props.onChange([
      ...this.props.counters,
      {
        label: this.state.input,
        expression: new RegExp(this.state.input, 'gi'),
        notify: false,
        count: 0,
      },
    ]);
    this.setState({input: ''});
  };

  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      input: e.target.value,
    });
  };

  resetCount = (index: number) => {
    const newCounters = [...this.props.counters];
    newCounters[index] = {
      ...newCounters[index],
      count: 0,
    };
    this.props.onChange(newCounters);
  };

  buildRows = (): Array<TableBodyRow> => {
    return this.props.counters.map(({label, count, notify}, i) => ({
      columns: {
        expression: {
          value: <Text code={true}>{label}</Text>,
        },
        count: {
          value: <Count onClick={() => this.resetCount(i)}>{count}</Count>,
        },
        notify: {
          value: (
            <Checkbox
              type="checkbox"
              checked={notify}
              onChange={() => this.setNotification(i, !notify)}
            />
          ),
        },
      },
      key: label,
    }));
  };

  setNotification = (index: number, notify: boolean) => {
    const newCounters: Array<Counter> = [...this.props.counters];
    newCounters[index] = {
      ...newCounters[index],
      notify,
    };
    this.props.onChange(newCounters);
  };

  onRowHighlighted = (rows: Array<string>) => {
    this.setState({
      highlightedRow: rows.length === 1 ? rows[0] : null,
    });
  };

  onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.handleDelete();
    }
  };

  onSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.onAdd();
    }
  };

  handleDelete = () => {
    if (this.state.highlightedRow != null) {
      this.props.onChange(
        this.props.counters.filter(
          ({label}) => label !== this.state.highlightedRow,
        ),
      );
    }
  };

  render() {
    return (
      <FlexColumn grow={true} tabIndex={-1} onKeyDown={this.onKeyDown}>
        <WatcherPanel
          heading="Expression Watcher"
          floating={false}
          collapsable={true}
          padded={false}>
          <Toolbar>
            <ExpressionInput
              value={this.state.input}
              placeholder="Expression..."
              onChange={this.onChange}
              onKeyDown={this.onSubmit}
            />
            <Button
              onClick={this.onAdd}
              disabled={this.state.input.length === 0}>
              Add counter
            </Button>
          </Toolbar>
          <ManagedTable
            onRowHighlighted={this.onRowHighlighted}
            columnSizes={ColumnSizes}
            columns={Columns}
            rows={this.buildRows()}
            autoHeight={true}
            floating={false}
            zebra={false}
            buildContextMenuItems={() => {
              return [{label: 'Delete', click: this.handleDelete}];
            }}
          />
        </WatcherPanel>
      </FlexColumn>
    );
  }
}
