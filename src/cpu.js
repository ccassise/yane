import { uint8, uint16, setOrReset } from './utils.js';

export class CPU {
    constructor(nes) {
        this._nes = nes;

        this._interrupts = [];

        // CPU Registers.
        this._accumulator = 0x00;
        this._xIndex = 0x00;
        this._yIndex = 0x00;
        this._status = 0x34;
        this._stackPointer = 0xfd;

        this._cycles = 0;  // Number of cycles current instruction uses.
        this._totalCycles = 7;  // Total number of cycles.

        const startPCL = uint16(this._nes.read(0xfffc));
        const startPCH = uint16(this._nes.read(0xfffd) << 8);
        this._programCounter = startPCH | startPCL;

        // TODO: Remove - only used for testing CPU with nestest.nes
        console.log('pc', this._programCounter.toString(16));
        // this._programCounter = 0xc000;

        // CPU status flags.
        this._CARRY = 1 << 0;
        this._ZERO = 1 << 1;
        this._INTERRUPT_DISABLE = 1 << 2;
        this._DECIMAL = 1 << 3;
        this._BREAK = 1 << 4;
        this._EXPANSION = 1 << 5;
        this._OVERFLOW = 1 << 6;
        this._NEGATIVE = 1 << 7;

        this._STACK_BASE = 0x0100;

        // Number of bytes each instruction uses.
        this._INSTRUCTION_LENGTH = [
            1, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
            3, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
            1, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
            1, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
            2, 2, 2, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 0, 3, 0, 0,
            2, 2, 2, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
            2, 2, 2, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
            2, 2, 2, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
            2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
        ];

        // Number of cycles each instruction uses. Does not include page crosses.
        this._INSTRUCTION_CYCLES = [
            7, 6, 0, 0, 3, 3, 5, 0, 3, 2, 2, 0, 4, 4, 6, 0,
            2, 5, 0, 0, 4, 4, 6, 0, 2, 4, 2, 0, 4, 4, 7, 0,
            6, 6, 0, 0, 3, 3, 5, 0, 4, 2, 2, 0, 4, 4, 6, 0,
            2, 5, 0, 0, 4, 4, 6, 0, 2, 4, 2, 0, 4, 4, 7, 0,
            6, 6, 0, 0, 3, 3, 5, 0, 3, 2, 2, 0, 3, 4, 6, 0,
            2, 5, 0, 0, 4, 4, 6, 0, 2, 4, 2, 0, 4, 4, 7, 0,
            6, 6, 0, 0, 3, 3, 5, 0, 4, 2, 2, 0, 5, 4, 6, 0,
            2, 5, 0, 0, 4, 4, 6, 0, 2, 4, 2, 0, 4, 4, 7, 0,
            2, 6, 2, 0, 3, 3, 3, 0, 2, 2, 2, 0, 4, 4, 4, 0,
            2, 6, 0, 0, 4, 4, 4, 0, 2, 5, 2, 0, 0, 5, 0, 0,
            2, 6, 2, 0, 3, 3, 3, 0, 2, 2, 2, 0, 4, 4, 4, 0,
            2, 5, 0, 0, 4, 4, 4, 0, 2, 4, 2, 0, 4, 4, 4, 0,
            2, 6, 2, 0, 3, 3, 5, 0, 2, 2, 2, 0, 4, 4, 6, 0,
            2, 5, 0, 0, 4, 4, 6, 0, 2, 4, 2, 0, 4, 4, 7, 0,
            2, 6, 2, 0, 3, 3, 5, 0, 2, 2, 2, 0, 4, 4, 6, 0,
            2, 5, 0, 0, 4, 4, 6, 0, 2, 4, 2, 0, 4, 4, 7, 0,
        ];

        // Instructions that are affected by page crosses and number of cycles a page cross adds.
        this._PAGE_CROSS = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
        ];

