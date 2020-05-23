/* mapper.js
 *
 * Maps .nes file to NES memory.
 * 
 * @dependencies
 *      memory.js
 */
'use strict';

function mapper(memory, ppu, buffer) {
    const nes = new TextDecoder().decode(buffer.slice(0, 3));
    const eof = buffer[3];
    if (nes !== 'NES' || eof !== 0x1a) throw new Error('Not a valid NES rom');

    console.log('Valid NES rom');

    const header = buffer.slice(0, 16);
    console.log(header);

    const prgSize = getPRGSize(header);
    const chrSize = getCHRSize(header);
    const trainingSize = getTrainingSize(header);

    console.log(buffer.length, 'misc rom', buffer.length - header.length - prgSize - chrSize);
    console.log('prg', prgSize);
    console.log('chr', chrSize);

    const prgStart = header.length + trainingSize;
    const prgEnd = prgStart + prgSize;
    const chrStart = prgEnd;
    const chrEnd = prgEnd + chrSize;

    const prg = buffer.slice(prgStart, prgEnd);
    const chr = buffer.slice(chrStart, chrEnd);

    writePRG(memory, prg, prgSize);
    writeCHR(ppu, chr, chrSize);
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
function writePRG(memory, data, size) {
    const base = 0x8000;
    const maxSize = 32 * 1024;

    for (let i = 0; i < maxSize; i++) {
        const j = i % size;  // Mirror if size doesn't fill entire 32KiB.
        const address = uint16(base + i);
        // TODO: This should be more elegant?
        //memory.write(address, data[j]);
        memory._memory[address] = uint8(data[j]);
    }
}

/// Writes CHR contents from rom to memory.
function writeCHR(ppu, data, size) {
    const base = 0x0000;
    const maxSize = 8 * 1024;

    for (let i = 0; i < maxSize; i++) {
        const j = i % size;  // Mirror if size doesn't fill entire 8KiB.
        const address = base + i;
        ppu.write(address, data[j]);
    }
}

