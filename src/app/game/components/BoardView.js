import { StackerView } from '@/game-logic/view/StackerView';
import React, { useRef, useState, useCallback } from 'react';
import defaultTheme from '@/game-logic/config/default-theme';

export default function BoardView({ stacker }) {
  const drawingRef = useRef({});
  const [view, setView] = useState(null);
  const viewInitRef = useCallback(node => {
    if (node != null) {
      drawingRef.current[node.id] = node;
      if (Object.keys(drawingRef.current).length == 4 && !view) {

        let v = new StackerView(stacker, drawingRef.current, defaultTheme);

        // TODO: check for existence of custom theme / view
        if (window.CustomView) {

        }

        v.resize();
        v.draw();
        setView(v);
      }
    }
  }, [])

  // TODO: refactor this to make view generate its own canvases

  // TODO: check game focus
  return (
    <main ref={viewInitRef} id="container" className="flex items-start">
      <canvas ref={viewInitRef} id="hold" className="m-4"></canvas>
      <canvas ref={viewInitRef} id="matrix" className="m-4"></canvas>
      <canvas ref={viewInitRef} id="previews" className="ml-20 mt-20"></canvas>
    </main>
  );
}