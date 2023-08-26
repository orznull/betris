import { Stacker } from '@/game-logic/stacker/Stacker';
import defaultRuleset from '@/game-logic/config/default-ruleset';
import React, { useState, useEffect } from 'react';
import BoardView from './BoardView';
import { PlayerController } from '@/game-logic/controller/PlayerController';
import { getSavedKeybinds } from '../lib';

export default function PlayerBoard() {

  // TODO: check for existence of custom controller

  const [stacker, setStacker] = useState(null);
  const [controller, setController] = useState(null);

  const onKeyDown = (e) => {
    controller.press(e.keyCode);
  }

  const onKeyUp = (e) => {
    controller.release(e.keyCode);
  }

  useEffect(() => {

    let s = new Stacker(defaultRuleset);
    if (window.customStacker) {
      // TODO: check for existence of custom ruleset, then use custom stacker otherwise
    }
    const c = new PlayerController(s, getSavedKeybinds());
    c.start();

    setStacker(s);
    setController(c);

    return () => {
      c.stop();
    }
  }, []);

  if (!stacker) return <></>

  return (
    <div tabIndex={0} onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
      <BoardView stacker={stacker} />
    </div>
  );
}