/**
 * Copyright 2014 by Vocal Laboratories, Inc. All rights reserved.
 */

/// <reference path='../_all.ts' />

/**
 * Bitwise operations on numbers that represent unsigned 32-bit integers.   All higher bits should be 0.
 */
module ozone.intSet.bits {

    function singleBitMask(bitPos : number) {
        return 1 << bitPos;
    }

    /** Return a number with the bit at num%32 set to true. */
    export function setBit(num : number, bits : number) : number {
        var mask = singleBitMask(num % 32);
        return bits | mask;
    }

    /** Return a number with the bit at num%32 set to false. */
    export function unsetBit(num : number, bits : number) : number {
        var mask = ~ singleBitMask(num % 32);
        return bits & mask;
    }

    /** Returns the number of 1's set within the first 32-bits of this number. */
    export function countBits(bits : number) : number {
        var mask = 1;
        var result = bits & mask;
        while(bits !== 0) {
            bits = bits >>> 1;
            result += (bits & mask);
        }
        return result;
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