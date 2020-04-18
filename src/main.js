'use strict';

// import { CPU } from './cpu.js';
// import { Memory } from './memory.js';
// import { mapper } from './mapper.js';

document.getElementById('rom').addEventListener('change', mapFile, false);

function mapFile() {
    const rom = this.files[0];

    const memory = new Memory();
    memory.write(0x1234, 0x69);
    console.log(memory.read(0x1234).toString(16));

    mapper(memory, rom)
        .then(() => {
            const cpu = new CPU(memory);
            for(let i = 10; i > 0; i--) {
                cpu.step();
            }
        })
        .catch((e) => console.error(e));
}