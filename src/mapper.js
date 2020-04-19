/* mapper.js
 *
 * Maps NES rom to memory.
 * 
 */
'use strict';

import { uint8, uint16 } from './utils.js';

export async function mapper(memory, file) {
    const nes = await file.slice(0, 3).text();
    const eof = new Uint8Array(await file.slice(3, 4).arrayBuffer())[0];
    if (nes !== 'NES' || eof !== 0x1a) throw new Error('Not a valid NES rom');

    console.log('Valid NES rom');

    const header = new Uint8Array(await file.slice(0, 15).arrayBuffer());

    const prgSize = getPRGSize(header);
    const chrSize = getCHRSize(header);
    const trainingSize = getTrainingSize(header);

    console.log(file.size, 'misc rom', file.size - 16 - prgSize - chrSize);
    console.log('prg', prgSize);
    console.log('chr', chrSize);

    const prgStart = 16 + trainingSize;
    const prgEnd = prgStart + prgSize;
    const chrStart = prgEnd;
    const chrEnd = prgEnd + chrSize;

    const prg = new Uint8Array(await file.slice(prgStart, prgEnd).arrayBuffer());
    const chr = new Uint8Array(await file.slice(chrStart, chrEnd).arrayBuffer());

    await Promise.all([
        writePRG(memory, prg, prgSize),
        writeCHR(memory, chr, chrSize),
    ]);
}

function getPRGSize(header) {
    const lsb = header[4];
    const msb = header[9] & 0xf;

    // TODO: Support.
    if (msb === 0xf) throw new Error('Unsupported PRG size');

    return 16 * 1024 * ((msb << 8) | lsb);  // Size in 16KiB units.
}

function getCHRSize(header) {
    const lsb = header[5];
    const msb = header[9] >> 4;

    // TODO: Support.
    if (msb === 0xf) throw new Error('Unsupported CHR size');

    return 8 * 1024 * ((msb << 8) | lsb);  // Size in 8KiB units.
}

function getTrainingSize(header) {
    const trainingBit = header[9] & (1 << 2);

    // TODO: Support.
    if (trainingBit !== 0) throw new Error('Training area not supported');

    return 0;
}

/// Writes PRG contents from rom to memory.
async function writePRG(memory, data, size) {
    const base = 0x8000;
    const maxSize = 32 * 1024;

    for (let i = 0; i < maxSize; i++) {
        const j = i % size;  // Mirror if size doesn't fill entire 32KiB.
        const address = uint16(base + i);
        memory.write(address, data[j]);
    }
}

/// Writes CHR contents from rom to memory.
async function writeCHR(memory, data, size) {
    const base = 0x6000;
    const maxSize = 8 * 1024;

    for (let i = 0; i < maxSize; i++) {
        const j = i % size;  // Mirror if size doesn't fill entire 8KiB.
        const address = uint16(base + i);
        memory.write(address, data[j]);
    }
}
