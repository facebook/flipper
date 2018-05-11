/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {DataInspectorSetValue} from './DataInspector.js';
import {PureComponent} from 'react';
import styled from '../../styled/index.js';
import {SketchPicker} from 'react-color';
import {Component} from 'react';
import Popover from '../Popover.js';
import {colors} from '../colors.js';
import Input from '../Input.js';

const NullValue = styled.text({
  color: 'rgb(128, 128, 128)',
});

const UndefinedValue = styled.text({
  color: 'rgb(128, 128, 128)',
});

const StringValue = styled.text({
  color: colors.cherryDark1,
});

const ColorValue = styled.text({
  color: colors.blueGrey,
});

const SymbolValue = styled.text({
  color: 'rgb(196, 26, 22)',
});

const NumberValue = styled.text({
  color: colors.tealDark1,
});

const ColorBox = styled.text(
  {
    backgroundColor: props => props.color,
    boxShadow: 'inset 0 0 1px rgba(0, 0, 0, 1)',
    display: 'inline-block',
    height: 12,
    marginRight: 5,
    verticalAlign: 'middle',
    width: 12,
  },
  {
    ignoreAttributes: ['color'],
  },
);

const FunctionKeyword = styled.text({
  color: 'rgb(170, 13, 145)',
  fontStyle: 'italic',
});

const FunctionName = styled.text({
  fontStyle: 'italic',
});

const ColorPickerDescription = styled.view({
  display: 'inline',
  position: 'relative',
});

type DataDescriptionProps = {|
  path?: Array<string>,
  type: string,
  value: any,
  setValue: ?DataInspectorSetValue,
|};

type DescriptionCommitOptions = {|
  value: any,
  keep: boolean,
  clear: boolean,
|};

class NumberTextEditor extends PureComponent<{
  commit: (opts: DescriptionCommitOptions) => void,
  type: string,
  value: any,
  origValue: any,
}> {
  onNumberTextInputChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    const val =
      this.props.type === 'number'
        ? parseFloat(e.target.value)
        : e.target.value;
    this.props.commit({
      clear: false,
      keep: true,
      value: val,
    });
  };

  onNumberTextInputKeyDown = (e: SyntheticKeyboardEvent<*>) => {
    if (e.key === 'Enter') {
      const val =
        this.props.type === 'number'
          ? parseFloat(this.props.value)
          : this.props.value;
      this.props.commit({clear: true, keep: true, value: val});
    } else if (e.key === 'Escape') {
      this.props.commit({
        clear: true,
        keep: false,
        value: this.props.origValue,
      });
    }
  };

  onNumberTextRef = (ref: ?HTMLElement) => {
    if (ref) {
      ref.focus();
    }
  };

  onNumberTextBlur = () => {
    this.props.commit({clear: true, keep: true, value: this.props.value});
  };

  render() {
    const extraProps: Object = {};
    if (this.props.type === 'number') {
      // render as a HTML number input
      extraProps.type = 'number';

      // step="any" allows any sort of float to be input, otherwise we're limited
      // to decimal
      extraProps.step = 'any';
    }

    return (
      <Input
        key="input"
        {...extraProps}
        compact={true}
        onChange={this.onNumberTextInputChange}
        onKeyDown={this.onNumberTextInputKeyDown}
        innerRef={this.onNumberTextRef}
        onBlur={this.onNumberTextBlur}
        value={this.props.value}
      />
    );
  }
}

type DataDescriptionState = {|
  editing: boolean,
  origValue: any,
  value: any,
|};

export default class DataDescription extends PureComponent<
  DataDescriptionProps,
  DataDescriptionState,
