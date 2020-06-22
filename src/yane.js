/* yane.js
 * 
 * Handles the NES emulation.
 * 
 */
'use strict';

importScripts(
    './cpu.js',
    './mapper.js',
    './memory.js',
    './ppu.js',
    './standard-controller.js',
    './utils.js',
);

class NES {
    constructor(rom) {
        this._memory = new Memory(this);
        this._ppu = new PPU(this);
        mapper(this._memory, this._ppu, rom);
        this._cpu = new CPU(this);

        postMessage({patternTable: this._ppu.renderPatternTable()});
    }

    run() {
        // let cpuLog = [];
        // console.log(this._ppu);
        try {
            // for (let i = 0; i < 500000; i++) {
                // while (true) {
            const run = () => {
                // if (cpuLog.length > 1000) cpuLog.shift();
                // cpuLog.push(this._cpu.toString() + '\n');
                const start = performance.now();
                while(!this._ppu.frameReady) {
                    const ppuTicks = this._cpu.step() * 3;  // How many ticks the PPU needs to do to 'catch up'.

                    for (let j = 0; j < ppuTicks; j++) {
                        this._ppu.step();
                    }
                }
                // if (this._ppu.frameReady) {
                    // postMessage(this._ppu._frameBuffer.buffer, [this._ppu._frameBuffer.buffer]);
                    this._ppu.frameReady = false;
                // }
                const end = performance.now();
                // console.log(end - start);
                setTimeout(run, 16 - (end - start));
            }
            run();

        } catch (e) {
            console.error(e);
        }
        // postMessage(cpuLog);
        // printTestOutput(this._memory);

        // // Pattern table numbers?
        // let line = '';
        // for (let i = 0; i < 32 * 30; i++) {
        //     //line += memory._vram[i].toString(16) + ' ';
        //     if (i % 32 === 0) {
        //         console.log(line);
        //         line = '';
        //     }
        //     line += this._ppu.read(0x2000 + i).toString(16) + ' ';
        // }
        // // console.log('finished :)');
        // console.log(cpuLog);
    }

    // Reads from NES memory.
    read(address) {
        return this._memory.read(address);
    }

    // Writes to NES memory.
    write(address, data) {
        this._memory.write(address, data);
    }

    interrupt(type) {
        this._cpu.triggerInterrupt(type);
    }

    onCtrlWrite(data) {
        this._ppu.onCtrlWrite(data);
    }

    onStatusRead(data) {
        this._ppu.onStatusRead(data);
    }

    onAddressWrite(data) {
        this._ppu.onAddressWrite(data);
    }

    onDataRead(data) {
        this._ppu.onDataRead(data);
    }

    onDataWrite(data) {
        this._ppu.onDataWrite(data);
    }

    onInputWrite(data) {
        input.onWrite(data);
    }

    onInputRead() {
        return input.onRead();
    }

    sendFrame(buffer) {
        postMessage(buffer.buffer, [buffer.buffer]);
    }

    // onStatusWrite(data) {
    //     this._ppu.onStatusWrite(data);
    // }
}

const input = new StandardController();

onmessage = function (msg) {
    if (msg.data.hasOwnProperty('keydown')) {
        input.keydown(msg.data.keydown);
        // console.log(input.data.toString(2));
        return;
    } else if (msg.data.hasOwnProperty('keyup')) {
        input.keyup(msg.data.keyup);
        // console.log(input.data.toString(2));
        return;
    }
    const file = msg.data;
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = function (res) {
        try {
            const buffer = new Uint8Array(res.target.result);
            const nes = new NES(buffer);
            nes.run();
        } catch (e) {
            console.error(e);
        }
    }
}

function printTestOutput(memory) {
    console.log('0x6000', memory._memory[0x6000].toString(16));
    if (memory._memory[0x6001] !== 0xde || memory._memory[0x6002] !== 0xb0 || memory._memory[0x6003] !== 0x61) {
        console.log('0x6003', memory._memory[0x6003].toString(16));
        console.log('Not valid data');
        return;
    }
    const start = 0x6004;
    let result = '';
    for (let i = 0; memory._memory[start + i] !== 0; i++) {
        result += String.fromCharCode(memory._memory[start + i]);
        // console.log(String.fromCharCode(memory._memory[start + i]));
    }
    console.log('test result', result);
    // console.log('test test');
}

