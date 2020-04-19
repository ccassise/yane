/* cpu.js
 *
 * Logic for 6502 emulation
 * 
 * @dependencies
 *      utils.js
 *      memory.js
 */
'use strict';

class CPU {
    constructor(memory) {
        // CPU Registers.
        this._accumulator  = 0x00;
        this._xIndex       = 0x00;
        this._yIndex       = 0x00;
        this._status       = 0x24;
        this._stackPointer = 0xfd;

        this._clock       = 0;
        this._memory      = memory;

        const startPCL = uint16(this._memory.read(0xfffc));
        const startPCH = uint16(this._memory.read(0xfffd) << 8);
        this._programCounter = startPCH | startPCL;

        // TODO: Remove - only used for nestest.nes
        console.log('pc', this._programCounter.toString(16));
        this._programCounter = 0xc000;
    }

    step() {
        const opcode = this._fetch();
        const instruction = this._instructions[opcode];
        instruction.call(this);

        if (CPU._INSTRUCTION_CYCLES[opcode] === null) {
            throw new Error(`Unsupported opcode: ${opcode} after ${this._clock} steps`);
        }

        this._programCounter += CPU._INSTRUCTION_LENGTH[opcode];
        this._clock += CPU._INSTRUCTION_CYCLES[opcode];
    }

