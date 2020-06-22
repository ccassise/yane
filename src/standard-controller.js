/* standard-controller.js
 * 
 * Standard NES controller.
 * 
 */
'use strict'

class StandardController {
    constructor() {
        this._data = 0x00;  // Current buttons that are pressed.
        this._register = 0x00;  // Data that will be sent.
        // When true the register will continuously be updated with controller data.
        this._isUpdateRegister = false;

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

    get _data() { return this.__data; }
    set _data(v) { this.__data = uint8(v); }

    // 8 bit shift register.
    get _register() { return this.__register; }
    set _register(v) { this.__register = uint8(v); }

    keydown(key) {
        this._data |= this.KEYS[key];
        this._updateRegister();
    }

    keyup(key) {
        this._data &= ~this.KEYS[key];
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
            this._isUpdateRegister = true;
            this._register = this._data;
        } else {
            this._isUpdateRegister = false;
        }
    }

    _updateRegister() {
        if (this._isUpdateRegister) {
            this._register = this._data;
        }
    }
}
