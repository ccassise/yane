/* memory.js
 * 
 * Handles the NES reading and writing from/to memory locations.
 * 
 * @dependencies
 *      utils.js
 */
'use strict';

class Memory {
    constructor(nes) {
        this._nes = nes;
        this._memory = new Uint8Array(1024 * 64);
    }

    // TODO: This should go in to another class. Memory should be "dumb".
    read(_address) {
        // return this._memory[uint16(address)];
        const address = uint16(_address);
        const data = this._memory[address];
        switch (address) {
            case 0x2000:
                break;
            case 0x2001:
                break;
            case 0x2002:
                this._nes.onStatusRead(data);
                break;
            case 0x2003:
                break;
            case 0x2004:
                break;
            case 0x2005:
                break;
            case 0x2006:
                break;
            case 0x2007:
                return this._nes.onDataRead(data);
                break;
            default: break;
        }
        return data;
    }

    // TODO: This should go in to another class. Memory should be "dumb".
    write(_address, _data) {
        // this._memory[uint16(address)] = data;
        const address = uint16(_address);
        const data = uint8(_data);
        this._memory[address] = data;
        switch (address) {
            case 0x2000:
                this._nes.onCtrlWrite(data);
                break;
            case 0x2001:
                break;
            case 0x2002:
                break;
            case 0x2003:
                break;
            case 0x2004:
                break;
            case 0x2005:
                break;
            case 0x2006:
                this._nes.onAddressWrite(data);
                break;
            case 0x2007:
                this._nes.onDataWrite(data);
                break;
            default: break;
        }
    }
}
