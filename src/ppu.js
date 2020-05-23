/* ppu.js
 * 
 *
 * 
 * @dependencies
 *      utils.js
 *      memory.js
 */
'use strict'

class PPU {
    constructor(nes) {
        this._nes = nes;
        this._vram = new Uint8Array(1024 * 16);

        this.frameReady = false;

        this._scanLine = 0;
        this._cycle = 0;

        this._vramAddr = 0;  // 15 bit.
        this._vramTmpAddr = 0;  // 15 bit.
        this._fineXScroll = 0;  // Fine X scroll. 3 bit
        this._writeToggle = false;  // First or second write toggle. First is false.

        this._nmiOccurred = false;
        this._nmiOutput = false;
    }

    step() {
        if (this._nmiOccurred && this._nmiOutput) {
            this._nmiOutput = false;
            this._nes.interrupt(CPU.INTERRUPT.NMI);
        }

        if (this._cycle === 0 && this._scanLine === 0) {
            this.renderFrame();
            this.frameReady = true;
        }

        // Set vblank
        if (this._scanLine === 241 && this._cycle === 1) {
            // this._control |= 0x80;
            // this._status  |= 0x80;
            this._nes._memory._memory[0x2002] |= 0x80;
            this._nmiOccurred = true;
        }

        // Clear vblank, overflow, sprite.
        if (this._scanLine === 261 && this._cycle === 1) {
            // this._control &= 0x1f;
            // this._status  &= 0x1f;
            this._nes._memory._memory[0x2002] &= 0x1f;
            this._nmiOccurred = false;
        }

        this._cycle++;

        if (this._cycle >= 340) {
            this._cycle = 0;
            if (this._scanLine >= 261) {
                this._scanLine = 0;
            } else {
                this._scanLine++;
            }
        }
    }

    renderFrame() {
        // Screen height and width and room for indiviudal RGBA.
        this._frameBuffer = new Uint8ClampedArray(256 * 240 * 4);
        const tile = new Uint8Array(8);

        for (let i = 0; i < 32 * 30; i++) {
            const tileStart = this._backgroundPatternTable | (this.read(0x2000 + i) << 4);
            for (let j = 0; j < 8; j++) {
                tile[j] = this.read(tileStart + j) | this.read(tileStart + j + 8);
            }

            const row = (Math.floor(i / 32)) * 256 * 8 * 4;
            const col = (i % 32) * 8 * 4;
            for (let j = 0; j < 8; j++) {
                let pos = row + (j * 256 * 4) + col;
                for (let k = 7; k >= 0; k--) {
                    // Copy tile bits to frame.
                    if (tile[j] & (1 << k)) {
                        this._frameBuffer[pos + 0] = 255;
                        this._frameBuffer[pos + 1] = 255;
                        this._frameBuffer[pos + 2] = 255;
                        this._frameBuffer[pos + 3] = 255;
                    } else {
                        this._frameBuffer[pos + 0] = 0;
                        this._frameBuffer[pos + 1] = 0;
                        this._frameBuffer[pos + 2] = 0;
                        this._frameBuffer[pos + 3] = 255;
                    }
                    pos += 4;
                }
            }
        }
    }

    renderPatternTable() {
        const patternTable = new Uint8ClampedArray(128 * 128 * 2 * 4).fill(0);
        const tile = new Uint8Array(8).fill(0);
        const tableWidth = 128 * 2;  // Both pattern tables.

        for (let i = 0x0000; i < 0x1fff; i += 0x10) {
            // Row and column with RGBA values and with table select.
            const row = ((i & 0x0f00) >> 8) * tableWidth * 8 * 4;
            const col = ((((i & 0x00f0) >> 4) * 8) + (((i & 0xf000) >> 12) * 128)) * 4;

            // Fill tile with pixels.
            for (let j = 0; j < 8; j++) {
                tile[j] = this.read(i + j) | this.read(i + j + 8);
            }

            // Map tile to frame.
            for (let j = 0; j < 8; j++) {
                let pos = row + (j * tableWidth * 4) + col;
                for (let k = 7; k >= 0; k--) {
                    if (tile[j] & (1 << k)) {
                        patternTable[pos + 0] = 255;
                        patternTable[pos + 1] = 255;
                        patternTable[pos + 2] = 255;
                        patternTable[pos + 3] = 255;
                    } else {
                        patternTable[pos + 0] = 0;
                        patternTable[pos + 1] = 0;
                        patternTable[pos + 2] = 0;
                        patternTable[pos + 3] = 255;
                    }
                    pos += 4;
                }
            }
        }

        return patternTable;
    }