    toString() {
        const len = CPU._INSTRUCTION_LENGTH[this._fetch()];
        if (len === null) throw new Error(`Unsupported opcode: ${this._fetch()} after ${this._clock} steps`);
        const instructions = new Array(len); // Opcode and bytes the instruction uses.
        for (let i = 0; i < len; i++) {
            instructions.push(this._memory.read(this._programCounter + i));
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

    /// CPU status flags.
    static get _CARRY()             { return 1 << 0; }
    static get _ZERO()              { return 1 << 1; }
    static get _INTERRUPT_DISABLE() { return 1 << 2; }
    static get _DECIMAL()           { return 1 << 3; }
    static get _BREAK()             { return 1 << 4; }
    static get _EXPANSION()         { return 1 << 5; }
    static get _OVERFLOW()          { return 1 << 6; }
    static get _NEGATIVE()          { return 1 << 7; }

    /// Number of bytes each instruction uses.
    static get _INSTRUCTION_LENGTH() { 
        return [
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
    }

    /// Number of cycles each instruction uses. Does not include page crosses.
    static get _INSTRUCTION_CYCLES() {
        return [
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
    }

    set _accumulator(v)    { this._A  = uint8(v); }
    set _xIndex(v)         { this._X  = uint8(v); }
    set _yIndex(v)         { this._Y  = uint8(v); }
    set _status(v)         { this._P  = uint8(v); }
    set _stackPointer(v)   { this._SP = uint8(v); }
    set _programCounter(v) { this._PC = uint16(v); }

    get _accumulator()    { return this._A; }
    get _xIndex()         { return this._X; }
    get _yIndex()         { return this._Y; }
    get _status()         { return this._P; }
    get _stackPointer()   { return this._SP; }
    get _programCounter() { return this._PC; }

    get _addressing_modes() {
        return [
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
    }

    get _instructions() {
        return [
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

    /// Gets current opcode from memory.
    _fetch() {
        return this._memory.read(this._programCounter);
    }

    /// Absolute
    _abs() {
        const addressLow = this._memory.read(this._programCounter + 1);
        const addressHigh = this._memory.read(this._programCounter + 2) << 8;

        return addressHigh | addressLow;
    }

    /// Absolute X
    _absX() {
        return uint16(this._abs() + this._xIndex);
    }

    /// Absolute Y
    _absY() {
        return uint16(this._abs() + this._yIndex);
    }

    /// Immediate
    _imme() {
        return uint16(this._programCounter + 1);
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

        const addressLow = this._memory.read(target);
        const addressHigh = this._memory.read(target & 0xff00 | uint8((target & 0x00ff) + 1)) << 8;

        return addressHigh | addressLow;
    }

    /// Indirect X
    _indX() {
        const target = this._memory.read(this._programCounter + 1) + this._xIndex;

        const addressLow = this._memory.read(uint8(target));
        const addressHigh = this._memory.read(uint8(target + 1)) << 8;

        return addressHigh | addressLow;
    }

    /// Indirect Y
    _indY() {
        const target = this._memory.read(this._programCounter + 1);

        const addressLow = this._memory.read(target);
        const addressHigh = this._memory.read(uint8(target + 1)) << 8;

        return uint16((addressHigh | addressLow) + this._yIndex);
    }

    /// Relative
    _rel() {
        return uint16(this._programCounter + 1);
    }

    /// Zeropage
    _zpg() {
        return this._memory.read(this._programCounter + 1);
    }

    /// Zeropage X
    _zpgX() {
        return uint8(this._memory.read(this._programCounter + 1) + this._xIndex);
    }

    /// Zeropage Y
    _zpgY() {
        return uint8(this._memory.read(this._programCounter + 1) + this._yIndex);
    }

    _memoryAddress() {
        const opcode = this._fetch();
        const addressingFn = this._addressing_modes[opcode];
        if (addressingFn === null) {
            console.error('Unsuported opcode', opcode);
        } else {
            return addressingFn.call(this);
        }
    }

    /// Gets the value in memory address.
    _memoryValue() {
        const address = this._memoryAddress();
        return this._memory.read(address);
    }


    /*****************************************************************************
     * Stack Functions
     *****************************************************************************/
    static get _STACK_BASE() { return 0x0100; }

    _stackPush(x) {
        this._memory.write(CPU._STACK_BASE | this._stackPointer, x);
        this._stackPointer--;
    }

    _stackPop() {
        this._stackPointer++;
        return this._memory.read(CPU._STACK_BASE | this._stackPointer);
    }

    /*****************************************************************************
     * Instructions
     *****************************************************************************/

    /// Sets carry flag if bit 8 in x is set, otherwise resets it.
    _setOrResetCarry(x) {
        this._status = setOrReset(this._status, uint16(x >> 8), CPU._CARRY);
    }

    /// Sets negative flag if bit 7 of x is set, otherwise resets it.
    _setOrResetNegative(x) {
        this._status = setOrReset(this._status, uint8(x), CPU._NEGATIVE);
    }

    /// Sets overflow if bit 7 in arguments are different, otherwise resets it.
    _setOrResetOverflow(a, b, result) {
        // Determines if overflow occurred and moves the bit to the overflow flag position.
        const overflow = uint8(((a ^ result) & (b ^ result) & 0x80) >> 1);
        this._status = setOrReset(this._status, overflow, CPU._OVERFLOW);
    }

    /// Sets zero flag if x is 0, otherwise resets it.
    _setOrResetZero(x) {
        const zero = x === 0 ? CPU._ZERO : 0;
        this._status = setOrReset(this._status, zero, CPU._ZERO);
    }

    /// LDA - Load Accumulator with Memory
    _lda() {
        this._accumulator = this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    /// STA - Store Accumulator in Memory
    _sta() {
        const address = this._memoryAddress();
        this._memory.write(address, this._accumulator);
    }

    /// ADC - Add Memory to Accumulator with Carry
    _adc() {
        const carry = this._status & CPU._CARRY;
        const m = this._memoryValue();

        const resultWithCarry = uint16(this._accumulator + m + carry);
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetOverflow(this._accumulator, m, result);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);

        this._accumulator = result;
    }

    /// SBC - Subtract Memory from Accumulator with Borrow
    _sbc() {
        const carry = this._status & CPU._CARRY;
        const m = uint8(~this._memoryValue() + carry);

        const resultWithCarry = uint16(this._accumulator + m);
        const result = uint8(resultWithCarry);

        this._setOrResetCarry(resultWithCarry);
        this._setOrResetOverflow(this._accumulator, m, result);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);

        this._accumulator = result;
    }

    /// AND - Memory with Accumulator
    _and() {
        this._accumulator &= this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    /// ORA - "OR" Memory with Accumulator
    _ora() {
        this._accumulator |= this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    /// EOR - "Exclusive OR" Memory with Accumulator
    _eor() {
        this._accumulator ^= this._memoryValue();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    /// SEC - Set Carry Flag
    _sec() {
        this._status |= CPU._CARRY;
    }

    /// CLC - Clear Carry Flag
    _clc() {
        this._status &= ~CPU._CARRY;
    }

    /// SEI - Set Interrupt Disable
    _sei() {
        this._status |= CPU._INTERRUPT_DISABLE;
    }

    /// CLI - Clear Interrupt Disable
    _cli() {
        this._status &= ~CPU._INTERRUPT_DISABLE;
    }

    /// SED - Set Decimal Mode
    _sed() {
        this._status |= CPU._DECIMAL;
    }

    /// CLD - Clear Decimal Mode
    _cld() {
        this._status &= ~CPU._DECIMAL;
    }

    /// CLV - Clear Overflow Flag
    _clv() {
        this._status &= ~CPU._OVERFLOW;
    }

    /// RTI - Return from Interrupt
    _rti() {
        this._status = (this._stackPop() & 0xef) | CPU._EXPANSION;
        const pcl = uint16(this._stackPop());
        const pch = uint16(this._stackPop() << 8);
        // - 1 so program counter will be at correct location after adding instruction length.
        this._programCounter = (pch | pcl) - 1;
    }

    /// JMP - Jump to New Location
    _jmp() {
        // - 3 so program counter will be at correct location after adding instruction length.
        this._programCounter = this._memoryAddress() - 3;
    }

    /// NMI - Non-Maskable Interrupt
    _nmi() {
        const pch = (this._programCounter + 2) >> 8;
        const pcl = this._programCounter + 2;
        this._stackPush(pch);
        this._stackPush(pcl);
        this._stackPush(this._status);
        this._programCounter = 0xfffb | 0xfffa;
    }

    /// BRK - Break Command
    _brk() {
        const pch = (this._programCounter + 2) >> 8;
        const pcl = this._programCounter + 2;
        this._stackPush(pch);
        this._stackPush(pcl);
        this._stackPush(this._status | 0x30);
        this._sei();
        this._programCounter = 0xffff | 0xfffe;
    }

    /// Takes a uint8 as argument and if its 7th bit is set, will return a uint16
    /// with 1s as padding instead of 0s. This ensures that the offset can be
    /// added with another uint16 and produce the correct results.
    _getOffset() {
        const x = this._memoryValue();
        const result = uint16(x & CPU._NEGATIVE ? x | 0xff00 : x);
        return result;
    }

    /// BMI - Branch on Result Minus
    _bmi() {
        if (this._status & CPU._NEGATIVE) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// BPL - Branch on Result Plus
    _bpl() {
        if (!(this._status & CPU._NEGATIVE)) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// BCC - Branch on Carry Clear
    _bcc() {
        if (!(this._status & CPU._CARRY)) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// BCS - Branch on Carry Set
    _bcs() {
        if (this._status & CPU._CARRY) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// BEQ - Branch on Result Zero
    _beq() {
        if (this._status & CPU._ZERO) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// BNE - Branch on Result Not Zero
    _bne() {
        if (!(this._status & CPU._ZERO)) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// BVS - Branch on Overflow Set
    _bvs() {
        if (this._status & CPU._OVERFLOW) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// BVC - Branch on Overflow Clear
    _bvc() {
        if (!(this._status & CPU._OVERFLOW)) {
            const offset = this._getOffset();
            this._programCounter = this._programCounter + offset;
        }
    }

    /// CMP - Compare Memory and Accumulator
    _cmp() {
        const result_with_carry = uint16(this._accumulator - this._memoryValue() ^ (1 << 8));
        const result = uint8(result_with_carry);

        this._setOrResetCarry(result_with_carry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    /// BIT - Test Bits in Memory with Accumulator
    _bit() {
        const value = this._memoryValue();
        const result = this._accumulator & value;

        this._status = setOrReset(this._status, value, CPU._OVERFLOW);
        this._status = setOrReset(this._status, value, CPU._NEGATIVE);
        this._setOrResetZero(result);
    }

    /// LDX - Load Index Register X from Memory
    _ldx() {
        this._xIndex = this._memoryValue();
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    /// LDY - Load Index Register Y from Memory
    _ldy() {
        this._yIndex = this._memoryValue();
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    /// STX - Store Index Register X in Memory
    _stx() {
        this._memory.write(this._memoryAddress(), this._xIndex);
    }

    /// STY - Store Index Register Y in Memory
    _sty() {
        this._memory.write(this._memoryAddress(), this._yIndex);
    }

    /// INX - Increment Index Register X by one
    _inx() {
        this._xIndex++;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    /// INY - Increment Index Register Y by one
    _iny() {
        this._yIndex++;
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    /// DEX - Decrement Index Register X by one
    _dex() {
        this._xIndex--;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    /// DEY - Decrement Index Register Y by one
    _dey() {
        this._yIndex--;
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    /// CPX - Compare Index Register X to Memory
    _cpx() {
        const result_with_carry = uint16(this._xIndex - this._memoryValue() ^ (1 << 8));
        const result = uint8(result_with_carry);

        this._setOrResetCarry(result_with_carry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    /// CPY - Compare Index Register Y to Memory
    _cpy() {
        const result_with_carry = uint16(this._yIndex - this._memoryValue() ^ (1 << 8));
        const result = uint8(result_with_carry);

        this._setOrResetCarry(result_with_carry);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
    }

    /// TAX - Transfer Accumulator to Index X
    _tax() {
        this._xIndex = this._accumulator;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    /// TXA - Transfer Index X to Accumulator
    _txa() {
        this._accumulator = this._xIndex;
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    /// TAY - Transfer Accumulator to Index Y
    _tay() {
        this._yIndex = this._accumulator;
        this._setOrResetNegative(this._yIndex);
        this._setOrResetZero(this._yIndex);
    }

    /// TYA - Transfer Index Y to Accumulator
    _tya() {
        this._accumulator = this._yIndex;
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    /// JSR - Jump to Subroutine
    _jsr() {
        const pch = uint8((this._programCounter + 2) >> 8);
        const pcl = uint8(this._programCounter + 2);
        this._stackPush(pch);
        this._stackPush(pcl);
        // - 3 so program counter will be at correct location after adding instruction length.
        this._programCounter = this._memoryAddress() - 3;
    }

    /// RTS - Return from Subroutine
    _rts() {
        const pcl = uint16(this._stackPop());
        const pch = uint16(this._stackPop() << 8);
        this._programCounter = pch | pcl;
    }

    /// PHA - Push Accumulator on Stack
    _pha() {
        this._stackPush(this._accumulator);
    }

    /// PLA - Pull Accumulator from Stack
    _pla() {
        this._accumulator = this._stackPop();
        this._setOrResetNegative(this._accumulator);
        this._setOrResetZero(this._accumulator);
    }

    /// TXS - Transfer Index X to Stack Pointer
    _txs() {
        this._stackPointer = this._xIndex;
    }

    /// TSX - Transfer Stack Pointer to Index
    _tsx() {
        this._xIndex = this._stackPointer;
        this._setOrResetNegative(this._xIndex);
        this._setOrResetZero(this._xIndex);
    }

    /// PHP - Push Processor Status on Stack
    _php() {
        this._stackPush(this._status | 0x30);
    }

    /// PLP - Pull Processor Status from Stack
    _plp() {
        this._status = (this._stackPop() & 0xef) | CPU._EXPANSION;
    }

    /// LSR - Logical Shift Right
    _lsr(value) {
        const result = value >> 1;
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value, CPU._CARRY);
        return result;
    }

    /// ROL with result being the accumulator.
    _lsra() {
        this._accumulator = this._lsr(this._accumulator);
    }

    /// ROL with result being memory value.
    _lsrm() {
        const v = this._memoryValue();
        this._memory.write(this._memoryAddress(), this._lsr(v));
    }

    /// ASL - Arithmetic Shift Left
    _asl(value) {
        const result = uint8(value << 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value >> 7, CPU._CARRY);
        return result;
    }

    /// ASL with result being the accumulator.
    _asla() {
        this._accumulator = this._asl(this._accumulator);
    }

    /// ASL with result being memory value.
    _aslm() {
        const v = this._memoryValue();
        this._memory.write(this._memoryAddress(), this._asl(v));
    }

    /// ROL - Rotate Left
    _rol(value) {
        const result = setOrReset(value << 1, this._status, CPU._CARRY);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value >> 7, CPU._CARRY);
        return result;
    }

    /// ROL with result being the accumulator.
    _rola() {
        this._accumulator = this._rol(this._accumulator);
    }

    /// ROL with result being memory value.
    _rolm() {
        const v = this._memoryValue();
        this._memory.write(this._memoryAddress(), this._rol(v));
    }

    /// ROR - Rotate Right
    _ror(value) {
        const result = setOrReset(value >> 1, this._status << 7, 1 << 7);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._status = setOrReset(this._status, value, CPU._CARRY);
        return result;
    }

    /// ROR with result being the accumulator.
    _rora() {
        this._accumulator = this._ror(this._accumulator);
    }

    /// ROR with result being memory value.
    _rorm() {
        const v = this._memoryValue();
        this._memory.write(this._memoryAddress(), this._ror(v));
    }

    /// INC- Increment Memory by One
    _inc() {
        const result = uint8(this._memoryValue() + 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._memory.write(this._memoryAddress(), result);
    }

    /// DEC - Decrement Memory by One
    _dec() {
        const result = uint8(this._memoryValue() - 1);
        this._setOrResetNegative(result);
        this._setOrResetZero(result);
        this._memory.write(this._memoryAddress(), result);
    }

    /// NOP - No Operation
    _nop() { }
}
