import React, { useState } from 'react';
import keycode from 'keycode';
import { getSavedKeybinds } from '@/app/game/lib';

const KeybindConfig = ({ defaultKeybinds }) => {
  const [keybinds, setKeybinds] = useState(getSavedKeybinds());

  const sentenceCase = (str) => {
    return str.replace(/_/g, ' ').toLowerCase();
  };

  const updateKeybind = (action, key) => {
    const newKeybinds = { ...keybinds, [action]: key };
    setKeybinds(newKeybinds);
    localStorage.setItem('binds', JSON.stringify(newKeybinds));
  };

  const handleKeyChange = (action, event) => {
    const key = keycode(event.keyCode);
    updateKeybind(action, key);
  };

  return (
    <div className="flex flex-col space-y-4">
      {Object.entries(keybinds).map(([action, key]) => (
        <div key={action} className="flex items-center space-x-4">
          <label className="w-32">{sentenceCase(action)}</label>
          <input
            type="text"
            className="w-32 px-2 py-1 border rounded focus:outline-none focus:border-neutral-500"
            value={key}
            onKeyDown={(e) => handleKeyChange(action, e)}
            readOnly
          />
        </div>
      ))}
    </div>
  );
};

export default KeybindConfig;
