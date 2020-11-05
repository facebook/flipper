/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Link from '../Link';
import {DataInspectorSetValue} from './DataInspector';
import {PureComponent} from 'react';
import styled from '@emotion/styled';
import {SketchPicker, CompactPicker} from 'react-color';
import Popover from '../Popover';
import {colors} from '../colors';
import Input from '../Input';
import React, {KeyboardEvent} from 'react';
import Glyph from '../Glyph';
import {HighlightContext} from '../Highlight';
import Select from '../Select';
import TimelineDataDescription from './TimelineDataDescription';

const NullValue = styled.span({
  color: 'rgb(128, 128, 128)',
});
NullValue.displayName = 'DataDescription:NullValue';

const UndefinedValue = styled.span({
  color: 'rgb(128, 128, 128)',
});
UndefinedValue.displayName = 'DataDescription:UndefinedValue';

const StringValue = styled.span({
  color: colors.cherryDark1,
  wordWrap: 'break-word',
});
StringValue.displayName = 'DataDescription:StringValue';

const ColorValue = styled.span({
  color: colors.blueGrey,
});
ColorValue.displayName = 'DataDescription:ColorValue';

const SymbolValue = styled.span({
  color: 'rgb(196, 26, 22)',
});
SymbolValue.displayName = 'DataDescription:SymbolValue';

const NumberValue = styled.span({
  color: colors.tealDark1,
});
NumberValue.displayName = 'DataDescription:NumberValue';

const ColorBox = styled.span<{color: string}>((props) => ({
  backgroundColor: props.color,
  boxShadow: 'inset 0 0 1px rgba(0, 0, 0, 1)',
  display: 'inline-block',
  height: 12,
  marginRight: 5,
  verticalAlign: 'middle',
  width: 12,
}));
ColorBox.displayName = 'DataDescription:ColorBox';

const FunctionKeyword = styled.span({
  color: 'rgb(170, 13, 145)',
  fontStyle: 'italic',
});
FunctionKeyword.displayName = 'DataDescription:FunctionKeyword';

const FunctionName = styled.span({
  fontStyle: 'italic',
});
FunctionName.displayName = 'DataDescription:FunctionName';

const ColorPickerDescription = styled.div({
  display: 'inline',
  position: 'relative',
});
ColorPickerDescription.displayName = 'DataDescription:ColorPickerDescription';

const EmptyObjectValue = styled.span({
  fontStyle: 'italic',
});
EmptyObjectValue.displayName = 'DataDescription:EmptyObjectValue';

type DataDescriptionProps = {
  path?: Array<string>;
  type: string;
  value: any;
  extra?: any;
  setValue: DataInspectorSetValue | null | undefined;
};

type DescriptionCommitOptions = {
  value: any;
  keep: boolean;
  clear: boolean;
  set: boolean;
};

class NumberTextEditor extends PureComponent<{
  commit: (opts: DescriptionCommitOptions) => void;
  type: string;
  value: any;
  origValue: any;
}> {
  onNumberTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val =
      this.props.type === 'number'
        ? parseFloat(e.target.value)
        : e.target.value;
    this.props.commit({
      clear: false,
      keep: true,
      value: val,
      set: false,
    });
  };

  onNumberTextInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val =
        this.props.type === 'number'
          ? parseFloat(this.props.value)
          : this.props.value;
      this.props.commit({clear: true, keep: true, value: val, set: true});
    } else if (e.key === 'Escape') {
      this.props.commit({
        clear: true,
        keep: false,
        value: this.props.origValue,
        set: false,
      });
    }
  };

  onNumberTextRef = (ref: HTMLElement | undefined | null) => {
    if (ref) {
      ref.focus();
    }
  };

  onNumberTextBlur = () => {
    this.props.commit({
      clear: true,
      keep: true,
      value: this.props.value,
      set: true,
    });
  };

  render() {
    const extraProps: any = {};
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
        ref={this.onNumberTextRef}
        onBlur={this.onNumberTextBlur}
        value={this.props.value}
      />
    );
  }
}

