'use strict';

export { uint8, uint16, setOrReset };

function uint8(x) {
    return x & 0xff;
}

function uint16(x) {
    return x & 0xffff;
}

/// Returns a with its bits set or reset based on wether or not they
/// are set in b. Options are the bits to check for.
function setOrReset(a, b, options) {
    return (a & ~(a & options)) ^ (b & options);
}
