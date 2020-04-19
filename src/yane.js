/* yane.js
 * 
 * Handles the NES emulation.
 * 
 */
'use strict';

importScripts(
    './utils.js', 
    './memory.js', 
    './mapper.js', 
    './cpu.js', 
);

onmessage = function(msg) {
    const file = msg.data;

    const reader = new FileReader();
    reader.onload = function(e) {
        const memory = new Memory();
        let response = '';

        try {
            const buffer = new Uint8Array(e.target.result);
            mapper(memory, buffer)

            const cpu = new CPU(memory);
            for (let i = 0; i < 8000; i++) {
                response += `${cpu.toString()}\n`;

                cpu.step();
            }
        } catch(e) {
            console.error(e);
        }

        postMessage(response);
    }

    reader.readAsArrayBuffer(file);
}
