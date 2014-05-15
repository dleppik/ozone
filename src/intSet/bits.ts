/**
 * Copyright 2014 by Vocal Laboratories, Inc. All rights reserved.
 */

/// <reference path='../_all.ts' />

/**
 * Bitwise operations on 32-bit numbers.  These match the asm.js standard for "int":  32-bit, unknown sign,
 * intended for bitwise use only.  In practice, JavaScript bitwise operators convert numbers to 32-bit two's-complement,
 * so that's what we use here.  We might actually use asm.js at some point, but hand coding it is a pain (see
 * https://github.com/zbjornson/human-asmjs).
 *
 * See:  http://asmjs.org/spec/latest/
 */
module ozone.intSet.bits {

    function singleBitMask(bitPos : number) : number {
        return 1 << (bitPos % 32);
    }

    /** Return a number with the bit at num%32 set to true. */
    export function setBit(num : number, bits : number) : number {
        bits = bits | 0;  // JIT hint, same one used by asm.js to signify a bitwise int.  Also clears high bits.
        var mask = singleBitMask(num);
        var result = 0; result = bits | mask;
        return result;
    }

    /** Return a number with the bit at num%32 set to false. */
    export function unsetBit(num : number, bits : number) : number {
        bits = bits | 0;
        var mask = ~ singleBitMask(num);
        return bits & mask;
    }

    /** Return true if the bit num%32 is set*/
    export function hasBit(num : number, bits : number) : boolean {
        if (bits & singleBitMask(num)) {
            return true;
        }
        else {
            return false;
        }
    }

    /** Returns the number of 1's set within the first 32-bits of this number. */
    export function countBits(bits : number) : number {
        bits = bits | 0; // This is not just a JIT hint:  clears the high bits
        var result = 0; result = bits & 1;
        while (bits !== 0) {
            bits = bits >>> 1;
            result += (bits & 1);
        }
        return result;
    }

    /** Convert a string of 1's and 0's to a 32-bit number, throws an error if the string is too long. */
    export function base2ToBits(str : string) : number {
        if (str.length > 32) {
            throw new Error("More than 32 bits: '"+str+"'");
        }
        return parseInt(str, 2) | 0;
    }
}