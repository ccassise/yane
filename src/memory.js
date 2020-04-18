/* memory.js
 * 
 * Handles the NES reading and writing from/to memory locations.
 * 
 * @dependencies
 *      utils.js
 * 
 */
'use strict';

// import { uint8, uint16 } from './utils.js';

// export { Memory };

class Memory {
    #memory;

    constructor() {
        this.#memory = new Uint8Array(1024 * 64);
    }

    read(address) {
        return this.#memory[uint16(address)];
    }

    write(address, x) {
        this.#memory[uint16(address)] = uint8(x);
    }
}