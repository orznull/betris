import keycode from "keycode";

export class PlayerController {
  
  constructor(stacker, binds, config, socket) {
    Object.assign(this, {
      stacker,
      socket,
      pressed: {},
      previousPressed: {},
      keybinds: {},
      stopped: false,
    })

    this.keybinds = { ...PlayerController.DEFAULT_KEYBINDS, ...binds }
    this.config = { ...PlayerController.DEFAULT_CONFIG, ...config }

    // TODO: emit events to websocket
    if (this.socket)
      this.stacker.addListener(() => {});

  }

  // These two fields will automatically populate the config menu.
  static DEFAULT_CONFIG = {
    DAS: 90,
    ARR: 0,
    SOFT_DROP_ARR: 0,
    CANCEL_DAS_ON_DIRECTION_CHANGE: true
    // ... add any additional 
  }
  static DEFAULT_KEYBINDS = {
    START:'r',
    
    LEFT:'j',
    RIGHT:'l',
    COUNTER_CLOCKWISE:'a',
    CLOCKWISE:'s',
    HOLD:'d',
    '180': 'w',
    SOFT_DROP:'k',
    HARD_DROP:'space',
    // ... add additional keybinds for additional actions if desired
  };

  press(key) {
    for (let action in this.keybinds) {
      if (keycode(this.keybinds[action]) == key && !this.pressed[action]) { 
        this.pressed[action] = (new Date).getTime();
      }
    }
  }

  release(key) {
    for (let action in this.keybinds)
      if (keycode(this.keybinds[action]) == key) 
        delete this.pressed[action];
  }

  is_pressed(action) {
    return !!this.pressed[action];
  }

  is_just_pressed(action) {
    return !this.previousPressed[action] && this.pressed[action];
  }

  time_since_pressed(action) {
    return (new Date).getTime() - this.pressed[action]
  }

  // override this function if you have anything you want to process every frame
  // run every frame (60fps)
  process(delta) {

    if (this.is_just_pressed('START')) {
      this.apply('start');
    }
    if (
      this.is_pressed('LEFT') && 
      (!this.is_pressed('RIGHT') || this.time_since_pressed('LEFT') < this.time_since_pressed('RIGHT'))
    ) {
      if (this.is_just_pressed('LEFT')) {
        this.apply('left');
        // cancel the RIGHT das charge when changing directions
        if (this.is_pressed('RIGHT') && this.config.CANCEL_DAS_ON_DIRECTION_CHANGE) {
          this.pressed['RIGHT'] = (new Date).getTime(); 
        }
      } else {
        if (this.time_since_pressed('LEFT') > this.config.DAS) {
          this.apply('left+')
          // TODO: non zero arr
        }
      }
    } else if (this.is_pressed('RIGHT')) {
      if (this.is_just_pressed('RIGHT')) {
        // cancel the LEFT das charge when changing directions
        if (this.is_pressed('LEFT') && this.config.CANCEL_DAS_ON_DIRECTION_CHANGE) {
          this.pressed['LEFT'] = (new Date).getTime(); 
        }
        this.apply('right');
      } else {
        if (this.time_since_pressed('RIGHT') > this.config.DAS) {
          this.apply('right+')
          // TODO: non zero arr
        }
      }
    }

    if (this.is_pressed('SOFT_DROP')) {
      // TODO: Soft drop arr
      this.apply('sd+')
    }
    if (this.is_just_pressed('COUNTER_CLOCKWISE'))
      this.apply('ccw');

    if (this.is_just_pressed('CLOCKWISE'))
      this.apply('cw');

    if (this.is_just_pressed('180'))
      this.apply('180');

    if (this.is_just_pressed('HARD_DROP'))
      this.apply('hd');

    if (this.is_just_pressed('HOLD'))
      this.apply('hold');
  }

  loop(delta) {
    this.process(delta)

    this.previousPressed = { ...this.pressed };
    if (!this.stopped)
      requestAnimationFrame(this.loop.bind(this));
      //setTimeout(this.loop.bind(this), 1000)
  }

  start() {
    this.apply('start');
    this.loop(0);
  }

  stop() {
    this.stopped = true;
  }

  apply(op, context) {
    this.stacker.apply(op, context)
  }

}
window.Controller = PlayerController;