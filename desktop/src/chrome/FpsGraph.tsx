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

export default function FpsGraph({
  width,
  height,
  sampleRate = 200,
}: {
  width: number;
  height: number;
  sampleRate?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const graphWidth = width - 20;
    const fps: number[] = new Array<number>(graphWidth).fill(0, 0, graphWidth);
    let lastFps = 0;
    let lastDraw = Date.now();

    const handler = (xfps: number) => {
      // at any interval, take the lowest to better show slow downs
      lastFps = Math.min(lastFps, xfps);
    };

    const interval = setInterval(() => {
      const ctx = canvasRef.current!.getContext('2d')!;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#ccc';

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

      ctx.strokeText(
        '' +
          (missedFrames
            ? // if we were chocked, show FPS based on frames missed
              Math.floor((1000 / sampleRate) * missedFrames)
            : lastFps),
        width - 15,
        5 + height / 2,
      );

      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineWidth = 1;
      fps.forEach((num, idx) => {
        ctx.lineTo(idx, height - (Math.min(60, num) / 60) * height);
      });

      ctx.strokeStyle = missedFrames ? '#ff0000' : '#ccc';

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
    <div>
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
}
