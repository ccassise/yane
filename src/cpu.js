/* cpu.js
 *
 * Logic for 6502 emulation
 * 
 */
'use strict';

import {uint8, uint16, setOrReset} from './utils.js';

export class CPU {
    set accumulator(v)    { this.#accumulator     = uint8(v); }
    set xIndex(v)         { this.#xIndex          = uint8(v); }
    set yIndex(v)         { this.#yIndex          = uint8(v); }
    set status(v)         { this.#status          = uint8(v); }
    set stackPointer(v)   { this.#stackPointer    = uint8(v); }
    set programCounter(v) { this.#programCounter  = uint16(v); }

    get accumulator()    { return this.#accumulator; }
    get xIndex()         { return this.#xIndex; }
    get yIndex()         { return this.#yIndex; }
    get status()         { return this.#status; }
    get stackPointer()   { return this.#stackPointer; }
    get programCounter() { return this.#programCounter; }

    constructor(memory) {
        this.accumulator  = 0x00;
        this.xIndex       = 0x00;
        this.yIndex       = 0x00;
        this.status       = 0x24;
        this.stackPointer = 0xfd;
        this.#clock       = 0;
        this.#memory      = memory;

        const start_pcl = uint16(this.#memory.read(0xfffc));
        const start_pch = uint16(this.#memory.read(0xfffd) << 8);
        this.programCounter = start_pch | start_pcl;

        // TODO: Remove - only used for nestest.nes
        console.log('pc', this.#programCounter.toString(16));
        this.#programCounter = 0xc000;
    }

    step() {
        const opcode = this._fetch();
        const instruction = this.#INSTRUCTIONS[opcode];
        instruction.call(this);

        if (CPU.#INSTRUCTION_CYCLES[opcode] === null) {
            throw new Error(`Unsupported opcode: ${opcode} after ${this.#clock} steps`);
        }

        this.programCounter += CPU.#INSTRUCTION_LENGTH[opcode];
        this.#clock += CPU.#INSTRUCTION_CYCLES[opcode];
    }

    toString() {
        const len = CPU.#INSTRUCTION_LENGTH[this._fetch()];
        if (len === null) throw new Error(`Unsupported opcode: ${this._fetch()} after ${this.#clock} steps`);
        const instructions = new Array(len);
        for (let i = 0; i < len; i++) {
            instructions.push(this.#memory.read(this.programCounter + i));
        }

        // Convert all values to uppercase hex and pad as neccessary.
        const pc = this.programCounter.toString(16).toUpperCase().padStart(4, 0);
        const instruction = instructions.map((x) => {
            return x.toString(16).toUpperCase().padStart(2, 0);
        }).join(' ').trim().padEnd(9, ' ');
        const a = this.accumulator.toString(16).toUpperCase().padStart(2, 0);
        const x = this.xIndex.toString(16).toUpperCase().padStart(2, 0);
        const y = this.yIndex.toString(16).toUpperCase().padStart(2, 0);
        const p = this.status.toString(16).toUpperCase().padStart(2, 0);
        const sp = this.stackPointer.toString(16).toUpperCase().padStart(2, 0);

        return (
            `${pc}  ` +
            `${instruction} ` +
            `A:${a} ` +
            `X:${x} ` +
            `Y:${y} ` +
            `P:${p} ` +
            `SP:${sp}`
        );
    }

    /// CPU registers.
    #accumulator;
    #xIndex;
    #yIndex;
    #status;
    #stackPointer;
    #programCounter;

    #clock;  // Internal clock.
    #memory;

    /// CPU status flags.
    static #CARRY               = 1 << 0;
    static #ZERO                = 1 << 1;
    static #INTERRUPT_DISABLE   = 1 << 2;
    static #DECIMAL             = 1 << 3;
    static #BREAK               = 1 << 4;
    static #EXPANSION           = 1 << 5;
    static #OVERFLOW            = 1 << 6;
    static #NEGATIVE            = 1 << 7;

    /// Number of bytes each instruction uses.
    static #INSTRUCTION_LENGTH = [
        1,    2, null, null, null, 2, 2, null, 1, 2,    1,    null, null, 3, 3,    null,
        2,    2, null, null, null, 2, 2, null, 1, 3,    null, null, null, 3, 3,    null,
        3,    2, null, null, 2,    2, 2, null, 1, 2,    1,    null, 3,    3, 3,    null,
        2,    2, null, null, null, 2, 2, null, 1, 3,    null, null, null, 3, 3,    null,
        1,    2, null, null, null, 2, 2, null, 1, 2,    1,    null, 3,    3, 3,    null,
        2,    2, null, null, null, 2, 2, null, 1, 3,    null, null, null, 3, 3,    null,
        1,    2, null, null, null, 2, 2, null, 1, 2,    1,    null, 3,    3, 3,    null,
        2,    2, null, null, null, 2, 2, null, 1, 3,    null, null, null, 3, 3,    null,
        null, 2, null, null, 2,    2, 2, null, 1, null, 1,    null, 3,    3, 3,    null,
        2,    2, null, null, 2,    2, 2, null, 1, 3,    1,    null, null, 3, null, null,
        2,    2, 2,    null, 2,    2, 2, null, 1, 2,    1,    null, 3,    3, 3,    null,
        2,    2, null, null, 2,    2, 2, null, 1, 3,    1,    null, 3,    3, 3,    null,
        2,    2, null, null, 2,    2, 2, null, 1, 2,    1,    null, 3,    3, 3,    null,
        2,    2, null, null, null, 2, 2, null, 1, 3,    null, null, null, 3, 3,    null,
        2,    2, null, null, 2,    2, 2, null, 1, 2,    1,    null, 3,    3, 3,    null,
        2,    2, null, null, null, 2, 2, null, 1, 3,    null, null, null, 3, 3,    null,
    ];

    /// Number of cycles each instruction uses. Does not include page crosses.
    static #INSTRUCTION_CYCLES = [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ];

    #ADDRESSING_MODES = [
        this._impl,  this._indX, null,       null, null,       this._zpg,  this._zpg,  null, this._impl, this._imme, null, /*A*/ null, null,       this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, null,       this._zpgX, this._zpgX, null, this._impl, this._absY, null,       null, null,       this._absX, this._absX, null,
        this._abs,   this._indX, null,       null, this._zpg,  this._zpg,  this._zpg,  null, this._impl, this._imme, null, /*A*/ null, this._abs,  this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, null,       this._zpgX, this._zpgX, null, this._impl, this._absY, null,       null, null,       this._absX, this._absX, null,
        this._impl,  this._indX, null,       null, null,       this._zpg,  this._zpg,  null, this._impl, this._imme, null, /*A*/ null, this._abs,  this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, null,       this._zpgX, this._zpgX, null, this._impl, this._absY, null,       null, null,       this._absX, this._absX, null,
        this._impl,  this._indX, null,       null, null,       this._zpg,  this._zpg,  null, this._impl, this._imme, null, /*A*/ null, this._ind,  this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, null,       this._zpgX, this._zpgX, null, this._impl, this._absY, null,       null, null,       this._absX, this._absX, null,
        null,        this._indX, null,       null, this._zpg,  this._zpg,  this._zpg,  null, this._impl, null,       this._impl, null, this._abs,  this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, this._zpgX, this._zpgX, this._zpgY, null, this._impl, this._absY, this._impl, null, null,       this._absX, null,       null,
        this._imme,  this._indX, this._imme, null, this._zpg,  this._zpg,  this._zpg,  null, this._impl, this._imme, this._impl, null, this._abs,  this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, this._zpgX, this._zpgX, this._zpgY, null, this._impl, this._absY, this._impl, null, this._absX, this._absX, this._absY, null,
        this._imme,  this._indX, null,       null, this._zpg,  this._zpg,  this._zpg,  null, this._impl, this._imme, this._impl, null, this._abs,  this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, null,       this._zpgX, this._zpgX, null, this._impl, this._absY, null,       null, null,       this._absX, this._absX, null,
        this._imme,  this._indX, null,       null, this._zpg,  this._zpg,  this._zpg,  null, this._impl, this._imme, this._impl, null, this._abs,  this._abs,  this._abs,  null,
        this._rel,   this._indY, null,       null, null,       this._zpgX, this._zpgX, null, this._impl, this._absY, null,       null, null,       this._absX, this._absX, null,
    ];

    #INSTRUCTIONS = [
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

    /// Gets current opcode from memory.
    _fetch() {
        return this.#memory.read(this.programCounter);
    }

    /// Absolute
    _abs() {
        const addressLow = this.#memory.read(this.programCounter + 1);
        const addressHigh = this.#memory.read(this.programCounter + 2) << 8;

        return addressHigh | addressLow;
    }

    /// Absolute X
    _absX() {
        return uint16(this._abs() + this.xIndex);
    }

    /// Absolute Y
    _absY() {
        return uint16(this._abs() + this.yIndex);
    }

    /// Immediate
    _imme() {
        return uint16(this.programCounter + 1);
    }

    /// Implied
    _impl() {
        // If this function is called it is an error because implied addressing
        // modes do not need to get a value from memory.
        throw new Error('Implied was called');
    }

    /// Indirect
    _ind() {
        // An original 6502 has does not correctly fetch the target address if the
        // indirect vector falls on a page boundary (e.g. $xxFF where xx is any value
        // from $00 to $FF). In this case fetches the LSB from $xxFF as expected but
        // takes the MSB from $xx00.
        const target = this._abs();

        const addressLow = this.#memory.read(target);
        const addressHigh = this.#memory.read(target & 0xff00 | uint8((target & 0x00ff) + 1)) << 8;

        return addressHigh | addressLow;
    }

    /// Indirect X
    _indX() {
        const target = this.#memory.read(this.programCounter + 1) + this.xIndex;

        const addressLow = this.#memory.read(uint8(target));
        const addressHigh = this.#memory.read(uint8(target + 1)) << 8;

        return addressHigh | addressLow;
    }

    /// Indirect Y
    _indY() {
        const target = this.#memory.read(this.programCounter + 1);

        const addressLow = this.#memory.read(target);
        const addressHigh = this.#memory.read(uint8(target + 1)) << 8;

        return uint16((addressHigh | addressLow) + this.yIndex);
    }

    /// Relative
    _rel() {
        return uint16(this.programCounter + 1);
    }

    /// Zeropage
    _zpg() {
        return this.#memory.read(this.programCounter + 1);
    }

    /// Zeropage X
    _zpgX() {
        return uint8(this.#memory.read(this.programCounter + 1) + this.xIndex);
    }

    /// Zeropage Y
    _zpgY() {
        return uint8(this.#memory.read(this.programCounter + 1) + this.yIndex);
    }

    _memoryAddress() {
        const opcode = this._fetch();
        const addressingFn = this.#ADDRESSING_MODES[opcode];
        if (addressingFn === null) {
            console.error('Unsuported opcode', opcode);
        } else {
            return addressingFn.call(this);
        }
    }

    /// Gets the value in memory address.
    _memoryValue() {
        const address = this._memoryAddress();
        return this.#memory.read(address);
    }


    /*****************************************************************************
     * Stack Functions
     *****************************************************************************/
    static #STACK_BASE = 0x0100;

    _stackPush(x) {
        this.#memory.write(CPU.#STACK_BASE | this.stackPointer, x);
        this.stackPointer--;
    }

    _stackPop() {
        this.stackPointer++;
        return this.#memory.read(CPU.#STACK_BASE | this.stackPointer);
    }

    /*****************************************************************************
     * Instructions
     *****************************************************************************/

    /// Sets carry flag if bit 8 in x is set, otherwise resets it.
    _setOrResetCarry(x) {
        this.status = setOrReset(this.status, uint16(x >> 8), CPU.#CARRY);
    }

    /// Sets negative flag if bit 7 of x is set, otherwise resets it.
    _setOrResetNegative(x) {
        this.status = setOrReset(this.status, uint8(x), CPU.#NEGATIVE);
    }

    /// Sets overflow if bit 7 in arguments are different, otherwise resets it.
    _setOrResetOverflow(a, b, result) {
        // Determines if overflow occurred and moves the bit to the overflow flag position.
        const overflow = uint8(((a ^ result) & (b ^ result) & 0x80) >> 1);
        this.status = setOrReset(this.status, overflow, CPU.#OVERFLOW);
    }

    /// Sets zero flag if x is 0, otherwise resets it.
    _setOrResetZero(x) {
        const zero = x === 0 ? CPU.#ZERO : 0;
        this.status = setOrReset(this.status, zero, CPU.#ZERO);
    }

    /// LDA - Load Accumulator with Memory
    _lda() {
        this.accumulator = this._memoryValue();
        this._setOrResetNegative(this.accumulator);
        this._setOrResetZero(this.accumulator);
    }

    /// STA - Store Accumulator in Memory
    _sta() {
        const address = this._memoryAddress();
        this.#memory.write(address, this.accumulator);
    }

    /// ADC - Add Memory to Accumulator with Carry
    _adc() {
        const carry = this.status & CPU.#CARRY;
        const m = this._memoryValue();

        const resultWithCarry = uint16(this.accumulator + m + carry);
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetOverflow(this.accumulator, m, result);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);

        this.accumulator = result;
    }

    /// SBC - Subtract Memory from Accumulator with Borrow
    _sbc() {
        const carry = this.status & CPU.#CARRY;
        const m = uint8(~this._memoryValue() + carry);

        const resultWithCarry = uint16(this.accumulator + m);
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetOverflow(this.accumulator, m, result);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);

        this.accumulator = result;
    }

    /// AND - Memory with Accumulator
    _and() {
        this.accumulator &= this._memoryValue();
        this._setOrResetNegative(this.accumulator);
        this._setOrResetZero(this.accumulator);
    }

    /// ORA - "OR" Memory with Accumulator
    _ora() {
        this.accumulator |= this._memoryValue();
        this._setOrResetNegative(this.accumulator);
        this._setOrResetZero(this.accumulator);
    }

    /// EOR - "Exclusive OR" Memory with Accumulator
    _eor() {
        this.accumulator ^= this._memoryValue();
        this._setOrResetNegative(this.accumulator);
        this._setOrResetZero(this.accumulator);
    }

    /// SEC - Set Carry Flag
    _sec() {
        this.status |= CPU.#CARRY;
    }

    /// CLC - Clear Carry Flag
    _clc() {
        this.status &= ~CPU.#CARRY;
    }

    /// SEI - Set Interrupt Disable
    _sei() {
        this.status |= CPU.#INTERRUPT_DISABLE;
    }

    /// CLI - Clear Interrupt Disable
    _cli() {
        this.status &= ~CPU.#INTERRUPT_DISABLE;
    }

    /// SED - Set Decimal Mode
    _sed() {
        this.status |= CPU.#DECIMAL;
    }

    /// CLD - Clear Decimal Mode
    _cld() {
        this.status &= ~CPU.#DECIMAL;
    }

    /// CLV - Clear Overflow Flag
    _clv() {
        this.status &= ~CPU.#OVERFLOW;
    }

    /// RTI - Return from Interrupt
    _rti() {
        this.status = (this._stackPop() & 0xef) | CPU.#EXPANSION;
        const pcl = uint16(this._stackPop());
        const pch = uint16(this._stackPop() << 8);
        // - 1 so program counter will be at correct location after adding instruction length.
        this.programCounter = (pch | pcl) - 1;
    }

    /// JMP - Jump to New Location
    _jmp() {
        // - 3 so program counter will be at correct location after adding instruction length.
        this.programCounter = this._memoryAddress() - 3;
    }

    /// NMI - Non-Maskable Interrupt
    _nmi() {
        const pch = (this.programCounter + 2) >> 8;
        const pcl = this.programCounter + 2;
        this._stackPush(pch);
        this._stackPush(pcl);
        this._stackPush(this.status);
        this.programCounter = 0xfffb | 0xfffa;
    }

    /// BRK - Break Command
    _brk() {
        const pch = (this.programCounter + 2) >> 8;
        const pcl = this.programCounter + 2;
        this._stackPush(pch);
        this._stackPush(pcl);
        this._stackPush(this.status | 0x30);
        this._sei();
        this.programCounter = 0xffff | 0xfffe;
    }

    /// Takes a uint8 as argument and if its 7th bit is set, will return a uint16
    /// with 1s as padding instead of 0s. This ensures that the offset can be
    /// added with another uint16 and produce the correct results.
    _getOffset() {
        const x = this._memoryValue();
        const result = uint16(x & CPU.#NEGATIVE ? x | 0xff00 : x);
        return result;
    }

    /// BMI - Branch on Result Minus
    _bmi() {
        if (this.status & CPU.#NEGATIVE) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// BPL - Branch on Result Plus
    _bpl() {
        if (!(this.status & CPU.#NEGATIVE)) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// BCC - Branch on Carry Clear
    _bcc() {
        if (!(this.status & CPU.#CARRY)) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// BCS - Branch on Carry Set
    _bcs() {
        if (this.status & CPU.#CARRY) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// BEQ - Branch on Result Zero
    _beq() {
        if (this.status & CPU.#ZERO) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// BNE - Branch on Result Not Zero
    _bne() {
        if (!(this.status & CPU.#ZERO)) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// BVS - Branch on Overflow Set
    _bvs() {
        if (this.status & CPU.#OVERFLOW) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// BVC - Branch on Overflow Clear
    _bvc() {
        if (!(this.status & CPU.#OVERFLOW)) {
            const offset = this._getOffset();
            this.programCounter = this.programCounter + offset;
        }
    }

    /// CMP - Compare Memory and Accumulator
    _cmp() {
        const result_with_carry = uint16(this.accumulator - this._memoryValue() ^ (1 << 8));
        const result = uint8(result_with_carry);

        this._setOrResetCarry(result_with_carry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    /// BIT - Test Bits in Memory with Accumulator
    _bit() {
        const value = this._memoryValue();
        const result = this.accumulator & value;

        this.status = setOrReset(this.status, value, CPU.#OVERFLOW);
        this.status = setOrReset(this.status, value, CPU.#NEGATIVE);
        this._setOrResetZero(result);
    }

    /// LDX - Load Index Register X from Memory
    _ldx() {
        this.xIndex = this._memoryValue();
        this._setOrResetNegative(this.xIndex);
        this._setOrResetZero(this.xIndex);
    }

    /// LDY - Load Index Register Y from Memory
    _ldy() {
        this.yIndex = this._memoryValue();
        this._setOrResetNegative(this.yIndex);
        this._setOrResetZero(this.yIndex);
    }

    /// STX - Store Index Register X in Memory
    _stx() {
        this.#memory.write(this._memoryAddress(), this.xIndex);
    }

    /// STY - Store Index Register Y in Memory
    _sty() {
        this.#memory.write(this._memoryAddress(), this.yIndex);
    }

    /// INX - Increment Index Register X by one
    _inx() {
        this.xIndex++;
        this._setOrResetNegative(this.xIndex);
        this._setOrResetZero(this.xIndex);
    }

    /// INY - Increment Index Register Y by one
    _iny() {
        this.yIndex++;
        this._setOrResetNegative(this.yIndex);
        this._setOrResetZero(this.yIndex);
    }

    /// DEX - Decrement Index Register X by one
    _dex() {
        this.xIndex--;
        this._setOrResetNegative(this.xIndex);
        this._setOrResetZero(this.xIndex);
    }

    /// DEY - Decrement Index Register Y by one
    _dey() {
        this.yIndex--;
        this._setOrResetNegative(this.yIndex);
        this._setOrResetZero(this.yIndex);
    }

    /// CPX - Compare Index Register X to Memory
    _cpx() {
        const result_with_carry = uint16(this.xIndex - this._memoryValue() ^ (1 << 8));
        const result = uint8(result_with_carry);

        this._setOrResetCarry(result_with_carry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    /// CPY - Compare Index Register Y to Memory
    _cpy() {
        const result_with_carry = uint16(this.yIndex - this._memoryValue() ^ (1 << 8));
        const result = uint8(result_with_carry);

        this._setOrResetCarry(result_with_carry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    /// TAX - Transfer Accumulator to Index X
    _tax() {
        this.xIndex = this.accumulator;
        this._setOrResetNegative(this.xIndex);
        this._setOrResetZero(this.xIndex);
    }

    /// TXA - Transfer Index X to Accumulator
    _txa() {
        this.accumulator = this.xIndex;
        this._setOrResetNegative(this.accumulator);
        this._setOrResetZero(this.accumulator);
    }

    /// TAY - Transfer Accumulator to Index Y
    _tay() {
        this.yIndex = this.accumulator;
        this._setOrResetNegative(this.yIndex);
        this._setOrResetZero(this.yIndex);
    }

    /// TYA - Transfer Index Y to Accumulator
    _tya() {
        this.accumulator = this.yIndex;
        this._setOrResetNegative(this.accumulator);
        this._setOrResetZero(this.accumulator);
    }

    /// JSR - Jump to Subroutine
    _jsr() {
        const pch = uint8((this.programCounter + 2) >> 8);
        const pcl = uint8(this.programCounter + 2);
        this._stackPush(pch);
        this._stackPush(pcl);
        // - 3 so program counter will be at correct location after adding instruction length.
        this.programCounter = this._memoryAddress() - 3;
    }

    /// RTS - Return from Subroutine
    _rts() {
        const pcl = uint16(this._stackPop());
        const pch = uint16(this._stackPop() << 8);
        this.programCounter = pch | pcl;
    }

    /// PHA - Push Accumulator on Stack
    _pha() {
        this._stackPush(this.accumulator);
    }

    /// PLA - Pull Accumulator from Stack
    _pla() {
        this.accumulator = this._stackPop();
        this._setOrResetNegative(this.accumulator);
        this._setOrResetZero(this.accumulator);
    }

    /// TXS - Transfer Index X to Stack Pointer
    _txs() {
        this.stackPointer = this.xIndex;
    }

    /// TSX - Transfer Stack Pointer to Index
    _tsx() {
        this.xIndex = this.stackPointer;
        this._setOrResetNegative(this.xIndex);
        this._setOrResetZero(this.xIndex);
    }

    /// PHP - Push Processor Status on Stack
    _php() {
        this._stackPush(this.status | 0x30);
    }

    /// PLP - Pull Processor Status from Stack
    _plp() {
        this.status = (this._stackPop() & 0xef) | CPU.#EXPANSION;
    }

    /// LSR - Logical Shift Right
    _lsr(value) {
        const result = value >> 1;
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this.status = setOrReset(this.status, value, CPU.#CARRY);
        return result;
    }

    /// ROL with result being the accumulator.
    _lsra() {
        this.accumulator = this._lsr(this.accumulator);
    }

    /// ROL with result being memory value.
    _lsrm() {
        const v = this._memoryValue();
        this.#memory.write(this._memoryAddress(), this._lsr(v));
    }

    /// ASL - Arithmetic Shift Left
    _asl(value) {
        const result = uint8(value << 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this.status = setOrReset(this.status, value >> 7, CPU.#CARRY);
        return result;
    }

    /// ASL with result being the accumulator.
    _asla() {
        this.accumulator = this._asl(this.accumulator);
    }

    /// ASL with result being memory value.
    _aslm() {
        const v = this._memoryValue();
        this.#memory.write(this._memoryAddress(), this._asl(v));
    }

    /// ROL - Rotate Left
    _rol(value) {
        const result = setOrReset(value << 1, this.status, CPU.#CARRY);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this.status = setOrReset(this.status, value >> 7, CPU.#CARRY);
        return result;
    }

    /// ROL with result being the accumulator.
    _rola() {
        this.accumulator = this._rol(this.accumulator);
    }

    /// ROL with result being memory value.
    _rolm() {
        const v = this._memoryValue();
        this.#memory.write(this._memoryAddress(), this._rol(v));
    }

    /// ROR - Rotate Right
    _ror(value) {
        const result = setOrReset(value >> 1, this.status << 7, 1 << 7);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this.status = setOrReset(this.status, value, CPU.#CARRY);
        return result;
    }

    /// ROR with result being the accumulator.
    _rora() {
        this.accumulator = this._ror(this.accumulator);
    }

    /// ROR with result being memory value.
    _rorm() {
        const v = this._memoryValue();
        this.#memory.write(this._memoryAddress(), this._ror(v));
    }

    /// INC- Increment Memory by One
    _inc() {
        const result = uint8(this._memoryValue() + 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this.#memory.write(this._memoryAddress(), result);
    }

    /// DEC - Decrement Memory by One
    _dec() {
        const result = uint8(this._memoryValue() - 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this.#memory.write(this._memoryAddress(), result);
    }

    /// NOP - No Operation
    _nop() { }
}
