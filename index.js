import { NES } from './src/nes.js';
import { Renderer }  from './src/renderer.js';

document.getElementById('rom').addEventListener('change', loadRom, false);

const palette = Uint8ClampedArray.from([
    124, 124, 124, 255, 0, 0, 252, 255, 0, 0, 188, 255, 68, 40, 188, 255, 148, 0, 132, 255, 168, 0, 32, 255, 168, 16, 0, 255, 136, 20, 0, 255, 80, 48, 0, 255, 0, 120, 0, 255, 0, 104, 0, 255, 0, 88, 0, 255, 0, 64, 88, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    188, 188, 188, 255, 0, 120, 248, 255, 0, 88, 248, 255, 104, 68, 252, 255, 216, 0, 204, 255, 228, 0, 88, 255, 228, 56, 0, 255, 228, 92, 16, 255, 172, 124, 0, 255, 0, 184, 0, 255, 0, 168, 0, 255, 0, 168, 68, 255, 0, 136, 136, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    248, 248, 248, 255, 60, 188, 252, 255, 104, 136, 252, 255, 152, 120, 248, 255, 248, 120, 248, 255, 248, 88, 152, 255, 248, 120, 88, 255, 252, 160, 68, 255, 248, 184, 0, 255, 184, 248, 24, 255, 88, 216, 84, 255, 88, 248, 152, 255, 0, 232, 216, 255, 120, 120, 120, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    252, 252, 252, 255, 164, 228, 252, 255, 184, 184, 248, 255, 216, 184, 248, 255, 248, 184, 248, 255, 248, 164, 192, 255, 240, 208, 176, 255, 252, 224, 168, 255, 248, 216, 120, 255, 216, 248, 120, 255, 184, 248, 184, 255, 184, 248, 216, 255, 0, 252, 252, 255, 216, 216, 216, 255, 0, 0, 0, 255, 0, 0, 0, 255
]);

drawPalette(50);

import { setOrReset } from './src/utils.js';

function setOrReset2(a, b, options) {
    if (b & options) return a | options;
    else return a & ~options;
}
let a, b, c;

a = setOrReset(0, 0x11, 0x11).toString(16);
b = setOrReset(0x10, 0x01, 0x11).toString(16);
c = setOrReset(0x10, 0x11, 0x01).toString(16);
console.log(a, b, c);
a = setOrReset2(0, 0x11, 0x11).toString(16);
b = setOrReset2(0x10, 0x01, 0x11).toString(16);
c = setOrReset2(0x10, 0x11, 0x01).toString(16);
console.log(a, b, c);

function drawPalette(scale) {
    const canvas = document.getElementById('rend');
    canvas.width = 16 * scale;
    canvas.height = 4 * scale;
    const paletteCtx = canvas.getContext('2d', { alpha: false });
    const paletteRenderer = new Renderer(paletteCtx, 16, 4, scale);
    paletteRenderer.draw(new ImageData(palette, 16));
}

function drawPatternTable(pattern, scale) {
    const patternTable = document.getElementById('pattern-table');
    patternTable.width = 128 * 2 * scale;
    patternTable.height = 128 * scale;
    const patternCtx = patternTable.getContext('2d', { alpha: false });
    const patternTableRenderer = new Renderer(patternCtx, 128 * 2, 128, scale);
    patternTableRenderer.draw(new ImageData(pattern, 128 * 2));
}

function loadRom() {
    const screen = document.getElementById('nes-screen');
    const nesScale = 2;
    screen.width = 256 * nesScale;
    screen.height = 240 * nesScale;
    const screenCtx = screen.getContext('2d', { alpha: false });
    const renderer = new Renderer(screenCtx, 256, 240, nesScale);
    const rom = this.files[0];
    const reader = new FileReader();
    reader.readAsArrayBuffer(rom);

    reader.onload = (res) => {
        try {
            const buffer = new Uint8Array(res.target.result);
            const nes = new NES(buffer, renderer);
            drawPatternTable(nes.patternTable, 2);
            initKeyUp(nes);
            initKeydown(nes);
            nes.run();
        } catch (e) {
            console.error(e);
        }
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

function keyCodeToNesKey(key) {
    switch (key) {
        case 'KeyZ':       return 'A';
        case 'KeyX':       return 'B';
        case 'Quote':      return 'Select';
        case 'Enter':      return 'Start';
        case 'ArrowUp':    return 'Up';
        case 'ArrowDown':  return 'Down';
        case 'ArrowLeft':  return 'Left';
        case 'ArrowRight': return 'Right';
    }
}

function initKeydown(nes) {
    document.getElementById('nes-screen').addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                e.preventDefault();
                break;
            default: break;
        }
        const result = keyCodeToNesKey(e.code);
        if (typeof result === 'undefined') return;  // Invalid key press.
        nes.onKeyDown(result);
    });
}

function initKeyUp(nes) {
    document.getElementById('nes-screen').addEventListener('keyup', e => {
        const key = e.code;
        const result = keyCodeToNesKey(key);
        if (typeof result === 'undefined') return;  // Invalid key press.
        nes.onKeyUp(result);
    });
}