    onCtrlWrite(data) {
        this._nmiOutput = (data & (1 << 7)) ? true : false;
    }

    // TODO: Should return old status of bit 7 THEN clear.
    /// data should be value at address 0x2002.
    onStatusRead(data) {
        this._nes.write(0x2002, data & 0xef);  // Clear bit 7 on read.
        this._vramAddr = 0;
        this._nmiOccurred = false;
    }

    /// data should be value at address 0x2006.
    onAddressWrite(data) {
        if (!this._writeToggle) {
            this._vramAddr = (this._vramAddr & 0x00ff) | (data << 8);
        } else {
            this._vramAddr = (this._vramAddr & 0xff00) | data;
        }
        this._writeToggle = !this._writeToggle;
    }

    /// data should be value at address 0x2007.
    onDataRead(data) {
        this._vramAddr += (this._control & (1 << 2) ? 32 : 1);
        const result = this._dataBuffer;
        this._dataBuffer = this.read(this._vramAddr);
        return result;
    }

    /// data should be value at address 0x2007.
    onDataWrite(data) {
        this._dataBuffer = data;
        this.write(this._vramAddr, this._dataBuffer);
        this._vramAddr += (this._control & (1 << 2) ? 32 : 1);
    }

    /// Read from VRAM.
    read(address) {
        // return this._vram[uint16(address) % 0x4000];
        return this._vram[uint16(address)];
    }

    /// Write to VRAM.
    write(address, data) {
        // this._vram[uint16(address) % 0x4000] = data;
        this._vram[uint16(address)] = data;
    }

    /// PPU registers.
    get _vramAddr() { return this._addr & 0xefff; }
    get _vramTmpAddr() { return this._tmpAddr & 0xefff; }
    get _fineXScroll() { return this._fineX & 0x07; }
    get _dataBuffer() { return uint8(this._readBuf); }
    get _patternTableShiftRegister1() { return this._shift16reg1; }
    get _patternTableShiftRegister2() { return this._shift16reg2; }
    get _paletteAttributeShiftRegister1() { return this._shift8reg1; }
    get _paletteAttributeShiftRegister2() { return this._shift8reg2; }

    set _vramAddr(x) { this._addr = x & 0xefff; }
    set _vramTmpAddr(x) { this._tmpAddr = x & 0xefff; }
    set _fineXScroll(x) { this._fineX = x & 0x07; }
    set _dataBuffer(x) { this._readBuf = uint8(x); }
    set _patternTableShiftRegister1(x) { this._shift16reg1 = uint16(x); }
    set _patternTableShiftRegister2(x) { this._shift16reg2 = uint16(x); }
    set _paletteAttributeShiftRegister1(x) { this._shift8reg1 = uint8(x); }
    set _paletteAttributeShiftRegister2(x) { this._shift8reg2 = uint8(x); }


    /// Memory mapped registers that can be used with CPU.
    //
    get _control() { return this._nes.read(0x2000); }
    get _mask() { return this._nes.read(0x2001); }
    get _status() { return this._nes.read(0x2002); }
    get _oamAddr() { return this._nes.read(0x2003); }
    get _oamData() { return this._nes.read(0x2004); }
    get _scroll() { return this._nes.read(0x2005); }
    get _address() { return this._nes.read(0x2006); }
    get _data() { return this._nes.read(0x2007); }
    get _oamDma() { return this._nes.read(0x4014); }

    set _control(x) { this._nes.write(0x2000, x); }
    set _mask(x) { this._nes.write(0x2001, x); }
    set _status(x) { this._nes.write(0x2002, x); }
    set _oamAddr(x) { this._nes.write(0x2003, x); }
    set _oamData(x) { this._nes.write(0x2004, x); }
    set _scroll(x) { this._nes.write(0x2005, x); }
    set _address(x) { this._nes.write(0x2006, x); }
    set _data(x) { this._nes.write(0x2007, x); }
    set _oamDma(x) { this._nes.write(0x4014, x); }

