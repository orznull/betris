import { Stacker } from "./Stacker";

/* this was left in here from the original visualizer. leaving it in for fun */
export class CheeseRaceStacker extends Stacker {
  constructor() {
      super();
      Object.assign(this, { _prevGarbageCol: null });
      this._cheese();
  }

  apply(op) {
      super.apply(op);
      if (op === 'hd') {
          this._cheese();
      }
  }

  _cheese() {
      let cheese = 0;
      for (let row of this.matrix) {
          if (row.includes('X')) {
              cheese += 1;
          }
      }

      let target = this.comboing ? ruleset.cheese.min : ruleset.cheese.max;
      while (cheese < target) {
          cheese += 1;
          this.#addGarbage(1);
      }
  }

  #addGarbage(height) {
      let col;
      if (this._prevGarbageCol === null) {
          col = Math.floor(Math.random() * ruleset.cols);
      } else {
          col = Math.floor(Math.random() * (ruleset.cols - 1));
          col = (col + this._prevGarbageCol + 1) % ruleset.cols;
      }
      this._prevGarbageCol = col;

      let line = '';
      for (let i = 0; i < ruleset.cols; i++) {
          line += (i === col) ? '_' : 'X';
      }
      for (let i = 0; i < height; i++) {
          this.matrix.unshift(line);
      }
      this._computeGhost();
  }
}