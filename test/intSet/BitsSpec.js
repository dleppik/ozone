/**
 * Created by dleppik on 11/8/13.
 */

"use strict";

describe("Bits", function() {
    var bits = ozone.intSet.bits;

    it ("Parses bits", function() {
        expect(bits.base2ToBits(     "0")).toBe(0);
        expect(bits.base2ToBits(    "10")).toBe(2);
        expect(bits.base2ToBits( "00010")).toBe(2);
        expect(bits.base2ToBits(    "101")).toBe(5);
        expect(bits.base2ToBits(  "10101")).toBe(21);
        expect(bits.base2ToBits("10000000000000000000000000000000")).toBe(-2147483648);
        expect(function() {bits.base2ToBits("100000000000000000000000000000000")} )
            .toThrow(new Error("More than 32 bits: '100000000000000000000000000000000'"));
    });

    it ("Sets bits to true", function() {
        expect(bits.setBit( 0, 0)).toBe(1);
        expect(bits.setBit( 1, 0)).toBe(2);
        expect(bits.setBit( 2, 0)).toBe(4);
        expect(bits.setBit(31, 0)).toBe(-2147483648);
        expect(bits.setBit(31, 0)).toBe(bits.base2ToBits( "10000000000000000000000000000000"));
        expect(bits.setBit(32, 0)).toBe(1);  // Wrap

        var bitMap1 = bits.base2ToBits("10101");
        expect(bits.setBit(0, bitMap1)).toBe(bitMap1);
        expect(bits.setBit(2, bitMap1)).toBe(bitMap1);
        expect(bits.setBit(4, bitMap1)).toBe(bitMap1);

        expect(bits.setBit( 1, bitMap1)).toBe(bits.base2ToBits(  "10111"));
        expect(bits.setBit( 3, bitMap1)).toBe(bits.base2ToBits(  "11101"));
        expect(bits.setBit( 5, bitMap1)).toBe(bits.base2ToBits( "110101"));
        expect(bits.setBit( 6, bitMap1)).toBe(bits.base2ToBits("1010101"));
        expect(bits.setBit(31, bitMap1)).toBe(bits.base2ToBits( "10000000000000000000000000010101"));
    });

    it ("Un-sets bits (to false)", function() {
        expect(bits.unsetBit( 0, 0)).toBe(0);
        expect(bits.unsetBit( 2, 0)).toBe(0);
        expect(bits.unsetBit(31, 0)).toBe(0);

        var allBits = bits.base2ToBits("11111111111111111111111111111111");

        expect(bits.unsetBit( 0, allBits)).toBe(bits.base2ToBits( "11111111111111111111111111111110"));
        expect(bits.unsetBit( 1, allBits)).toBe(bits.base2ToBits( "11111111111111111111111111111101"));
        expect(bits.unsetBit( 2, allBits)).toBe(bits.base2ToBits( "11111111111111111111111111111011"));
        expect(bits.unsetBit(30, allBits)).toBe(bits.base2ToBits( "10111111111111111111111111111111"));
        expect(bits.unsetBit(31, allBits)).toBe(bits.base2ToBits( "01111111111111111111111111111111"));
        expect(bits.unsetBit(32, allBits)).toBe(bits.base2ToBits( "11111111111111111111111111111110"));  // Wrap

        var bitMap1 = bits.base2ToBits("10101");
        expect(bits.unsetBit(1, bitMap1)).toBe(bitMap1);
        expect(bits.unsetBit(3, bitMap1)).toBe(bitMap1);
        expect(bits.unsetBit(5, bitMap1)).toBe(bitMap1);

        expect(bits.unsetBit( 0, bitMap1)).toBe(bits.base2ToBits( "10100"));
        expect(bits.unsetBit( 2, bitMap1)).toBe(bits.base2ToBits( "10001"));
        expect(bits.unsetBit( 4, bitMap1)).toBe(bits.base2ToBits( "00101"));
        expect(bits.unsetBit( 5, bitMap1)).toBe(bitMap1);
        expect(bits.unsetBit(31, bitMap1)).toBe(bitMap1);
    });

    it ("Knows if a bit is set to true", function() {
        expect(bits.hasBit(5, undefined)).toBe(false);
        expect(bits.hasBit(5, 0)).toBe(false);
        var bitMap1 = bits.base2ToBits("10101");
        expect(bits.hasBit(0, bitMap1)).toBe(true);
        expect(bits.hasBit(3, bitMap1)).toBe(false);
        expect(bits.hasBit(4, bitMap1)).toBe(true);
        expect(bits.hasBit(7, bitMap1)).toBe(false);
        expect(bits.hasBit(34, bitMap1)).toBe(true); // Wrap
    });

    it ("Knows the minimum and maximum set bits", function() {
        expect(bits.minBit(undefined)).toBe(-1);
        expect(bits.maxBit(undefined)).toBe(-1);
        expect(bits.minBit(0)).toBe(-1);
        expect(bits.maxBit(0)).toBe(-1);
        var bitMap1 = bits.base2ToBits("10101");
        expect(bits.minBit(bitMap1)).toBe(0);
        expect(bits.maxBit(bitMap1)).toBe(4);

        var bitMap1 = bits.base2ToBits("100100100");
        expect(bits.minBit(bitMap1)).toBe(2);
        expect(bits.maxBit(bitMap1)).toBe(8);
    });
        it ("Counts bits", function() {
        expect(bits.countBits(0)).toBe(0);
        expect(bits.countBits(1)).toBe(1);
        expect(bits.countBits(2)).toBe(1);
        expect(bits.countBits(3)).toBe(2);

        expect(bits.countBits(bits.base2ToBits( "111"))).toBe(3);
        expect(bits.countBits(bits.base2ToBits( "101"))).toBe(2);
        expect(bits.countBits(bits.base2ToBits( "0101011"))).toBe(4);
        expect(bits.countBits(bits.base2ToBits( "11111111111111111111111111111111"))).toBe(32);
        expect(bits.countBits(bits.base2ToBits( "11111111111111111111101111111111"))).toBe(31);
        expect(bits.countBits(bits.base2ToBits( "01111111111111111111111111111111"))).toBe(31);
        expect(bits.countBits(bits.base2ToBits( "10000000000000000000000000000000"))).toBe(1);
    });
});
