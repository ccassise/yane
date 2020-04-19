'use strict';

document.getElementById('rom').addEventListener('change', loadRom, false);

function loadRom() {
    if (window.Worker) {
        const rom = this.files[0];
        const nes = new Worker('./src/yane.js');
        nes.postMessage(rom);

        nes.onmessage = function(msg) {
            createDownloadLink(msg.data);
            nes.terminate();
        }
    } else {
        console.error('Worker not supported');
    }

}

function createDownloadLink(text) {
    const file = new Blob([text], { type: 'text/plain' });

    const download = document.createElement('a');
    download.href = window.URL.createObjectURL(file);
    download.download = 'cpu-log.txt';
    download.textContent = 'hello?';

    const p = document.createElement('p');
    p.appendChild(download);
    document.body.appendChild(p);
}