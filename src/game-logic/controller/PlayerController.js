import keycode from "keycode";

export class PlayerController {

  // These two fields will automatically populate the config menu.
  static DEFAULT_CONFIG = {
    DAS: 80,
    ARR: 0,
    SOFT_DROP_ARR: 0,
    CANCEL_DAS_ON_DIRECTION_CHANGE: true
    // ... add any additional 
  }
  static DEFAULT_KEYBINDS = {
    START: 'r',
    LEFT: 'j',
    RIGHT: 'l',
    COUNTER_CLOCKWISE: 'a',
    CLOCKWISE: 's',
    HOLD: 'd',
    '180': 'w',
    SOFT_DROP: 'k',
    HARD_DROP: 'space',
    // ... add additional keybinds for additional actions if desired
  };


  constructor(stacker, binds, config, socket) {
    Object.assign(this, {
      stacker,
      ruleset: stacker.ruleset,
      socket,
      pressed: {},
      previousPressed: {},
      timers: {},
      actionKeybinds: {},
      stopped: false,
    })

    this.actionKeybinds = { ...PlayerController.DEFAULT_KEYBINDS, ...binds }
    this.config = { ...PlayerController.DEFAULT_CONFIG, ...config }

    this.init_listeners()

  }

  init_listeners() {

    // TODO: emit events to websocket
    if (this.socket) {
      this.stacker.addListener(() => { });
      // TODO: take in socket events
    }

    this.stacker.on("spawn", () => {
      this.set_timer('gravity', this.ruleset.timers.gravity)
      this.set_timer('maximumTimeBeforeLock', this.ruleset.timers.maximumTimeBeforeLock)
      this.clear_timer('lockDelay');
      this.clear_timer('lockDelayExtension');
    })
  }

  // Pressing records time of press, for DAS timers and whatnot.
  press(key) {
    for (let action in this.actionKeybinds) {
      if (keycode(this.actionKeybinds[action]) == key && !this.pressed[action]) {
        this.pressed[action] = (new Date).getTime();
      }
    }
  }

  release(key) {
    for (let action in this.actionKeybinds)
      if (keycode(this.actionKeybinds[action]) == key)
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

  set_timer(timer, time_in_millis) {
    this.timers[timer] = (new Date).getTime() + time_in_millis
  }

  clear_timer(timer) {
    delete this.timers[timer];
  }

  // returns NaN if undefined
  get_time_remaining(timer) {
    return this.timers[timer] - (new Date).getTime();
  }

  timer_ended(timer) {
    return this.get_time_remaining(timer) <= 0
  }

  process_controls() {
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
    if (this.is_just_pressed('START')) {
      this.apply('start');
    }
    if (this.is_just_pressed('SOFT_DROP')) {
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

  process_timers() {
    // gravity
    if (this.timer_ended("gravity")) {
      this.apply('sd');
      this.set_timer('gravity', this.ruleset.timers.gravity)
    }

    // das / arr


    // soft drop arr


    // lock delay logic
    if (this.stacker.is_piece_on_floor()) {
      if (!this.was_on_floor) {
        this.set_timer('lockDelay', this.ruleset.timers.lockDelay);
        this.set_timer('lockDelayExtension', this.ruleset.timers.maximumLockDelayExtension);
      }

      if (this.previousPiecePosition && (
        this.previousPiecePosition.x != this.stacker.piece.x ||
        this.previousPiecePosition.y != this.stacker.piece.y ||
        this.previousPiecePosition.r != this.stacker.piece.r)
      ) {
        this.set_timer('lockDelay', this.ruleset.timers.lockDelay);
      }
    } else {
      this.clear_timer('lockDelay');
      this.clear_timer('lockDelayExtension');
    }
    this.previousPiecePosition = { ...this.stacker.piece }
    this.was_on_floor = this.stacker.is_piece_on_floor();

    if (this.timer_ended("maximumTimeBeforeLock") ||
      this.timer_ended("lockDelay") ||
      this.timer_ended("lockDelayExtension")
    ) {
      this.apply('hd');
    }

  }

  // override this function if you have anything you want to process every frame (60fps)
  process() {
    this.process_controls()
    this.process_timers()
  }

  // run the loop, preferred if you override process functions if you want to change something
  loop(delta) {
    this.process(delta)

    this.previousPressed = { ...this.pressed };
    if (!this.stopped)
      requestAnimationFrame(this.loop.bind(this));
    //setTimeout(this.loop.bind(this), 1000)
  }

  start() {
    this.stopped = false;
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