> {
  constructor(props: DataDescriptionProps, context: Object) {
    super(props, context);

    this.state = {
      editing: false,
      origValue: '',
      value: '',
    };
  }

  commit = (opts: DescriptionCommitOptions) => {
    const {path, setValue} = this.props;
    if (opts.keep && setValue && path) {
      const val = opts.value;
      this.setState({value: val});
      setValue(path, val);
    }

    if (opts.clear) {
      this.setState({
        editing: false,
        origValue: '',
        value: '',
      });
    }
  };

  _renderEditing() {
    const {type} = this.props;
    const {origValue, value} = this.state;

    if (
      type === 'string' ||
      type === 'text' ||
      type === 'number' ||
      type === 'enum'
    ) {
      return (
        <NumberTextEditor
          type={type}
          value={value}
          origValue={origValue}
          commit={this.commit}
        />
      );
    }

    if (type === 'color') {
      return <ColorEditor value={value} commit={this.commit} />;
    }

    return null;
  }

  _hasEditUI() {
    const {type} = this.props;
    return (
      type === 'string' ||
      type === 'text' ||
      type === 'number' ||
      type === 'enum' ||
      type === 'color'
    );
  }

  onEditStart = () => {
    this.setState({
      editing: this._hasEditUI(),
      origValue: this.props.value,
      value: this.props.value,
    });
  };

  render(): any {
    if (this.state.editing) {
      return this._renderEditing();
    } else {
      return (
        <DataDescriptionPreview
          type={this.props.type}
          value={this.props.value}
          editable={Boolean(this.props.setValue)}
          commit={this.commit}
          onEdit={this.onEditStart}
        />
      );
    }
  }
}

class ColorEditor extends Component<{
  value: any,
  commit: (opts: DescriptionCommitOptions) => void,
}> {
  onBlur = () => {
    this.props.commit({clear: true, keep: false, value: this.props.value});
  };

  onChange = ({
    hex,
    rgb: {a, b, g, r},
  }: {
    hex: string,
    rgb: {a: number, b: number, g: number, r: number},
  }) => {
    const prev = this.props.value;

    let val;
    if (typeof prev === 'string') {
      if (a === 1) {
        // hex is fine and has an implicit 100% alpha
        val = hex;
      } else {
        // turn into a css rgba value
        val = `rgba(${r}, ${g}, ${b}, ${a})`;
      }
    } else if (typeof prev === 'number') {
      // compute RRGGBBAA value
      val = (Math.round(a * 255) & 0xff) << 24;
      val |= (r & 0xff) << 16;
      val |= (g & 0xff) << 8;
      val |= b & 0xff;

      const prevClear = ((prev >> 24) & 0xff) === 0;
      const onlyAlphaChanged = (prev & 0x00ffffff) === (val & 0x00ffffff);

      if (!onlyAlphaChanged && prevClear) {
        val = 0xff000000 | (val & 0x00ffffff);
      }
    } else {
      return;
    }

    this.props.commit({clear: false, keep: true, value: val});
  };

  render() {
    const colorInfo = parseColor(this.props.value);
    if (!colorInfo) {
      return;
    }

    return (
      <ColorPickerDescription>
        <DataDescriptionPreview
          type="color"
          value={this.props.value}
          editable={false}
          commit={this.props.commit}
        />
        <Popover onDismiss={this.onBlur}>
          <SketchPicker
            color={colorInfo}
            presetColors={[
              colors.blue,
              colors.green,
              colors.red,
              colors.blueGrey,
              colors.slate,
              colors.aluminum,
              colors.seaFoam,
              colors.teal,
              colors.lime,
              colors.lemon,
              colors.orange,
              colors.tomato,
              colors.cherry,
              colors.pink,
              colors.grape,
            ]}
            onChange={this.onChange}
          />
        </Popover>
      </ColorPickerDescription>
    );
  }
}