        // TODO: Add unofficial NOP addressing modes to table.
        this._ADDRESSING_MODES = [
            this._impl, this._indX, null,       null,      null,       this._zpg,  this._zpg,  null,      this._impl, this._imme, null, /*A*/ null, null,       this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      null,       this._zpgX, this._zpgX, null,      this._impl, this._absY, null,       null, null,       this._absX, this._absX,  null,
            this._abs,  this._indX, null,       null,      this._zpg,  this._zpg,  this._zpg,  null,      this._impl, this._imme, null, /*A*/ null, this._abs,  this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      null,       this._zpgX, this._zpgX, null,      this._impl, this._absY, null,       null, null,       this._absX, this._absX,  null,
            this._impl, this._indX, null,       null,      null,       this._zpg,  this._zpg,  null,      this._impl, this._imme, null, /*A*/ null, this._abs,  this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      null,       this._zpgX, this._zpgX, null,      this._impl, this._absY, null,       null, null,       this._absX, this._absX,  null,
            this._impl, this._indX, null,       null,      null,       this._zpg,  this._zpg,  null,      this._impl, this._imme, null, /*A*/ null, this._ind,  this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      null,       this._zpgX, this._zpgX, null,      this._impl, this._absY, null,       null, null,       this._absX, this._absX,  null,
            null,       this._indX, null,       null,      this._zpg,  this._zpg,  this._zpg,  null,      this._impl, null,       this._impl, null, this._abs,  this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      this._zpgX, this._zpgX, this._zpgY, null,      this._impl, this._absY, this._impl, null, null,       this._absX, null,        null,
            this._imme, this._indX, this._imme, null,      this._zpg,  this._zpg,  this._zpg,  null,      this._impl, this._imme, this._impl, null, this._abs,  this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      this._zpgX, this._zpgX, this._zpgY, null,      this._impl, this._absY, this._impl, null, this._absX, this._absX, this._absY,  null,
            this._imme, this._indX, null,       null,      this._zpg,  this._zpg,  this._zpg,  null,      this._impl, this._imme, this._impl, null, this._abs,  this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      null,       this._zpgX, this._zpgX, null,      this._impl, this._absY, null,       null, null,       this._absX, this._absX,  null,
            this._imme, this._indX, null,       null,      this._zpg,  this._zpg,  this._zpg,  null,      this._impl, this._imme, this._impl, null, this._abs,  this._abs,  this._abs,   null,
            this._rel,  this._indY, null,       null,      null,       this._zpgX, this._zpgX, null,      this._impl, this._absY, null,       null, null,       this._absX, this._absX,  null,
        ];

