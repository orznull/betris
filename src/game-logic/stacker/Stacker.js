const ROTATE = {
    'spawn': {
        'no': 'spawn',
        'cw': 'right',
        'ccw': 'left',
        '180': 'reverse',
    },
    'right': {
        'no': 'right',
        'cw': 'reverse',
        'ccw': 'spawn',
        '180': 'left'
    },
    'reverse': {
        'no': 'reverse',
        'cw': 'left',
        'ccw': 'right',
        '180': 'spawn'
    },
    'left': {
        'no': 'left',
        'cw': 'spawn',
        'ccw': 'reverse',
        '180': 'right'
    },
};

export class Stacker {
    // state enum
    static States = {
        INACTIVE: 1,
        MULTIPLAYER: 2,
        SINGLEPLAYER: 3,
        // ... add more if you want.
    }

    constructor(ruleset) {
        Object.assign(this, {
            matrix: [],
            hold: "",
            queue: "",
            piece: null,
            comboing: false,
            clear: 0,
            ruleset,
            listeners: [],
            incomingGarbage: [],
            state: Stacker.States.INACTIVE,
            _bag: [],
        });
        this.EMPTY_ROW = this.makeEmptyRow()
    }

    makeEmptyRow() {
        let emptyRow = '';
        while (emptyRow.length < this.ruleset.cols) {
            emptyRow += '_';
        }
        return emptyRow;
    }

    // easier to use alias for addListener
    on(event, listener) {
        this.addListener((e, context) => {
            if (event == e)
                listener(context);
        });
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    #emit(e, context) {
        this.listeners.forEach(listener => {
            listener(e, context);
        })
    }

    copy() {
        let { matrix, hold, queue } = this;
        let piece = this.piece ? Object.assign({}, this.piece) : null;
        return Object.assign(new Stacker(), { matrix, hold, queue, piece });
    }

    #spawn() {
        let { queue } = this;
        if (queue === "") {
            this.piece = null;
            return null;
        }
        let type = queue[0];
        this.queue = queue.substring(1);
        let [x, y] = this.ruleset.shapes[type].spawn;
        let rotation = 'spawn';
        this.piece = { type, x, y, rotation, ghostY: null };
        this.#computeGhost();
        this.#refillQueue();

