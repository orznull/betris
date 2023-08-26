export const getSavedKeybinds = () => {
  try {
    let keybinds = (JSON.parse(localStorage.getItem('binds')));
    return keybinds;
  } catch (e) {
    return PlayerController.DEFAULT_KEYBINDS;
    // TODO: check for existence of custom controller, make it a hook or something
  }
}