class DataDescriptionPreview extends Component<{
  type: string,
  value: any,
  editable: boolean,
  commit: (opts: DescriptionCommitOptions) => void,
  onEdit?: () => void,
}> {
  onClick = () => {
    const {onEdit} = this.props;
    if (this.props.editable && onEdit) {
      onEdit();
    }
  };

  render() {
    const {type, value} = this.props;

    const description = (
      <DataDescriptionContainer
        type={type}
        value={value}
        editable={this.props.editable}
        commit={this.props.commit}
      />
    );

    // booleans are always editable so don't require the onEditStart handler
    if (type === 'boolean') {
      return description;
    }

    return (
      <span onClick={this.onClick} role="button" tabIndex={-1}>
        {description}
      </span>
    );
  }
}

function parseColor(
  val: string | number,
): ?{|
  r: number,
  g: number,
  b: number,
  a: number,
|} {
  if (typeof val === 'number') {
    const a = ((val >> 24) & 0xff) / 255;
    const r = (val >> 16) & 0xff;
    const g = (val >> 8) & 0xff;
    const b = val & 0xff;
    return {a, b, g, r};
  }
  if (typeof val !== 'string') {
    return;
  }
  if (val[0] !== '#') {
    return;
  }

  // remove leading hash
  val = val.slice(1);

  // only allow RGB and ARGB hex values
  if (val.length !== 3 && val.length !== 6 && val.length !== 8) {
    return;
  }

  // split every 2 characters
  const parts = val.match(/.{1,2}/g);
  if (!parts) {
    return;
  }

  // get the alpha value
  let a = 1;

  // extract alpha if passed AARRGGBB
  if (val.length === 8) {
    a = parseInt(parts.shift(), 16) / 255;
  }

  const size = val.length;
  const [r, g, b] = parts.map(num => {
    if (size === 3) {
      return parseInt(num + num, 16);
    } else {
      return parseInt(num, 16);
    }
  });

  return {a, b, g, r};
}

class DataDescriptionContainer extends Component<{
  type: string,
  value: any,
  editable: boolean,
  commit: (opts: DescriptionCommitOptions) => void,
}> {
  onChangeCheckbox = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.props.commit({clear: true, keep: true, value: e.target.checked});
  };

  render(): any {
    const {type, editable, value: val} = this.props;

    switch (type) {
      case 'number':
        return <NumberValue>{Number(val)}</NumberValue>;

      case 'color': {
        const colorInfo = parseColor(val);
        if (colorInfo) {
          const {a, b, g, r} = colorInfo;
          return [
            <ColorBox key="color-box" color={`rgba(${r}, ${g}, ${b}, ${a})`} />,
            <ColorValue key="value">
              rgba({r}, {g}, {b}, {a === 1 ? '1' : a.toFixed(2)})
            </ColorValue>,
          ];
        } else {
          return <span>Malformed color</span>;
        }
      }

      case 'text':
      case 'string':
        return <StringValue>"{String(val || '')}"</StringValue>;

      case 'enum':
        return <StringValue>{String(val)}</StringValue>;

      case 'boolean':
        return editable ? (
          <input
            type="checkbox"
            checked={Boolean(val)}
            disabled={!editable}
            onChange={this.onChangeCheckbox}
          />
        ) : (
          <StringValue>{String(val)}</StringValue>
        );

      case 'undefined':
        return <UndefinedValue>undefined</UndefinedValue>;

      case 'date':
        if (Object.prototype.toString.call(val) === '[object Date]') {
          return <span>{val.toString()}</span>;
        } else {
          return <span>{val}</span>;
        }

      case 'null':
        return <NullValue>null</NullValue>;

      case 'array':
      case 'object':
        // no description necessary as we'll typically wrap it in [] or {} which already denotes the
        // type
        return null;

      case 'function':
        return (
          <span>
            <FunctionKeyword>function</FunctionKeyword>
            <FunctionName>&nbsp;{val.name}()</FunctionName>
          </span>
        );

      case 'symbol':
        return <SymbolValue>Symbol()</SymbolValue>;

      default:
        return <span>Unknown type "{type}"</span>;
    }
  }
}
