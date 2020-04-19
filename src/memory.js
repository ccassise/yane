/* memory.js
 * 
 * Handles the NES reading and writing from/to memory locations.
 * 
 * @dependencies
 *      utils.js
 */
'use strict';

class Memory {
    constructor() {
        this._memory = new Uint8Array(1024 * 64);
    }

    read(address) {
        return this._memory[uint16(address)];
    }

    write(address, x) {
        this._memory[uint16(address)] = uint8(x);
    }
}