        this._INSTRUCTIONS = [
            this._brk, this._ora, this._nop, this._nop, this._nop, this._ora, this._aslm, this._nop, this._php, this._ora, this._asla, this._nop, this._nop, this._ora, this._aslm, this._nop,
            this._bpl, this._ora, this._nop, this._nop, this._nop, this._ora, this._aslm, this._nop, this._clc, this._ora, this._nop,  this._nop, this._nop, this._ora, this._aslm, this._nop,
            this._jsr, this._and, this._nop, this._nop, this._bit, this._and, this._rolm, this._nop, this._plp, this._and, this._rola, this._nop, this._bit, this._and, this._rolm, this._nop,
            this._bmi, this._and, this._nop, this._nop, this._nop, this._and, this._rolm, this._nop, this._sec, this._and, this._nop,  this._nop, this._nop, this._and, this._rolm, this._nop,
            this._rti, this._eor, this._nop, this._nop, this._nop, this._eor, this._lsrm, this._nop, this._pha, this._eor, this._lsra, this._nop, this._jmp, this._eor, this._lsrm, this._nop,
            this._bvc, this._eor, this._nop, this._nop, this._nop, this._eor, this._lsrm, this._nop, this._cli, this._eor, this._nop,  this._nop, this._nop, this._eor, this._lsrm, this._nop,
            this._rts, this._adc, this._nop, this._nop, this._nop, this._adc, this._rorm, this._nop, this._pla, this._adc, this._rora, this._nop, this._jmp, this._adc, this._rorm, this._nop,
            this._bvs, this._adc, this._nop, this._nop, this._nop, this._adc, this._rorm, this._nop, this._sei, this._adc, this._nop,  this._nop, this._nop, this._adc, this._rorm, this._nop,
            this._nop, this._sta, this._nop, this._nop, this._sty, this._sta, this._stx,  this._nop, this._dey, this._nop, this._txa,  this._nop, this._sty, this._sta, this._stx,  this._nop,
            this._bcc, this._sta, this._nop, this._nop, this._sty, this._sta, this._stx,  this._nop, this._tya, this._sta, this._txs,  this._nop, this._nop, this._sta, this._nop,  this._nop,
            this._ldy, this._lda, this._ldx, this._nop, this._ldy, this._lda, this._ldx,  this._nop, this._tay, this._lda, this._tax,  this._nop, this._ldy, this._lda, this._ldx,  this._nop,
            this._bcs, this._lda, this._nop, this._nop, this._ldy, this._lda, this._ldx,  this._nop, this._clv, this._lda, this._tsx,  this._nop, this._ldy, this._lda, this._ldx,  this._nop,
            this._cpy, this._cmp, this._nop, this._nop, this._cpy, this._cmp, this._dec,  this._nop, this._iny, this._cmp, this._dex,  this._nop, this._cpy, this._cmp, this._dec,  this._nop,
            this._bne, this._cmp, this._nop, this._nop, this._nop, this._cmp, this._dec,  this._nop, this._cld, this._cmp, this._nop,  this._nop, this._nop, this._cmp, this._dec,  this._nop,
            this._cpx, this._sbc, this._nop, this._nop, this._cpx, this._sbc, this._inc,  this._nop, this._inx, this._sbc, this._nop,  this._nop, this._cpx, this._sbc, this._inc,  this._nop,
            this._beq, this._sbc, this._nop, this._nop, this._nop, this._sbc, this._inc,  this._nop, this._sed, this._sbc, this._nop,  this._nop, this._nop, this._sbc, this._inc,  this._nop,
        ];
    }

    // Step through a single instruction in the CPU. Returns number of cycles the instruction used.
    step() {
        this._cycles = 0;

        const opcode = (() => {
            if (this._interrupts.length > 0) {
                this._interrupts = [];
                return 0x00;
            } else {
                const result = this._opcode();
                if (result === 0x00) {
                    throw new Error('Actual BRK');
                }
                return result;
            }
        })();

        const len = this._INSTRUCTION_LENGTH[opcode];
        if (len === 0) throw new Error(`Unsupported opcode: ${opcode.toString(16)} after ${this._totalCycles} cycles`);

        const instruction = this._INSTRUCTIONS[opcode];
        instruction.call(this);

        this._programCounter += this._INSTRUCTION_LENGTH[opcode];
        this._cycles += this._INSTRUCTION_CYCLES[opcode];
        this._totalCycles += this._cycles;

        return this._cycles;
    }

    toString() {
        const len = this._INSTRUCTION_LENGTH[this._opcode()];
        if (len === 0) throw new Error(`Unsupported opcode: ${this._opcode().toString(16)} after ${this._totalCycles} cycles`);
        const instructions = new Array(len); // Opcode and bytes the instruction uses.
        for (let i = 0; i < len; i++) {
            instructions.push(this._nes.read(this._programCounter + i));
        }

        // Convert all values to uppercase hex and pad as neccessary.
        const pc = this._programCounter.toString(16).toUpperCase().padStart(4, 0);
        const instruction = instructions.map((x) => {
            return x.toString(16).toUpperCase().padStart(2, 0);
        }).join(' ').trim().padEnd(9, ' ');
        const a = this._accumulator.toString(16).toUpperCase().padStart(2, 0);
        const x = this._xIndex.toString(16).toUpperCase().padStart(2, 0);
        const y = this._yIndex.toString(16).toUpperCase().padStart(2, 0);
        const p = this._status.toString(16).toUpperCase().padStart(2, 0);
        const sp = this._stackPointer.toString(16).toUpperCase().padStart(2, 0);

        const addrMode = (() => {
            if (this._ADDRESSING_MODES[this._opcode()]) return this._ADDRESSING_MODES[this._opcode()].name
            else return 'null';
        })();

        return (
            `${this._INSTRUCTIONS[this._opcode()].name} ` +
            `${addrMode.padEnd(5, ' ')} ` +
            `${pc}  ` +
            `${instruction} ` +
            `A:${a} ` +
            `X:${x} ` +
            `Y:${y} ` +
            `P:${p} ` +
            `SP:${sp} ` +
            `CYC:${this._totalCycles}`
        );
    }

    triggerInterrupt(interrupt) {
        this._interrupts.push(interrupt);
    }

    set _accumulator(v) { this.__A = uint8(v); }
    set _xIndex(v) { this.__X = uint8(v); }
    set _yIndex(v) { this.__Y = uint8(v); }
    set _status(v) { this.__P = uint8(v); }
    set _stackPointer(v) { this.__SP = uint8(v); }
    set _programCounter(v) { this.__PC = uint16(v); }

    get _accumulator() { return this.__A; }
    get _xIndex() { return this.__X; }
    get _yIndex() { return this.__Y; }
    get _status() { return this.__P; }
    get _stackPointer() { return this.__SP; }
    get _programCounter() { return this.__PC; }

    // Gets current opcode from memory.
    _opcode() {
        return this._nes.read(this._programCounter);
    }

    _isPageCross(initialPC, newPC) {
        return uint8(newPC) < uint8(initialPC);
    }

    // Absolute
    _abs() {
        const addressLow = this._nes.read(this._programCounter + 1);
        const addressHigh = this._nes.read(this._programCounter + 2) << 8;

        return addressHigh | addressLow;
    }

    // Absolute X
    _absX() {
        const initialAddress = this._abs();
        const result = initialAddress + this._xIndex;

        if (this._isPageCross(initialAddress, result)) this._cycles += this._PAGE_CROSS[this._opcode()];

        return uint16(result);
    }

    // Absolute Y
    _absY() {
        const initialAddress = this._abs();
        const result = initialAddress + this._yIndex;

        if (this._isPageCross(initialAddress, result)) this._cycles += this._PAGE_CROSS[this._opcode()];

        return uint16(result);
        // return uint16(this._abs() + this._yIndex);
    }

    // Immediate
    _imme() {
        return uint16(this._programCounter + 1);
    }

    // Implied
    _impl() {
        // If this function is called it is an error because implied addressing
        // modes do not need to get a value from memory.
        throw new Error('Implied was called');
    }

    // Indirect
    _ind() {
        // An original 6502 has does not correctly fetch the target address if the
        // indirect vector falls on a page boundary (e.g. $xxFF where xx is any value
        // from $00 to $FF). In this case fetches the LSB from $xxFF as expected but
        // takes the MSB from $xx00.
        const target = this._abs();

        const addressLow = this._nes.read(target);
        const addressHigh = this._nes.read(target & 0xff00 | uint8((target & 0x00ff) + 1)) << 8;

        return addressHigh | addressLow;
    }

    // Indirect X
    _indX() {
        const target = this._nes.read(this._programCounter + 1) + this._xIndex;

        const addressLow = this._nes.read(uint8(target));
        const addressHigh = this._nes.read(uint8(target + 1)) << 8;

        return addressHigh | addressLow;
    }

    // Indirect Y
    _indY() {
        const target = this._nes.read(this._programCounter + 1);

        const addressLow = this._nes.read(target);
        const addressHigh = this._nes.read(uint8(target + 1)) << 8;

        const result = uint16((addressHigh | addressLow) + this._yIndex);

        if (this._isPageCross(addressHigh | addressLow, result)) this._cycles += this._PAGE_CROSS[this._opcode()];

        return result;
    }

    // Relative
    _rel() {
        return uint16(this._programCounter + 1);
    }

    // Zeropage
    _zpg() {
        return this._nes.read(this._programCounter + 1);
    }

    // Zeropage X
    _zpgX() {
        return uint8(this._nes.read(this._programCounter + 1) + this._xIndex);
    }

    // Zeropage Y
    _zpgY() {
        return uint8(this._nes.read(this._programCounter + 1) + this._yIndex);
    }

    _memoryAddress() {
        return this._ADDRESSING_MODES[this._opcode()].call(this);
    }

    // Gets the value in memory address.
    _memoryValue() {
        return this._nes.read(this._memoryAddress());
    }


    /*****************************************************************************
     * Stack Functions
     *****************************************************************************/

    _stackPush(x) {
        this._nes.write(this._STACK_BASE | this._stackPointer, x);
        this._stackPointer--;
    }

    _stackPop() {
        this._stackPointer++;
        return this._nes.read(this._STACK_BASE | this._stackPointer);
    }

    /*****************************************************************************
     * Instructions
     *****************************************************************************/

    // Sets carry flag if bit 8 in x is set, otherwise resets it.
    _setOrResetCarry(x) {
        this._status = setOrReset(this._status, uint16(x >> 8), this._CARRY);
    }

    // Sets negative flag if bit 7 of x is set, otherwise resets it.
    _setOrResetNegative(x) {
        this._status = setOrReset(this._status, x, this._NEGATIVE);
    }

    // Sets overflow if bit 7 in arguments are different, otherwise resets it.
    _setOrResetOverflow(a, b, result) {
        // Determines if overflow occurred and moves the bit to the overflow flag position.
        const overflow = uint8(((a ^ result) & (b ^ result) & 0x80) >> 1);
        this._status = setOrReset(this._status, overflow, this._OVERFLOW);
    }

    // Sets zero flag if x is 0, otherwise resets it.
    _setOrResetZero(x) {
        this._status = setOrReset(this._status, x === 0 ? this._ZERO : 0, this._ZERO);
    }

    // LDA - Load Accumulator with Memory
    _lda() {
        this._accumulator = this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    // STA - Store Accumulator in Memory
    _sta() {
        const address = this._memoryAddress();
        this._nes.write(address, this._accumulator);
    }

    // ADC - Add Memory to Accumulator with Carry
    _adc() {
        const carry = this._status & this._CARRY;
        const m = this._memoryValue();

        const resultWithCarry = uint16(this._accumulator + m + carry);
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetOverflow(this._accumulator, m, result);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);

        this._accumulator = result;
    }

    // SBC - Subtract Memory from Accumulator with Borrow
    _sbc() {
        const carry = this._status & this._CARRY;
        const m = uint8(~this._memoryValue() + carry);

        const resultWithCarry = uint16(this._accumulator + m);
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetOverflow(this._accumulator, m, result);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);

        this._accumulator = result;
    }

    // AND - Memory with Accumulator
    _and() {
        this._accumulator &= this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    // ORA - "OR" Memory with Accumulator
    _ora() {
        this._accumulator |= this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    // EOR - "Exclusive OR" Memory with Accumulator
    _eor() {
        this._accumulator ^= this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    // SEC - Set Carry Flag
    _sec() {
        this._status |= this._CARRY;
    }

    // CLC - Clear Carry Flag
    _clc() {
        this._status &= ~this._CARRY;
    }

    // SEI - Set Interrupt Disable
    _sei() {
        this._status |= this._INTERRUPT_DISABLE;
    }

    // CLI - Clear Interrupt Disable
    _cli() {
        this._status &= ~this._INTERRUPT_DISABLE;
    }

    // SED - Set Decimal Mode
    _sed() {
        this._status |= this._DECIMAL;
    }

    // CLD - Clear Decimal Mode
    _cld() {
        this._status &= ~this._DECIMAL;
    }

    // CLV - Clear Overflow Flag
    _clv() {
        this._status &= ~this._OVERFLOW;
    }

    // RTI - Return from Interrupt
    _rti() {
        this._status = (this._stackPop() & 0xef) | this._EXPANSION;
        // this._status = this._stackPop();
        const pcl = uint16(this._stackPop());
        const pch = uint16(this._stackPop() << 8);
        // - 1 so program counter will be at correct location after adding instruction length.
        this._programCounter = (pch | pcl) - 1;
    }

    // JMP - Jump to New Location
    _jmp() {
        // - 3 so program counter will be at correct location after adding instruction length.
        this._programCounter = this._memoryAddress() - 3;
    }

    // NMI - Non-Maskable Interrupt
    _nmi() {
        const pch = (this._programCounter + 2) >> 8;
        const pcl = this._programCounter + 2;
        this._stackPush(pch);
        this._stackPush(pcl);
        this._stackPush(this._status | 0x30);
        // this._stackPush(this._status & ~this._BREAK);
        this._sei();
        const addressHigh = this._nes.read(0xfffb) << 8;
        const addressLow = this._nes.read(0xfffa);
        this._programCounter = addressHigh | addressLow;
    }

    // BRK - Break Command
    _brk() {
        const pch = (this._programCounter) >> 8;
        const pcl = this._programCounter;
        this._stackPush(pch);
        this._stackPush(pcl);
        this._stackPush(this._status | 0x30);
        this._sei();
        const addressHigh = this._nes.read(0xfffb) << 8;
        const addressLow = this._nes.read(0xfffa);
        // const addressHigh = this._nes.read(0xffff) << 8;
        // const addressLow = this._nes.read(0xfffe);
        this._programCounter = (addressHigh | addressLow) - 1;
    }

    // Converts a 'negative' uint8 to an equivalent uint16. This value is then able
    // to be added to another uint16 and produce the correct results.
    _offset(aByte) {
        return aByte & this._NEGATIVE ? aByte | 0xff00 : aByte;
    }

    // Checks if branch instruction crossed page boundry. initialPC is the program counter of
    // the opcode of the branch instruction. newPC is the program counter of the instruction
    // after the offset has been added to it.
    _isBranchPageCross(initialPC, newPC) {
        // +2 because all branches have instruction length of 2 and program counter is the address
        // of the current opcode.
        return this._isPageCross(initialPC + 2, newPC);
    }

    // Branch taken code. Identical for all branches.
    _branchTaken() {
        this._cycles++;
        const offset = this._offset(this._memoryValue());
        const newPC = this._programCounter + offset;
        if (this._isBranchPageCross(this._programCounter, newPC)) {
            this._cycles += this._PAGE_CROSS[this._opcode()];
        }
        this._programCounter = newPC;
    }

    // BMI - Branch on Result Minus
    _bmi() {
        if (this._status & this._NEGATIVE) this._branchTaken();
    }

    // BPL - Branch on Result Plus
    _bpl() {
        if (!(this._status & this._NEGATIVE)) this._branchTaken();
    }

    // BCC - Branch on Carry Clear
    _bcc() {
        if (!(this._status & this._CARRY)) this._branchTaken();
    }

    // BCS - Branch on Carry Set
    _bcs() {
        if (this._status & this._CARRY) this._branchTaken();
    }

    // BEQ - Branch on Result Zero
    _beq() {
        if (this._status & this._ZERO) this._branchTaken();
    }

    // BNE - Branch on Result Not Zero
    _bne() {
        if (!(this._status & this._ZERO)) this._branchTaken();
    }

    // BVS - Branch on Overflow Set
    _bvs() {
        if (this._status & this._OVERFLOW) this._branchTaken();
    }

    // BVC - Branch on Overflow Clear
    _bvc() {
        if (!(this._status & this._OVERFLOW)) this._branchTaken();
    }

    // CMP - Compare Memory and Accumulator
    _cmp() {
        const resultWithCarry = uint16(this._accumulator - this._memoryValue() ^ (1 << 8));
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    // BIT - Test Bits in Memory with Accumulator
    _bit() {
        const value = this._memoryValue();
        const result = this._accumulator & value;

        this._status = setOrReset(this._status, value, this._OVERFLOW);
        this._status = setOrReset(this._status, value, this._NEGATIVE);
        this._setOrResetZero(result);
    }

    // LDX - Load Index Register X from Memory
    _ldx() {
        this._xIndex = this._memoryValue();
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    // LDY - Load Index Register Y from Memory
    _ldy() {
        this._yIndex = this._memoryValue();
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    // STX - Store Index Register X in Memory
    _stx() {
        this._nes.write(this._memoryAddress(), this._xIndex);
    }

    // STY - Store Index Register Y in Memory
    _sty() {
        this._nes.write(this._memoryAddress(), this._yIndex);
    }

    // INX - Increment Index Register X by one
    _inx() {
        this._xIndex++;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    // INY - Increment Index Register Y by one
    _iny() {
        this._yIndex++;
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    // DEX - Decrement Index Register X by one
    _dex() {
        this._xIndex--;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    // DEY - Decrement Index Register Y by one
    _dey() {
        this._yIndex--;
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    // CPX - Compare Index Register X to Memory
    _cpx() {
        const resultWithCarry = uint16(this._xIndex - this._memoryValue() ^ (1 << 8));
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    // CPY - Compare Index Register Y to Memory
    _cpy() {
        const resultWithCarry = uint16(this._yIndex - this._memoryValue() ^ (1 << 8));
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    // TAX - Transfer Accumulator to Index X
    _tax() {
        this._xIndex = this._accumulator;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    // TXA - Transfer Index X to Accumulator
    _txa() {
        this._accumulator = this._xIndex;
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    // TAY - Transfer Accumulator to Index Y
    _tay() {
        this._yIndex = this._accumulator;
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    // TYA - Transfer Index Y to Accumulator
    _tya() {
        this._accumulator = this._yIndex;
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    // JSR - Jump to Subroutine
    _jsr() {
        const pch = uint8((this._programCounter + 2) >> 8);
        const pcl = uint8(this._programCounter + 2);
        this._stackPush(pch);
        this._stackPush(pcl);
        // - 3 so program counter will be at correct location after adding instruction length.
        this._programCounter = this._memoryAddress() - 3;
    }

    // RTS - Return from Subroutine
    _rts() {
        const pcl = uint16(this._stackPop());
        const pch = uint16(this._stackPop() << 8);
        this._programCounter = pch | pcl;
    }

    // PHA - Push Accumulator on Stack
    _pha() {
        this._stackPush(this._accumulator);
    }

    // PLA - Pull Accumulator from Stack
    _pla() {
        this._accumulator = this._stackPop();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    // TXS - Transfer Index X to Stack Pointer
    _txs() {
        this._print = false;
        this._stackPointer = this._xIndex;
    }

    // TSX - Transfer Stack Pointer to Index
    _tsx() {
        this._xIndex = this._stackPointer;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    // PHP - Push Processor Status on Stack
    _php() {
        this._stackPush(this._status | 0x30);
    }

    // PLP - Pull Processor Status from Stack
    _plp() {
        this._status = (this._stackPop() & 0xef) | this._EXPANSION;
    }

    // LSR - Logical Shift Right
    _lsr(value) {
        const result = value >> 1;
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value, this._CARRY);
        return result;
    }

    // ROL with result being the accumulator.
    _lsra() {
        this._accumulator = this._lsr(this._accumulator);
    }

    // ROL with result being memory value.
    _lsrm() {
        const v = this._memoryValue();
        this._nes.write(this._memoryAddress(), this._lsr(v));
    }

    // ASL - Arithmetic Shift Left
    _asl(value) {
        const result = uint8(value << 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value >> 7, this._CARRY);
        return result;
    }

    // ASL with result being the accumulator.
    _asla() {
        this._accumulator = this._asl(this._accumulator);
    }

    // ASL with result being memory value.
    _aslm() {
        const v = this._memoryValue();
        this._nes.write(this._memoryAddress(), this._asl(v));
    }

    // ROL - Rotate Left
    _rol(value) {
        const result = setOrReset(value << 1, this._status, this._CARRY);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value >> 7, this._CARRY);
        return result;
    }

    // ROL with result being the accumulator.
    _rola() {
        this._accumulator = this._rol(this._accumulator);
    }

    // ROL with result being memory value.
    _rolm() {
        const v = this._memoryValue();
        this._nes.write(this._memoryAddress(), this._rol(v));
    }

    // ROR - Rotate Right
    _ror(value) {
        const result = setOrReset(value >> 1, this._status << 7, 1 << 7);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value, this._CARRY);
        return result;
    }

    // ROR with result being the accumulator.
    _rora() {
        this._accumulator = this._ror(this._accumulator);
    }

    // ROR with result being memory value.
    _rorm() {
        const v = this._memoryValue();
        this._nes.write(this._memoryAddress(), this._ror(v));
    }

    // INC- Increment Memory by One
    _inc() {
        const result = uint8(this._memoryValue() + 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._nes.write(this._memoryAddress(), result);
    }

    // DEC - Decrement Memory by One
    _dec() {
        const result = uint8(this._memoryValue() - 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._nes.write(this._memoryAddress(), result);
    }

    // NOP - No Operation
    _nop() { }
}
