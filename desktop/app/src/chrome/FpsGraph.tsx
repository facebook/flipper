/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useRef} from 'react';
import {fpsEmitter} from '../dispatcher/tracking';

const width = 36;
const height = 36;
const graphHeight = 20;

export default function FpsGraph({sampleRate = 200}: {sampleRate?: number}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fps: number[] = new Array<number>(width).fill(0, 0, width);
    let lastFps = 0;
    let lastDraw = Date.now();

    const handler = (xfps: number) => {
      // at any interval, take the lowest to better show slow downs
      lastFps = Math.min(lastFps, xfps);
    };

    const interval = setInterval(() => {
      const ctx = canvasRef.current!.getContext('2d')!;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#ddd';

      const now = Date.now();
      let missedFrames = 0;
      // check if we missed some measurements, in that case the CPU was fully choked!
      for (let i = 0; i < Math.floor((now - lastDraw) / sampleRate) - 1; i++) {
        fps.push(0);
        fps.shift();
        missedFrames++;
      }
      lastDraw = now;

      // latest measurement
      fps.push(lastFps);
      fps.shift();

      ctx.font = 'lighter 10px arial';
      ctx.strokeText(
        '' +
          (missedFrames
            ? // if we were chocked, show FPS based on frames missed
              Math.floor((1000 / sampleRate) * missedFrames)
            : lastFps) +
          ' fps',
        0,
        height - 4,
      );

      ctx.moveTo(0, height);
      ctx.beginPath();
      ctx.lineWidth = 1;
      fps.forEach((num, idx) => {
        ctx.lineTo(idx, graphHeight - (Math.min(60, num) / 60) * graphHeight);
      });

      ctx.strokeStyle = missedFrames ? '#ff0000' : '#ddd';

      ctx.stroke();
      lastFps = 60;
    }, sampleRate);

    fpsEmitter.on('fps', handler);

    return () => {
      clearInterval(interval);
      fpsEmitter.off('fps', handler);
    };
  }, []);

  return (
    <div style={{width, height}}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        title="Current framerate in FPS"
      />
    </div>
  );
}
