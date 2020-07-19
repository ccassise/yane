import { uint8 } from './utils.js';

export class StandardController {
    constructor() {
        this._dataStream = 0x00;  // Current buttons that are pressed.
        this._register = 0x00;  // Data that will be sent.

        // When true the register will continuously be updated with controller data.
        this._shouldUpdate = false;

        this.KEYS = {
            A: 1 << 0,
            B: 1 << 1,
            Select: 1 << 2,
            Start: 1 << 3,
            Up: 1 << 4,
            Down: 1 << 5,
            Left: 1 << 6,
            Right: 1 << 7,
        };
    }

    get _dataStream() { return this.__dataStream; }
    set _dataStream(newData) { this.__dataStream = uint8(newData); }

    // 8 bit shift register.
    get _register() { return this.__register; }
    set _register(newRegister) { this.__register = uint8(newRegister); }

    keydown(key) {
        this._dataStream |= this.KEYS[key];
        this._updateRegister();
    }

    keyup(key) {
        this._dataStream &= ~this.KEYS[key];
        this._updateRegister();
    }

    onRead() {
        const result = this._register & 0x01;
        this._register >>= 1;
        this._register |= (1 << 7); // Subsequent reads returns 1.
        return result;
    }

    onWrite(data) {
        if (data & 0x01) {
            this._shouldUpdate = true;
            this._register = this._dataStream;
        } else {
            this._shouldUpdate = false;
        }
    }

    _updateRegister() {
        if (this._shouldUpdate) {
            this._register = this._dataStream;
        }
    }
}
