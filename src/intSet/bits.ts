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

    export function singleBitMask(bitPos : number) : number {
        return 1 << (bitPos % 32);
    }

    /** Return a number with the bit at num%32 set to true. */
    export function setBit(num : number, word : number) : number {
        word = word | 0;  // JIT hint, same one used by asm.js to signify a bitwise int.  Also clears high bits.
        var mask = singleBitMask(num);
        var result = 0;
        result = word | mask;
        return result;
    }

    /** Return a number with the bit at num%32 set to false. */
    export function unsetBit(num : number, word : number) : number {
        word = word | 0;
        var mask = ~ singleBitMask(num);
        return word & mask;
    }

    /** Return true if the bit num%32 is set*/
    export function hasBit(num : number, word : number) : boolean {

        if (word == null) return false;

        if (word & singleBitMask(num)) {
            return true;
        }
        else {
            return false;
        }
    }

    /** Returns the number of 1's set within the first 32-bits of this number. */
    export function countBits(word : number) : number {

        if (word == null) return 0;

        word = word | 0; // This is not just a JIT hint:  clears the high bits
        var result = 0; result = word & 1;
        while (word !== 0) {
            word = word >>> 1;
            result += (word & 1);
        }
        return result;
    }

    /** Returns the position of the minimum true bit in the lowest 32 bits of word, or -1 if all are false. */
    export function minBit(word : number) : number {

        if (word == null) return -1;

        word = word | 0; // This is not just a JIT hint:  clears the high bits
        var mask : number = singleBitMask(0);
        var result : number = 0;
        while (result < 32 && ((mask & word) !== mask)) {
            mask <<= 1;
            result++;
        }
        if (result > 31) result = -1;
        return result;
    }

    /** Returns the position of the maximum true bit in the lowest 32 bits of word, or -1 if all are false. */
    export function maxBit(word : number) : number {

        if (word == null) return -1;

        word = word | 0; // This is not just a JIT hint:  clears the high bits
        var mask : number = singleBitMask(31);
        var result : number = 31;
        while (result >= 0 && ((mask & word) !== mask)) {
            mask >>>= 1;
            result--;
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

    /** Returns the 32-bit int 'bit' is in */
    export function inWord(bit : number) {
        return Math.floor((bit | 0) / 32);
    }

    /** Returns the offset into a 32-bit int that 'bit' is in */
    export function offset(bit : number) {
        return bit%32;
    }
}