type DataDescriptionState = {
  editing: boolean;
  origValue: any;
  value: any;
};

export default class DataDescription extends PureComponent<
  DataDescriptionProps,
  DataDescriptionState
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
      if (opts.set) {
        setValue(path, val);
      }
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
    const {type, extra} = this.props;
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

    if (type === 'color_lite') {
      return (
        <ColorEditor
          value={value}
          colorSet={extra.colorSet}
          commit={this.commit}
        />
      );
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
      type === 'color' ||
      type === 'color_lite'
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
          extra={this.props.extra}
          editable={!!this.props.setValue}
          commit={this.commit}
          onEdit={this.onEditStart}
        />
      );
    }
  }
}

class ColorEditor extends PureComponent<{
  value: any;
  colorSet?: Array<string | number>;
  commit: (opts: DescriptionCommitOptions) => void;
}> {
  onBlur = () => {
    this.props.commit({
      clear: true,
      keep: false,
      value: this.props.value,
      set: true,
    });
  };

  onChange = ({
    hex,
    rgb: {a, b, g, r},
  }: {
    hex: string;
    rgb: {a: number; b: number; g: number; r: number};
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

    this.props.commit({clear: false, keep: true, value: val, set: true});
  };

  onChangeLite = ({
    rgb: {a, b, g, r},
  }: {
    rgb: {a: number; b: number; g: number; r: number};
  }) => {
    const prev = this.props.value;

    if (typeof prev !== 'number') {
      return;
    }
    // compute RRGGBBAA value
    let val = (Math.round(a * 255) & 0xff) << 24;
    val |= (r & 0xff) << 16;
    val |= (g & 0xff) << 8;
    val |= b & 0xff;

    this.props.commit({clear: false, keep: true, value: val, set: true});
  };

  render() {
    const colorInfo = parseColor(this.props.value);
    if (!colorInfo) {
      return null;
    }

    return (
      <ColorPickerDescription>
        <DataDescriptionPreview
          type="color"
          value={this.props.value}
          extra={this.props.colorSet}
          editable={false}
          commit={this.props.commit}
        />
        <Popover onDismiss={this.onBlur}>
          {this.props.colorSet ? (
            <CompactPicker
              color={colorInfo}
              colors={this.props.colorSet
                .filter((x) => x != 0)
                .map(parseColor)
                .map((rgba) => {
                  if (!rgba) {
                    return '';
                  }
                  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
                })}
              onChange={(color: {
                hex: string;
                hsl: {
                  a?: number;
                  h: number;
                  l: number;
                  s: number;
                };
                rgb: {a?: number; b: number; g: number; r: number};
              }) => {
                this.onChangeLite({rgb: {...color.rgb, a: color.rgb.a || 0}});
              }}
            />
          ) : (
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
              onChange={(color: {
                hex: string;
                hsl: {
                  a?: number;
                  h: number;
                  l: number;
                  s: number;
                };
                rgb: {a?: number; b: number; g: number; r: number};
              }) => {
                this.onChange({
                  hex: color.hex,
                  rgb: {...color.rgb, a: color.rgb.a || 1},
                });
              }}
            />
          )}
        </Popover>
      </ColorPickerDescription>
    );
  }
}

class DataDescriptionPreview extends PureComponent<{
  type: string;
  value: any;
  extra?: any;
  editable: boolean;
  commit: (opts: DescriptionCommitOptions) => void;
  onEdit?: () => void;
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
):
  | {
      r: number;
      g: number;
      b: number;
      a: number;
    }
  | undefined
  | null {
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
    a = parseInt(parts.shift() || '0', 16) / 255;
  }

  const size = val.length;
  const [r, g, b] = parts.map((num) => {
    if (size === 3) {
      return parseInt(num + num, 16);
    } else {
      return parseInt(num, 16);
    }
  });

  return {a, b, g, r};
}

