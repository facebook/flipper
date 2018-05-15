/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {Component} from 'react';
import {
  CodeBlock,
  colors,
  ManagedTable,
  FlexColumn,
  Text,
  ManagedDataInspector,
  Input,
  View,
} from '../index';
import type {TableBodyRow, TableRows} from 'sonar';
import type {PluginClient} from '../../plugin';

type ValueWithType = {|
  type: string,
  value: any,
|};
type SuccessResult = {|
  isSuccess: true,
  value: ValueWithType,
|};
type FailedResult = {|
  isSuccess: false,
  error: string,
|};

type CommandResult = SuccessResult | FailedResult;

type Props = {
  client: PluginClient,
  getContext: () => string,
};
type State = {
  isConsoleEnabled: boolean,
  script: string,
  previousExecutions: Array<{
    command: string,
    result: CommandResult,
  }>,
};

class ConsoleError extends Component<{
  error: Error | string | void,
  className?: string,
}> {
  static Container = CodeBlock.extends({
    backgroundColor: colors.redTint,
    color: colors.red,
    overflow: 'auto',
    flexGrow: 1,
    margin: '0 -8px',
    padding: '0 8px',
  });

  render() {
    const {className, error} = this.props;

    return (
      <ConsoleError.Container className={className}>
        {error}
      </ConsoleError.Container>
    );
  }
}

export class Console extends Component<Props, State> {
  static title = 'Console';
  static id = 'Console';
  static icon = 'chevron-right';

  static TableColumns = {
    command: {
      value: 'Commands',
    },
  };

  static CommandsTable = ManagedTable.extends({
    flexGrow: 1,
  });
  static Window = FlexColumn.extends({
    padding: '15px',
    flexGrow: 1,
  });
  static Input = Input.extends({
    width: '100%',
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      isConsoleEnabled: false,
      script: '',
      previousExecutions: [],
    };
  }

  executeScriptOnDevice = () => {
    this.props.client
      .call('executeCommand', {
        command: this.state.script,
        context: this.props.getContext(),
      })
      .then((result: ValueWithType) => {
        this.setState({
          script: '',
          previousExecutions: [
            ...this.state.previousExecutions,
            {
              command: this.state.script,
              result: {isSuccess: true, value: result},
            },
          ],
        });
      })
      .catch((onReject?) => {
        this.setState({
          previousExecutions: [
            ...this.state.previousExecutions,
            {
              command: this.state.script,
              result: {
                isSuccess: false,
                error: (onReject && onReject.message) || '',
              },
            },
          ],
        });
      });
  };

  onInputChange = (event: SyntheticInputEvent<>) => {
    this.setState({script: event.target.value});
  };

  onSubmit = (event: SyntheticEvent<>) => {
    if (this.state.script != '') {
      this.executeScriptOnDevice();
    }
    event.preventDefault();
  };

  buildCommandResultRowPair(
    command: string,
    result: CommandResult,
    index: number,
  ): TableRows {
    const key = index * 2;
    const commandRow: TableBodyRow = {
      columns: {
        command: {value: <Text>{command}</Text>},
      },
      key: key.toString(),
    };
    const resultRow: TableBodyRow = {
      columns: {
        command: {
          value: result.isSuccess ? (
            <ManagedDataInspector
              data={result.value}
              expandRoot={true}
              collapsed={true}
            />
          ) : (
            <ConsoleError error={result.error} />
          ),
        },
      },
      key: (key + 1).toString(),
    };
    return [commandRow, resultRow];
  }

  renderPreviousCommands() {
    const rows: TableRows = this.state.previousExecutions
      .map(({command, result}, index) =>
        this.buildCommandResultRowPair(command, result, index),
      )
      .reduce((x, y) => x.concat(y), []);
    return rows.length ? (
      <Console.CommandsTable
        columns={Console.TableColumns}
        rows={rows}
        multiline={true}
        stickyBottom={true}
        highlightableRows={false}
        hideHeader={true}
        autoHeight={true}
      />
    ) : null;
  }

  render() {
    return (
      <Console.Window>
        <View fill>{this.renderPreviousCommands()}</View>
        <form onSubmit={this.onSubmit}>
          <Console.Input
            onChange={this.onInputChange}
            placeholder="Command"
            value={this.state.script}
          />
        </form>
      </Console.Window>
    );
  }
}
