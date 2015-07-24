/**
 * Created by dleppik on 11/8/13.
 */

"use strict";

describe("IntSet functions", function() {
    var ArrayIterator = ozone.intSet.OrderedArrayIterator;

    describe("mostEfficientIntSet", function() {
        var bits = ozone.intSet.bits;
        var sparseArrayIntSet = ozone.intSet.ArrayIndexIntSet.fromArray([3, 324]);
        var denseArrayIntSet = ozone.intSet.ArrayIndexIntSet.fromArray([0,2,3,4,10]);
        var sparseBitmapIntSet = new ozone.intSet.BitmapArrayIntSet(
            [bits.base2ToBits( "1000"), undefined, undefined, undefined,
                undefined, undefined, undefined, undefined, undefined, undefined,
                bits.base2ToBits( "10000")], 0);
        var denseBitmapIntSet = new ozone.intSet.BitmapArrayIntSet( [bits.base2ToBits( "10000011101")], 0);

        it("Produces RangeIntSet with consecutive data", function() {
            expect(ozone.intSet.mostEfficientIntSet(new ozone.intSet.ArrayIndexIntSet([3,4,5,6,7,8]))
                instanceof ozone.intSet.RangeIntSet).toEqual(true);
        });
        it("Produces ArrayIndexIntSet with sparse data", function() {
            expect(ozone.intSet.mostEfficientIntSet(sparseArrayIntSet)
                instanceof ozone.intSet.ArrayIndexIntSet).toEqual(true);
            expect(ozone.intSet.mostEfficientIntSet(sparseBitmapIntSet)
                instanceof ozone.intSet.ArrayIndexIntSet).toEqual(true);
        });
        it("Produces BitmapIndexIntSet with dense data", function() {
            expect(ozone.intSet.mostEfficientIntSet(denseBitmapIntSet)
                instanceof ozone.intSet.BitmapArrayIntSet).toEqual(true);
            expect(ozone.intSet.mostEfficientIntSet(denseArrayIntSet)
                instanceof ozone.intSet.BitmapArrayIntSet).toEqual(true);
        });
    });

    describe("unionOfOrderedIterators", function() {
        it("unions", function() {
            var union = ozone.intSet.unionOfOrderedIterators;

            expect(union(new ArrayIterator([])).size()).toBe(0);

            var allThrees = union(new ArrayIterator([3,3,3,3,3,3,3,3,3]));
            expect(allThrees.size()).toBe(1);
            expect(allThrees.max()).toBe(3);

            // Tricky case:  overlap, empty array, elements out of order.
            // We cheat:  OrderedArrayIterator isn't supposed to have elements out of order, but it doesn't
            // currently fix or reject bad input;  skip simply doesn't work.
            var a = ozone.intSet.unionOfIterators(  new ArrayIterator([3,4,5]),
                new ArrayIterator([]),
                new ArrayIterator([4, 8, 2, 16, 8]));
            var aExpected = [2, 3,4,5, 8, 16];
            expect(a.size()).toBe(aExpected.length);
            for (var i=0; i<aExpected.length; i++) {
                expect(a.has(aExpected[i])).toBe(true);
            }

            // Common no-overlap case:  elements in order
            var b = union(  new ArrayIterator([3,4,5]),
                new ArrayIterator([8,9,10]));
            var bExpected = [3,4,5,8,9,10];
            expect(b.size()).toBe(bExpected.length);
            for (i=0; i<bExpected.length; i++) {
                expect(b.has(bExpected[i])).toBe(true);
            }
        });
    });

    describe("intersectionOfOrderedIterators", function() {
        it("intersects", function() {
            var intersection = ozone.intSet.intersectionOfOrderedIterators;

            expect(intersection(new ArrayIterator([])).size()).toBe(0);
            var allThrees = intersection(new ArrayIterator([3,3,3,3,3,3,3,3,3]));
            expect(allThrees.size()).toBe(1);
            expect(allThrees.max()).toBe(3);


            // Minimal case
            var a = intersection( new ArrayIterator([3,4,5]),
                                  new ArrayIterator([4,5,6]));
            var aExpected = [4,5];
            expect(a.size()).toBe(aExpected.length);
            for (var i=0; i<aExpected.length; i++) {
                expect(a.has(aExpected[i])).toBe(true);
            }

            // Longer case
            var b = intersection( new ArrayIterator([0,1,  3,5,  7,  9,   11,13]),
                                  new ArrayIterator([  1,2,  5, 6, 8,9,10]));
            var bExpected = [1,5,9];
            expect(b.size()).toBe(bExpected.length);
            for (i=0; i<bExpected.length; i++) {
                expect(b.has(bExpected[i])).toBe(true);
            }

            // Repeating elements
            var c = intersection( new ArrayIterator([0,1,1,1,1,1,            3,5,  7,  9,   11,13,13,13,13,13]),
                                  new ArrayIterator([  1,        2,2,2,2,2,2,  5, 6, 8,9,10]));
            var cExpected = bExpected;
            expect(c.size()).toBe(cExpected.length);
            for (i=0; i<cExpected.length; i++) {
                expect(c.has(cExpected[i])).toBe(true);
            }

        });
    });
});