    // TODO: Maybe convert this to a static or something.
    get _baseNametable() {
        switch (this._control & 0x03) {
            case 0x00:
                return 0x2000;
            case 0x01:
                return 0x2400;
            case 0x02:
                return 0x2800;
            case 0x03:
                return 0x2c00;
        }
    }

    get _backgroundPatternTable() {
        return (this._control & 0x10) << 8;
    }

    /// NES color palette in RGBA groups.
    /*
    const palette = ([
        [124, 124, 124, 255], [0, 0, 252, 255],     [0, 0, 188, 255],     [68, 40, 188, 255],   [148, 0, 132, 255],   [168, 0, 32, 255],    [168, 16, 0, 255],    [136, 20, 0, 255],    [80, 48, 0, 255],     [0, 120, 0, 255],     [0, 104, 0, 255],     [0, 88, 0, 255],      [0, 64, 88, 255],   [0, 0, 0, 255],       [0, 0, 0, 255], [0, 0, 0, 255],
        [188, 188, 188, 255], [0, 120, 248, 255],   [0, 88, 248, 255],    [104, 68, 252, 255],  [216, 0, 204, 255],   [228, 0, 88, 255],    [228, 56, 0, 255],    [228, 92, 16, 255],   [172, 124, 0, 255],   [0, 184, 0, 255],     [0, 168, 0, 255],     [0, 168, 68, 255],    [0, 136, 136, 255], [0, 0, 0, 255],       [0, 0, 0, 255], [0, 0, 0, 255],
        [248, 248, 248, 255], [60, 188, 252, 255],  [104, 136, 252, 255], [152, 120, 248, 255], [248, 120, 248, 255], [248, 88, 152, 255],  [248, 120, 88, 255],  [252, 160, 68, 255],  [248, 184, 0, 255],   [184, 248, 24, 255],  [88, 216, 84, 255],   [88, 248, 152, 255],  [0, 232, 216, 255], [120, 120, 120, 255], [0, 0, 0, 255], [0, 0, 0, 255],
        [252, 252, 252, 255], [164, 228, 252, 255], [184, 184, 248, 255], [216, 184, 248, 255], [248, 184, 248, 255], [248, 164, 192, 255], [240, 208, 176, 255], [252, 224, 168, 255], [248, 216, 120, 255], [216, 248, 120, 255], [184, 248, 184, 255], [184, 248, 216, 255], [0, 252, 252, 255], [216, 216, 216, 255], [0, 0, 0, 255], [0, 0, 0, 255],
    ]);
    */


    /// NES color palette in RGBA groups.
    static get palette() {
        return Uint8ClampedArray.from([
            124, 124, 124, 255, 0, 0, 252, 255, 0, 0, 188, 255, 68, 40, 188, 255, 148, 0, 132, 255, 168, 0, 32, 255, 168, 16, 0, 255, 136, 20, 0, 255, 80, 48, 0, 255, 0, 120, 0, 255, 0, 104, 0, 255, 0, 88, 0, 255, 0, 64, 88, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
            188, 188, 188, 255, 0, 120, 248, 255, 0, 88, 248, 255, 104, 68, 252, 255, 216, 0, 204, 255, 228, 0, 88, 255, 228, 56, 0, 255, 228, 92, 16, 255, 172, 124, 0, 255, 0, 184, 0, 255, 0, 168, 0, 255, 0, 168, 68, 255, 0, 136, 136, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
            248, 248, 248, 255, 60, 188, 252, 255, 104, 136, 252, 255, 152, 120, 248, 255, 248, 120, 248, 255, 248, 88, 152, 255, 248, 120, 88, 255, 252, 160, 68, 255, 248, 184, 0, 255, 184, 248, 24, 255, 88, 216, 84, 255, 88, 248, 152, 255, 0, 232, 216, 255, 120, 120, 120, 255, 0, 0, 0, 255, 0, 0, 0, 255,
            252, 252, 252, 255, 164, 228, 252, 255, 184, 184, 248, 255, 216, 184, 248, 255, 248, 184, 248, 255, 248, 164, 192, 255, 240, 208, 176, 255, 252, 224, 168, 255, 248, 216, 120, 255, 216, 248, 120, 255, 184, 248, 184, 255, 184, 248, 216, 255, 0, 252, 252, 255, 216, 216, 216, 255, 0, 0, 0, 255, 0, 0, 0, 255
        ]);
    }


}

