/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Leak} from './index';
import {Element} from 'flipper';

/**
 * Utility Function to add a child element
 * @param childElementId
 * @param elementId
 * @param elements
 */
function safeAddChildElementId(
  childElementId: string,
  elementId: string,
  elements: Map<string, Element>,
) {
  const element = elements.get(elementId);
  if (element && element.children) {
    element.children.push(childElementId);
  }
}

function toObjectMap(
  dict: Map<any, any>,
  deep: boolean = false,
): {[key: string]: any} {
  const result: {[key: string]: any} = {};
  for (let [key, value] of dict.entries()) {
    if (deep && value instanceof Map) {
      value = toObjectMap(value, true);
    }
    result[String(key)] = value;
  }
  return result;
}

/**
 * Creates an Element (for ElementsInspector) representing a single Object in
 * the path to GC root view.
 */
function getElementSimple(str: string, id: string): Element {
  // Below regex can handle both older and newer versions of LeakCanary
  const match = str.match(
    /\* (GC ROOT )?(\u21B3 )?([a-z]* )?([^A-Z]*.)?([A-Z].*)/,
  );
  let name = 'N/A';
  if (match) {
    name = match[5];
  }
  return {
    id,
    name,
    expanded: true,
    children: [],
    attributes: [],
    data: {},
    decoration: '',
    extraInfo: {},
  };
}

// Line marking the start of Details section
const BEGIN_DETAILS_SECTION_INDICATOR = '* Details:';
// Line following the end of the Details section
const END_DETAILS_SECTION_INDICATOR = '* Excluded Refs:';
const STATIC_PREFIX = 'static ';
// Text that begins the line of the Object at GC root
const LEAK_BEGIN_INDICATOR = 'has leaked:';
const RETAINED_SIZE_INDICATOR = '* Retaining: ';

/**
 * Parses the lines given (at the given index) to extract information about both
 * static and instance fields of each class in the path to GC root. Returns three
 * objects, each one mapping the element ID of a specific element to the
 * corresponding static fields, instance fields, or package name of the class
 */
function generateFieldsList(
  lines: string[],
  i: number,
): {
  staticFields: Map<string, Map<string, string>>;
  instanceFields: Map<string, Map<string, string>>;
  packages: Map<string, string>;
} {
  const staticFields = new Map<string, Map<string, string>>();
  const instanceFields = new Map<string, Map<string, string>>();

  let staticValues = new Map<string, string>();
  let instanceValues = new Map<string, string>();

  let elementId = -1;
  let elementIdStr = '';

  const packages = new Map<string, any>();

  // Process everything between Details and Excluded Refs
  while (
    i < lines.length &&
    !lines[i].startsWith(END_DETAILS_SECTION_INDICATOR)
  ) {
    const line = lines[i];
    if (line.startsWith('*')) {
      if (elementId != -1) {
        staticFields.set(elementIdStr, staticValues);
        instanceFields.set(elementIdStr, instanceValues);
        staticValues = new Map<string, string>();
        instanceValues = new Map<string, string>();
      }
      elementId++;
      elementIdStr = String(elementId);

      // Extract package for each class
      let pkg = 'unknown';
      const match = line.match(/\* (.*)(of|Class) (.*)/);
      if (match) {
        pkg = match[3];
      }
      packages.set(elementIdStr, pkg);
    } else {
      // Field/value pairs represented in input lines as
      // | fieldName = value
      const match = line.match(/\|\s+(.*) = (.*)/);
      if (match) {
        const fieldName = match[1];
        const fieldValue = match[2];

        if (fieldName.startsWith(STATIC_PREFIX)) {
          const strippedFieldName = fieldName.substr(7);
          staticValues.set(strippedFieldName, fieldValue);
        } else {
          instanceValues.set(fieldName, fieldValue);
        }
      }
    }
    i++;
  }
  staticFields.set(elementIdStr, staticValues);
  instanceFields.set(elementIdStr, instanceValues);

  return {staticFields, instanceFields, packages};
}

/**
 * Processes a LeakCanary string containing data from a single leak. If the
 * string represents a valid leak, the function appends parsed data to the given
 * output list. If not, the list is returned as-is. This parsed data contains
 * the path to GC root, static/instance fields for each Object in the path, the
 * leak's retained size, and a title for the leak.
 */
function processLeak(output: Leak[], leakInfo: string): Leak[] {
  const lines = leakInfo.split('\n');

  // Elements shows a Object's classname and package, wheras elementsSimple shows
  // just its classname
  const elements = new Map<string, Element>();
  const elementsSimple = new Map<string, Element>();

  let rootElementId = '';

  let i = 0;
  while (i < lines.length && !lines[i].endsWith(LEAK_BEGIN_INDICATOR)) {
    i++;
  }
  i++;

  if (i >= lines.length) {
    return output;
  }

  let elementId = 0;
  let elementIdStr = String(elementId);
  // Last element is leaked object
  let leakedObjName = '';
  while (i < lines.length && lines[i].startsWith('*')) {
    const line = lines[i];

    const prevElementIdStr = String(elementId - 1);
    if (elementId !== 0) {
      // Add element to previous element's children
      safeAddChildElementId(elementIdStr, prevElementIdStr, elements);
      safeAddChildElementId(elementIdStr, prevElementIdStr, elementsSimple);
    } else {
      rootElementId = elementIdStr;
    }
    const element = getElementSimple(line, elementIdStr);
    leakedObjName = element.name;
    elements.set(elementIdStr, element);
    elementsSimple.set(elementIdStr, element);

    i++;
    elementId++;
    elementIdStr = String(elementId);
  }

  while (
    i < lines.length &&
    !lines[i].startsWith(RETAINED_SIZE_INDICATOR) &&
    !lines[i].startsWith(BEGIN_DETAILS_SECTION_INDICATOR)
  ) {
    i++;
  }

  let retainedSize = 'unknown size';

  if (lines[i].startsWith(RETAINED_SIZE_INDICATOR)) {
    const match = lines[i].match(/\* Retaining: (.*)./);
    if (match) {
      retainedSize = match[1];
    }
  }

  while (
    i < lines.length &&
    !lines[i].startsWith(BEGIN_DETAILS_SECTION_INDICATOR)
  ) {
    i++;
  }
  i++;

  // Parse information on each object's fields, package
  const {staticFields, instanceFields, packages} = generateFieldsList(lines, i);

  // While elementsSimple remains as-is, elements has the package of each class
  // inserted, in order to enable 'Show full class path'
  for (const [elementId, pkg] of packages.entries()) {
    const element = elements.get(elementId);
    if (!element) {
      continue;
    }
    // Gets everything before the field name, which is replaced by the package
    const match = element.name.match(/([^\. ]*)(.*)/);
    if (match && match.length === 3) {
      element.name = pkg + match[2];
    }
  }

  output.push({
    title: leakedObjName,
    root: rootElementId,
    elements: toObjectMap(elements),
    elementsSimple: toObjectMap(elementsSimple),
    staticFields: toObjectMap(staticFields, true),
    instanceFields: toObjectMap(instanceFields, true),
    retainedSize: retainedSize,
  });
  return output;
}

/**
 * Processes a set of LeakCanary strings, ignoring non-leaks - see processLeak above.
 */
export function processLeaks(leakInfos: string[]): Leak[] {
  const newLeaks = leakInfos.reduce(processLeak, []);
  return newLeaks;
}
