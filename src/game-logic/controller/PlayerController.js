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
    LEFT: 'left',
    RIGHT: 'right',
    COUNTER_CLOCKWISE: 'z',
    CLOCKWISE: 'x',
    HOLD: 'c',
    '180': 'a',
    SOFT_DROP: 'down',
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
      this.setTimer('gravity', this.ruleset.timers.gravity)
      this.setTimer('maximumTimeBeforeLock', this.ruleset.timers.maximumTimeBeforeLock)
      this.clearTimer('lockDelay');
      this.clearTimer('lockDelayExtension');
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

  setTimer(timer, time_in_millis) {
    this.timers[timer] = (new Date).getTime() + time_in_millis
  }

  clearTimer(timer) {
    delete this.timers[timer];
  }

  // returns NaN if undefined
  getTimeRemaining(timer) {
    return this.timers[timer] - (new Date).getTime();
  }

  timerEnded(timer) {
    return this.getTimeRemaining(timer) <= 0
  }

  processControls() {

    if (this.is_just_pressed('LEFT')) {
      this.apply('left');
      this.setTimer('das_left', this.config.DAS);
      // reset the RIGHT das charge when changing directions (if enabled)
      if (this.is_pressed('RIGHT') && this.config.CANCEL_DAS_ON_DIRECTION_CHANGE) {
        this.setTimer('das_right', this.config.DAS);
      }
    } if (!this.is_pressed("LEFT")) {
      this.clearTimer("das_left");
      this.clearTimer("arr_left");
    }

    if (this.is_just_pressed('RIGHT')) {
      this.apply('right');
      this.setTimer('das_right', this.config.DAS);
      // reset the LEFT das charge when changing directions (if enabled)
      if (this.is_pressed('LEFT') && this.config.CANCEL_DAS_ON_DIRECTION_CHANGE) {
        this.setTimer('das_left', this.config.DAS);
      }
    } else if (!this.is_pressed("RIGHT")) {
      this.clearTimer("das_right");
      this.clearTimer("arr_right");
    }

    if (this.is_just_pressed('SOFT_DROP')) {
      this.apply(this.config.SOFT_DROP_ARR == 0 ? 'sd+' : 'sd');
      this.setTimer('arr_sd', this.config.SOFT_DROP_ARR);
    } else if (!this.is_pressed('SOFT_DROP')) {
      this.clearTimer('arr_sd')
    }

    if (this.is_just_pressed('START')) this.apply('start');
    if (this.is_just_pressed('COUNTER_CLOCKWISE')) this.apply('ccw');
    if (this.is_just_pressed('CLOCKWISE')) this.apply('cw');
    if (this.is_just_pressed('180')) this.apply('180');
    if (this.is_just_pressed('HARD_DROP')) this.apply('hd');
    if (this.is_just_pressed('HOLD')) this.apply('hold');
  }

  processTimers() {
    // gravity
    if (this.timerEnded("gravity")) {
      this.apply('sd');
      this.setTimer('gravity', this.ruleset.timers.gravity)
    }

    // das / arr
    if (this.timerEnded("das_left")) {
      if (Number.isNaN(this.getTimeRemaining("arr_left")))
        this.setTimer("arr_left", this.config.ARR);
      // checking if on wall so we don't spam this apply if we don't need to
      if (this.timerEnded("arr_left") && !this.stacker.isPieceOnWall(-1)) {
        this.apply(this.config.ARR == 0 ? "left+" : "left");
        this.setTimer("arr_left", this.config.ARR);
      }
    }

    if (this.timerEnded("das_right")) {
      if (Number.isNaN(this.getTimeRemaining("arr_right")))
        this.setTimer("arr_right", this.config.ARR);
      // checking if on wall so we don't spam this apply if we don't need to
      if (this.timerEnded("arr_right") && !this.stacker.isPieceOnWall(1)) {
        this.apply(this.config.ARR == 0 ? "right+" : "right");
        this.setTimer("arr_right", this.config.ARR);
      }
    }

    // soft drop arr
    if (this.timerEnded("arr_sd") && !this.stacker.isPieceOnFloor()) {
      this.apply(this.config.SOFT_DROP_ARR == 0 ? 'sd+' : 'sd');
      this.setTimer('arr_sd', this.config.SOFT_DROP_ARR);
    }

    // lock delay logic
    if (this.stacker.isPieceOnFloor()) {
      if (!this.was_on_floor) {
        this.setTimer('lockDelay', this.ruleset.timers.lockDelay);
        this.setTimer('lockDelayExtension', this.ruleset.timers.maximumLockDelayExtension);
      }

      if (this.previousPiecePosition && (
        this.previousPiecePosition.x != this.stacker.piece.x ||
        this.previousPiecePosition.y != this.stacker.piece.y ||
        this.previousPiecePosition.r != this.stacker.piece.r)
      ) {
        this.setTimer('lockDelay', this.ruleset.timers.lockDelay);
      }
    } else {
      this.clearTimer('lockDelay');
      this.clearTimer('lockDelayExtension');
    }
    this.previousPiecePosition = { ...this.stacker.piece }
    this.was_on_floor = this.stacker.isPieceOnFloor();

    if (this.timerEnded("maximumTimeBeforeLock") ||
      this.timerEnded("lockDelay") ||
      this.timerEnded("lockDelayExtension")
    ) {
      this.apply('hd');
    }

  }

  // override this function if you have anything you want to process every frame (60fps)
  process(delta) {
    this.processControls()
    this.processTimers()
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

try {
  window.Controller = PlayerController;
} catch (e) { }