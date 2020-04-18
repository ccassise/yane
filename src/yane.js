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

    mapper(memory, rom)
        .then(() => {
            const cpu = new CPU(memory);
            for (let i = 0; i < 100; i++) {
            // while (true){
                cpu.step();
            }
        })
        .catch((e) => console.error(e));

}