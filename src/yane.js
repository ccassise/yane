/* yane.js
 * 
 * Handles the NES emulation.
 * 
 */
'use strict';

import { CPU } from './cpu.js';
import { Memory } from './memory.js';
import { mapper } from './mapper.js';

onmessage = function(message) {
    const rom = message.data;
    const memory = new Memory();
    let response = '';

    mapper(memory, rom)
        .then(() => {
            const cpu = new CPU(memory);
            for (let i = 0; i < 8000; i++) {
                response += `${cpu.toString()}\n`;

                cpu.step();
        }})
        .catch((e) => console.error(e))
        .finally(() => this.postMessage(response));
}
