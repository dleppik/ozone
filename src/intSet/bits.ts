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
        return 1 << bitPos;
    }

    /** Return a number with the bit at num%32 set to true. */
    export function setBit(num : number, bits : number) : number {
        bits = bits | 0;
        var mask = singleBitMask(num % 32);
        var result = 0; result = bits | mask;
        return result;
    }

    /** Return a number with the bit at num%32 set to false. */
    export function unsetBit(num : number, bits : number) : number {
        bits = bits | 0;
        var mask = ~ singleBitMask(num % 32);
        return bits & mask;
    }

    /** Returns the number of 1's set within the first 32-bits of this number. */
    export function countBits(bits : number) : number {
        bits = bits | 0;
        var mask = 1;
        var result = 0; result = bits & mask;
        while(bits !== 0) {
            bits = bits >>> 1;
            result += (bits & mask);
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

    /**
     * For each bit, add offset and append to the array, returning that array.
     * Thus appendToArray(1, 32) returns [32] and appendToArray(3, 32) returns [32, 33].
     */
    export function appendToArray(bits : number, offset : number, array : number[] = []) : number[] {
        return notWritten(); // TODO
    }

    function notWritten() : any {
        throw new Error("This method has not been implemented yet."); // XXX
    }
}