/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useEffect, useState} from 'react';

export function useKeyboardModifiers() {
  const [state, setState] = useState({altPressed: false, ctrlPressed: false});

  function handler(event: KeyboardEvent) {
    setState({altPressed: event.altKey, ctrlPressed: event.ctrlKey});
  }

  useEffect(() => {
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', handler);
    };
  }, []);

  return state;
}
