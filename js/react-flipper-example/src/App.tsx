/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FC} from 'react';
import FlipperTicTacToe from './FlipperTicTacToe';


const App: FC = () => {
  return (
    <div>
      <header>
        React Flipper WebSocket Example
      </header>
      <section>
        <FlipperTicTacToe />
      </section>
    </div>
  );
}

export default App;