type Picker = {
  values: Set<string>;
  selected: string;
};

class DataDescriptionContainer extends PureComponent<{
  type: string;
  value: any;
  editable: boolean;
  commit: (opts: DescriptionCommitOptions) => void;
}> {
  static contextType = HighlightContext; // Replace with useHighlighter
  context!: React.ContextType<typeof HighlightContext>;

  onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.props.commit({
      clear: true,
      keep: true,
      value: e.target.checked,
      set: true,
    });
  };

  render(): any {
    const {type, editable, value: val} = this.props;
    const highlighter = this.context;

    switch (type) {
      case 'timeline': {
        return (
          <>
            <TimelineDataDescription
              canSetCurrent={editable}
              timeline={JSON.parse(val)}
              onClick={(id) => {
                this.props.commit({
                  value: id,
                  keep: true,
                  clear: false,
                  set: true,
                });
              }}
            />
          </>
        );
      }

      case 'number':
        return <NumberValue>{+val}</NumberValue>;

      case 'color': {
        const colorInfo = parseColor(val);
        if (typeof val === 'number' && val === 0) {
          return <UndefinedValue>(not set)</UndefinedValue>;
        } else if (colorInfo) {
          const {a, b, g, r} = colorInfo;
          return (
            <>
              <ColorBox
                key="color-box"
                color={`rgba(${r}, ${g}, ${b}, ${a})`}
              />
              <ColorValue key="value">
                rgba({r}, {g}, {b}, {a === 1 ? '1' : a.toFixed(2)})
              </ColorValue>
            </>
          );
        } else {
          return <span>Malformed color</span>;
        }
      }

      case 'color_lite': {
        const colorInfo = parseColor(val);
        if (typeof val === 'number' && val === 0) {
          return <UndefinedValue>(not set)</UndefinedValue>;
        } else if (colorInfo) {
          const {a, b, g, r} = colorInfo;
          return (
            <>
              <ColorBox
                key="color-box"
                color={`rgba(${r}, ${g}, ${b}, ${a})`}
              />
              <ColorValue key="value">
                rgba({r}, {g}, {b}, {a === 1 ? '1' : a.toFixed(2)})
              </ColorValue>
            </>
          );
        } else {
          return <span>Malformed color</span>;
        }
      }

      case 'picker': {
        const picker: Picker = JSON.parse(val);
        const options = [...picker.values].reduce((obj, value) => {
          return {...obj, [value]: value};
        }, {});
        return (
          <Select
            disabled={!this.props.editable}
            options={options}
            selected={picker.selected}
            onChangeWithKey={(value: string) =>
              this.props.commit({
                value,
                keep: true,
                clear: false,
                set: true,
              })
            }
          />
        );
      }

      case 'text':
      case 'string':
        const isUrl = val.startsWith('http://') || val.startsWith('https://');
        if (isUrl) {
          return (
            <>
              <Link href={val}>{highlighter.render(val)}</Link>
              {editable && (
                <Glyph
                  name="pencil"
                  variant="outline"
                  color={colors.light20}
                  size={16}
                  style={{cursor: 'pointer', marginLeft: 8}}
                />
              )}
            </>
          );
        } else {
          return (
            <StringValue>{highlighter.render(`"${val || ''}"`)}</StringValue>
          );
        }

      case 'enum':
        return <StringValue>{highlighter.render(val)}</StringValue>;

      case 'boolean':
        return editable ? (
          <input
            type="checkbox"
            checked={!!val}
            disabled={!editable}
            onChange={this.onChangeCheckbox}
          />
        ) : (
          <StringValue>{'' + val}</StringValue>
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

      // no description necessary as we'll typically wrap it in [] or {} which
      // already denotes the type
      case 'array':
        return val.length <= 0 ? <EmptyObjectValue>[]</EmptyObjectValue> : null;
      case 'object':
        return Object.keys(val).length <= 0 ? (
          <EmptyObjectValue>{'{}'}</EmptyObjectValue>
        ) : null;

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
