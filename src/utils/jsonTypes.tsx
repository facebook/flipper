/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type JSON = JSONPrimitive | JSONArray | JSONObject;

export type JSONPrimitive = null | boolean | number | string;

export type JSONArray = JSON[];

export type JSONObject = {[key: string]: JSON};
