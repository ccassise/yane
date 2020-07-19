import { CPU } from './cpu.js';
import { mapper } from './mapper.js';
import { Memory } from './memory.js';
import { PPU } from './ppu.js';
import { StandardController } from './standard-controller.js';

export class NES {
    constructor(rom, renderer) {
        this._memory = new Memory(this);
        this._ppu = new PPU(this);
        mapper(this._memory, this._ppu, rom);
        this._cpu = new CPU(this);
        this._input = new StandardController();
        this._renderer = renderer;

        this._frameDrawn = false;
    }

    run() {
        const gameLoop = () => {
            this._frameDrawn = false;
            while(!this._frameDrawn) {
                const ppuTicks = this._cpu.step() * 3;  // How many ticks the PPU needs to do to 'catch up'.

                for (let i = 0; i < ppuTicks; i++) {
                    this._ppu.step();
                }
            }

            window.requestAnimationFrame(gameLoop);
        }
        window.requestAnimationFrame(gameLoop);

        // Pattern table numbers?
        // let line = '';
        // for (let i = 0; i < 32 * 30; i++) {
        //     //line += memory._vram[i].toString(16) + ' ';
        //     if (i % 32 === 0) {
        //         console.log(line);
        //         line = '';
        //     }
        //     line += this._ppu.read(0x2000 + i).toString(16) + ' ';
        // }
        // // console.log(cpuLog);
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
        this._input.onWrite(data);
    }

    onInputRead() {
        return this._input.onRead();
    }

    draw(buffer) {
        this._frameDrawn = true;
        this._renderer.draw(new ImageData(buffer, 256));
    }

    onKeyDown(key) {
        this._input.keydown(key);
    }

    onKeyUp(key) {
        this._input.keyup(key);
    }

    // onStatusWrite(data) {
    //     this._ppu.onStatusWrite(data);
    // }

    get patternTable() {
        return this._ppu.renderPatternTable();
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

