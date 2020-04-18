'use strict';

document.getElementById('rom').addEventListener('change', mapFile, false);

function mapFile() {
    if (window.Worker) {
        const rom = this.files[0];
        const nes = new Worker('./src/yane.js', { type: 'module' });
        nes.postMessage(rom);
        // nes.terminate();
    } else {
        console.error('worker not supported');
    }
}