        this.#emit("spawn");
        return type;
    }

    #refillQueue() {
        while (this.queue.length < this.ruleset.previews) {
            if (this._bag.length === 0) {
                this._bag = Object.keys(this.ruleset.shapes).slice(0);
            }
            let i = Math.floor(Math.random() * this._bag.length);
            let type = this._bag.splice(i, 1)[0];
            this.queue += type;
        }
    }

    #computeGhost() {
        if (this.piece !== null) {
            let ghost = Object.assign({}, this.piece);
            while (!this.#intersects(ghost)) {
                ghost.y -= 1;
            }
            this.piece.ghostY = ghost.y + 1;
        }
    }

    #transformPiece(tfs) {
        let { piece: { x, y, rotation } } = this;
        let attempt = 0;
        for (let { dx, dy, r } of tfs) {
            attempt++;
            this.piece.x = x + dx;
            this.piece.y = y + dy;
            this.piece.rotation = r;
            if (!this.#intersects(this.piece)) {
                this.#computeGhost();
                return attempt;
            }
        }
        // reset since all attempts failed
        this.piece.x = x;
        this.piece.y = y;
        this.piece.rotation = rotation;
        return null;
    }

    #sonicDrop() {
        this.piece.y = this.piece.ghostY;
    }

    #sonicMove(dir) {
        let last_x;
        do {
            last_x = this.piece.x
            this.#transformPiece([{
                dx: dir,
                dy: 0,
                r: this.piece.rotation,
            }])
        } while (last_x != this.piece.x)
    }

    #intersects(pc) {
        return this.minos(pc).some(([dx, dy]) => {
            return this.#getMatrix(pc.x + dx, pc.y + dy) != '_';
        });
    }

    #lock() {
        let { type, x, y } = this.piece;
        for (let [dx, dy] of this.minos(this.piece)) {
            this.#setMatrix(x + dx, y + dy, type);
        }
        let cleared = this.#sift();
        this.#spawn();
        this.comboing = cleared > 0;
        this.#emit("lock", { type, x, y });
    }

    #getMatrix(x, y) {
        if (x < 0 || x >= this.ruleset.cols || y < 0) {
            return 'X';
        } else if (y >= this.matrix.length) {
            return '_';
        } else {
            return this.matrix[y][x];
        }
    }

    #setMatrix(x, y, c) {
        if (x < 0 || x >= this.ruleset.cols || y < 0) {
            throw new Error('_setMatrix() invalid position');
        }
        while (y >= this.matrix.length) {
            this.matrix.push(this.EMPTY_ROW);
        }
        let row = this.matrix[y];
        this.matrix[y] = row.substring(0, x) + c + row.substring(x + 1);
    }

    #sift() {
        let cleared = 0;
        let clearedRows = [];
        for (let y = 0; y < this.matrix.length; y++) {
            if (!this.matrix[y].includes('_')) {
                this.matrix.splice(y, 1);
                clearedRows.push(y);
                y -= 1;
                cleared++;
            }
        }
        this.#emit("clear", { cleared, clearedRows });
        return cleared;
    }

    minos({ type, rotation }) {
        let rotate;
        switch (rotation) {
            case 'spawn': rotate = xy => xy; break;
            case 'right': rotate = ([x, y]) => ([y, -x]); break;
            case 'reverse': rotate = ([x, y]) => ([-x, -y]); break;
            case 'left': rotate = ([x, y]) => ([-y, x]); break;
        }
        return this.ruleset.shapes[type].coords.map(rotate);
    }

    // this was originally written with SRS in mind
    // probably requires a bigger rewrite if you want to do any kind of other kick table.
    // sorry i don't know a lot about this lol
    // https://harddrop.com/wiki/SRS#How_Guideline_SRS_Really_Works

    #kicks({ type, rotation }, spin) {
        let r0 = rotation;
        let r1 = ROTATE[r0][spin];
        let offsets = this.ruleset.offsets[this.ruleset.shapes[type].offsets];
        let tfs = [];
        for (let i = 0; i < offsets.spawn.length; i++) {
            let [x0, y0] = offsets[r0][i];
            let [x1, y1] = offsets[r1][i];
            tfs.push({
                dx: x0 - x1,
                dy: y0 - y1,
                r: r1,
            });
        }
        return tfs;
    }

    #addGarbage(height, col) {
        let line = '';
        for (let i = 0; i < ruleset.cols; i++) {
            line += (i === col) ? '_' : 'X';
        }
        for (let i = 0; i < height; i++) {
            this.matrix.unshift(line);
        }
        this.#computeGhost();
    }

    #addIncomingGarbage(height, col) {
        this.incomingGarbage.push({height, col})
    }

    is_piece_on_ground() {
        return this.piece.y == this.ghostY;
    }


    // Control Code
    apply(op, context) {

        // move this code into start
        if (this.piece == null) {
            this.#spawn();
        }

        // TODO: state implementation
        switch (op) {

            case 'start':
                this.#refillQueue();
                this.hold = '';
                this.matrix = [];
                this.piece = null;
                this.#spawn();
                this._bag = []
                break;
                
            case 'hold':
                let hold = this.hold;
                this.hold = this.piece ? this.piece.type : '';
                if (hold !== '') {
                    this.queue = hold + this.queue;
                }
                this.#spawn();
                break;

            // horizontal movement
            case 'left':
            case 'right':
                this.#transformPiece([{
                    dx: op == 'left' ? - 1 : 1,
                    dy: 0,
                    r: this.piece.rotation,
                }]);
                break;

            case 'left+':
            case 'right+':
                this.#sonicMove(op == 'left+' ? -1 : 1)
                break;

            // rotation
            // https://harddrop.com/wiki/SRS#How_Guideline_SRS_Really_Works
            case 'ccw':
            case 'cw':
            case '180':
                this.#transformPiece(this.#kicks(this.piece, op));
                break;

            // vertical movement
            case 'sd':
                this.#transformPiece([{
                    dx: 0,
                    dy: -1,
                    r: this.piece.rotation
                }])
                break;
            case 'sd+':
                this.#sonicDrop();
                break;
            case 'hd':
                this.#sonicDrop();
                this.#lock();
                break;

            default:
                break;
        }
        
        this.#emit("action", { operation: op, context })
    }
}


window.Stacker = Stacker;