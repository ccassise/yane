/* standard-controller.js
 * 
 * Standard NES controller.
 * 
 */
'use strict'

class StandardController {
    constructor() {
        this.data = 0x00;  // Current buttons that are pressed.
        this.register = 0x00;  // Data that will be sent.
        // When true the register will continuously be updated with controller data.
        this._isUpdateRegister = false;
    }

    get data() { return this._data; }
    set data(v) { this._data = uint8(v); }

    // 8 bit shift register.
    get register() { return this._register; }
    set register(v) { this._register = uint8(v); }

    static get KEYS() {
        return {
            A:      1 << 0,
            B:      1 << 1,
            Select: 1 << 2,
            Start:  1 << 3,
            Up:     1 << 4,
            Down:   1 << 5,
            Left:   1 << 6,
            Right:  1 << 7,
        };
    }

    keydown(key) {
        this.data |= StandardController.KEYS[key];
        this._updateRegister();
    }

    keyup(key) {
        this.data &= ~StandardController.KEYS[key];
        this._updateRegister();
    }

    onRead() {
        const result = this.register & 0x01;
        this.register >>= 1;
        this.register |= (1 << 7); // Subsequent reads returns 1.
        return result;
    }

    onWrite(data) {
        if (data & 0x01) {
            this._isUpdateRegister = true;
            this.register = this.data;
        } else {
            this._isUpdateRegister = false;
        }
    }

    _updateRegister() {
        if (this._isUpdateRegister) {
            this.register = this.data;
        }
    }
}
