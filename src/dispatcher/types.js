/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {Store} from '../reducers/index.tsx';
import type {Logger} from '../fb-interfaces/Logger';

export type Dispatcher = (store: Store, logger: Logger) => ?() => Promise<void>;
