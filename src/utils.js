export function uint8(aNumber) {
    return aNumber & 0xff;
}

export function uint16(aNumber) {
    return aNumber & 0xffff;
}

// Returns a with its bits set or reset based on wether or not they
// are set in b. Options are the bits to check for.
export function setOrReset(a, b, options) {
    return (a & ~(a & options)) ^ (b & options);
}
