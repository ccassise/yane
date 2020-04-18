'use strict';

document.getElementById('rom').addEventListener('change', loadRom, false);

function loadRom() {
    if (window.Worker) {
        const rom = this.files[0];
        const nes = new Worker('./src/yane.js', { type: 'module' });
        nes.postMessage(rom);
    } else {
        console.error('Worker not supported');
    }
}
