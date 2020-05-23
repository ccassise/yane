'use strict';

document.getElementById('rom').addEventListener('change', loadRom, false);

const palette = Uint8ClampedArray.from([
    124, 124, 124, 255, 0, 0, 252, 255, 0, 0, 188, 255, 68, 40, 188, 255, 148, 0, 132, 255, 168, 0, 32, 255, 168, 16, 0, 255, 136, 20, 0, 255, 80, 48, 0, 255, 0, 120, 0, 255, 0, 104, 0, 255, 0, 88, 0, 255, 0, 64, 88, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    188, 188, 188, 255, 0, 120, 248, 255, 0, 88, 248, 255, 104, 68, 252, 255, 216, 0, 204, 255, 228, 0, 88, 255, 228, 56, 0, 255, 228, 92, 16, 255, 172, 124, 0, 255, 0, 184, 0, 255, 0, 168, 0, 255, 0, 168, 68, 255, 0, 136, 136, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    248, 248, 248, 255, 60, 188, 252, 255, 104, 136, 252, 255, 152, 120, 248, 255, 248, 120, 248, 255, 248, 88, 152, 255, 248, 120, 88, 255, 252, 160, 68, 255, 248, 184, 0, 255, 184, 248, 24, 255, 88, 216, 84, 255, 88, 248, 152, 255, 0, 232, 216, 255, 120, 120, 120, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    252, 252, 252, 255, 164, 228, 252, 255, 184, 184, 248, 255, 216, 184, 248, 255, 248, 184, 248, 255, 248, 164, 192, 255, 240, 208, 176, 255, 252, 224, 168, 255, 248, 216, 120, 255, 216, 248, 120, 255, 184, 248, 184, 255, 184, 248, 216, 255, 0, 252, 252, 255, 216, 216, 216, 255, 0, 0, 0, 255, 0, 0, 0, 255
]);


const scale = 50;
const conScale = 3;
const nesScale = 3;

const nesScreen = document.getElementById('test-canvas');
nesScreen.width = 256 * nesScale;
nesScreen.height = 240 * nesScale;
const nesScreenCtx = nesScreen.getContext('2d', { alpha: false });

let nesTest = new Uint8ClampedArray(256 * 240 * 4).fill(0);
const nessy = new ImageData(256 * nesScale, 240 * nesScale);

function forever() {
    for (let i = 0; i < nesTest.length; i += 4) {
        const pos = Math.floor((Math.random() * 64)) * 4;
        nesTest[i + 0] = palette[pos + 0];  // R
        nesTest[i + 1] = palette[pos + 1];  // G
        nesTest[i + 2] = palette[pos + 2];  // B
        nesTest[i + 3] = palette[pos + 3];  // A
    }

    console.time('forever');
    nearestNeighborInterp(new ImageData(nesTest, 256), nessy);
    nesScreenCtx.putImageData(nessy, 0, 0);
    console.timeEnd('forever');
    setTimeout(forever, 500);
}

const pal = new ImageData(16 * scale, 4 * scale);
nearestNeighborInterp(new ImageData(palette, 16), pal);


const canvas = document.getElementById('rend');
canvas.width = 16 * scale;
canvas.height = 4 * scale;
const ctx = canvas.getContext('2d', { alpha: false });
ctx.putImageData(pal, 0, 0);

//forever();

/// TODO: Implement with GPU.js
/// Integer scaling.
function nearestNeighborInterp(src, dest) {
    const scale = Math.floor(dest.height / src.height);

    for (let row = 0; row < dest.height; row++) {
        for (let col = 0; col < dest.width; col++) {
            const srcRow = Math.floor(row / scale);
            const srcCol = Math.floor(col / scale);
            const srcPos = (srcRow * src.width + srcCol) * 4
            const destPos = (row * dest.width + col) * 4

            dest.data[destPos + 0] = src.data[srcPos + 0];  // R
            dest.data[destPos + 1] = src.data[srcPos + 1];  // G
            dest.data[destPos + 2] = src.data[srcPos + 2];  // B
            dest.data[destPos + 3] = src.data[srcPos + 3];  // A
        }
    }
}

function loadRom() {
    if (window.Worker) {
        const rom = this.files[0];
        const nes = new Worker('./src/yane.js');
        nes.postMessage(rom);

        nes.onmessage = function (msg) {
            if (msg.data.patternTable) {
                drawPatternTable(msg.data.patternTable, 3);
            } else {
                // createDownloadLink(msg.data);
                // nes.terminate();
                //
                // drawPatternTable(msg.data, 3);
                // console.log(msg);
                drawFrame(new Uint8ClampedArray(msg.data), 3);
            }
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

function drawPatternTable(pattern, scale) {
    const patternTable = document.getElementById('pattern-table');
    patternTable.width = 128 * 2 * scale;
    patternTable.height = 128 * scale;
    const patternCtx = patternTable.getContext('2d', { alpha: false });
    const result = new ImageData(128 * 2 * scale, 128 * scale);

    nearestNeighborInterp(new ImageData(pattern, 128 * 2), result);
    patternCtx.clearRect(0, 0, patternTable.width, patternTable.height);
    patternCtx.putImageData(result, 0, 0);
}

function drawFrame(pattern, scale) {
    const patternTable = document.getElementById('test-canvas');
    patternTable.width = 256 * scale;
    patternTable.height = 240 * scale;
    const patternCtx = patternTable.getContext('2d', { alpha: false });
    const result = new ImageData(256 * scale, 240 * scale);

    nearestNeighborInterp(new ImageData(pattern, 256), result);
    patternCtx.clearRect(0, 0, patternTable.width, patternTable.height);
    patternCtx.putImageData(result, 0, 0);
}
