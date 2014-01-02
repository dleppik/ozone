/**
 * Created by dleppik on 11/8/13.
 */

"use strict";

describe("Bitmap functions", function() {
    var ArrayIterator = ozone.bitmap.OrderedArrayIterator;

    describe("unionOfIterators", function() {
        it("unions", function() {
            var union = ozone.bitmap.unionOfIterators;

            expect(union(new ArrayIterator([])).size).toBe(0);

            var allThrees = union(new ArrayIterator([3,3,3,3,3,3,3,3,3]));
            expect(allThrees.size).toBe(1);
            expect(allThrees.max()).toBe(3);

            // Tricky case:  overlap, empty array, elements out of order.
            // We cheat:  OrderedArrayIterator isn't supposed to have elements out of order, but it doesn't
            // currently fix or reject bad input;  skip simply doesn't work.
            var a = union(  new ArrayIterator([3,4,5]),
                new ArrayIterator([]),
                new ArrayIterator([4, 8, 2, 16, 8]));
            var aExpected = [2, 3,4,5, 8, 16];
            expect(a.size).toBe(aExpected.length);
            for (var i=0; i<aExpected.length; i++) {
                expect(a.get(aExpected[i])).toBe(true);
            }

            // Common no-overlap case:  elements in order
            var b = union(  new ArrayIterator([3,4,5]),
                new ArrayIterator([8,9,10]));
            var bExpected = [3,4,5,8,9,10];
            expect(b.size).toBe(bExpected.length);
            for (i=0; i<bExpected.length; i++) {
                expect(b.get(bExpected[i])).toBe(true);
            }
        });
    });

    describe("intersectionOfOrderedIterators", function() {
        it("intersects", function() {
            var intersection = ozone.bitmap.intersectionOfOrderedIterators;

            expect(intersection(new ArrayIterator([])).size).toBe(0);
            var allThrees = intersection(new ArrayIterator([3,3,3,3,3,3,3,3,3]));
            expect(allThrees.size).toBe(1);
            expect(allThrees.max()).toBe(3);


            // Minimal case
            var a = intersection( new ArrayIterator([3,4,5]),
                                  new ArrayIterator([4,5,6]));
            var aExpected = [4,5];
            expect(a.size).toBe(aExpected.length);
            for (var i=0; i<aExpected.length; i++) {
                expect(a.get(aExpected[i])).toBe(true);
            }

            // Longer case
            var b = intersection( new ArrayIterator([0,1,  3,5,  7,  9,   11,13]),
                                  new ArrayIterator([  1,2,  5, 6, 8,9,10]));
            var bExpected = [1,5,9];
            expect(b.size).toBe(bExpected.length);
            for (i=0; i<bExpected.length; i++) {
                expect(b.get(bExpected[i])).toBe(true);
            }

            // Repeating elements
            var c = intersection( new ArrayIterator([0,1,1,1,1,1,            3,5,  7,  9,   11,13,13,13,13,13]),
                                  new ArrayIterator([  1,        2,2,2,2,2,2,  5, 6, 8,9,10]));
            var cExpected = bExpected;
            expect(c.size).toBe(cExpected.length);
            for (i=0; i<cExpected.length; i++) {
                expect(c.get(cExpected[i])).toBe(true);
            }

        });
    });
});


describe("RangeBitmap", function() {
    var RangeBitmap = ozone.bitmap.RangeBitmap;

    var minMaxLengths = [ [0,0,1], [5,10,6], [-1,-1,0] ];
    var bitmaps = [];
    for (var i=0; i< minMaxLengths.length; i++) {
        var mml = minMaxLengths[i];
        bitmaps.push(new RangeBitmap(mml[0], mml[2]));
    }

    it("Reports min accurately", function() {
        for (var i=0; i<bitmaps.length; i++) {
            expect(bitmaps[i].min()).toBe(minMaxLengths[i][0]);
        }
    });
    it("Reports max accurately", function() {
        for (var i=0; i<bitmaps.length; i++) {
            expect(bitmaps[i].max()).toBe(minMaxLengths[i][1]);
        }
    });
    it("Reports size accurately", function() {
        for (var i=0; i<bitmaps.length; i++) {
            expect(bitmaps[i].size).toBe(minMaxLengths[i][2]);
        }
    });

    it("Iterates with proper min, max, and length", function() {
        for (var i=0; i<bitmaps.length; i++) {
            var bitmap = bitmaps[i];
            var mml = minMaxLengths[i];
            var iterator = bitmap.iterator();
            var nonEmpty = mml[2] > 0;

            expect(iterator.hasNext()).toBe(nonEmpty);

            var first = iterator.next();
            var count = 1;
            var last = first;
            while(iterator.hasNext()) {
                last = iterator.next();
                count++;
            }
            if (nonEmpty) {
                expect(first).toBe(bitmap.min());
                expect(last).toBe(bitmap.max());
                expect(count).toBe(bitmap.size);
            }
            else {
                expect(count).toBe(1);
                expect(last).toBeUndefined();
            }
        }
    });

    it("Iterates with proper skip behavior", function() {
        var it = new ozone.bitmap.RangeBitmap(5, 6).iterator();
        it.skipTo(7);  expect(it.next()).toBe( 7);
        it.skipTo(8);  expect(it.next()).toBe( 8);
        it.skipTo(7);  expect(it.next()).toBe( 9);
        it.skipTo(10); expect(it.next()).toBe(10);
        it.skipTo(11); expect(it.next()).toBeUndefined();
    });

    it("Unions with itself produce itself", function() {
        for (var i=0; i<bitmaps.length; i++) {
            var bitmap = bitmaps[i];
            if (bitmap.size > 0) {
                expect(bitmap.union(bitmap)).toBe(bitmap);
            }
        }
    });

    it("Unions with empty bitmap to produce itself", function() {
        for (var i=0; i<bitmaps.length; i++) {
            var bitmap = bitmaps[i];
            expect(bitmap.union(RangeBitmap.emptyBitmap).equals(bitmap)).toBe(true);
        }
    });

    it("Unions with intersecting RangeBitmaps to produce RangeBitmaps", function() {
        var a = RangeBitmap.fromTo(0, 9);
        var b = RangeBitmap.fromTo(1, 10);
        var aUnionB = a.union(b);
        expect(aUnionB).toEqual(b.union(a));
        expect(aUnionB instanceof RangeBitmap).toBe(true);
        expect(aUnionB.min()).toBe(0);
        expect(aUnionB.max()).toBe(10);

        a = RangeBitmap.fromTo(50, 60);
        b = RangeBitmap.fromTo(60, 70);
        aUnionB = a.union(b);
        expect(aUnionB).toEqual(b.union(a));
        expect(aUnionB instanceof RangeBitmap).toBe(true);
        expect(aUnionB.min()).toBe(50);
        expect(aUnionB.max()).toBe(70);

        a = RangeBitmap.fromTo( 99, 110);
        b = RangeBitmap.fromTo(100, 105);
        aUnionB = a.union(b);
        expect(aUnionB).toEqual(b.union(a));
        expect(aUnionB instanceof RangeBitmap).toBe(true);
        expect(aUnionB.min()).toBe(99);
        expect(aUnionB.max()).toBe(110);
    });

    it("Unions with non-intersecting RangeBitmaps to produce a disjoint bitmap", function() {
        var a = RangeBitmap.fromTo(10, 20);
        var b = RangeBitmap.fromTo(21, 30);
        var aUnionB = a.union(b);

        expect(b.union(a).equals(aUnionB)).toBe(true);
        expect(aUnionB.size).toBe(a.size + b.size);
        expect(aUnionB.min()).toBe(a.min());
        expect(aUnionB.max()).toBe(b.max());
        aUnionB.each(function(num) {
            expect(a.get(num) || b.get(num)).toBe(true);
        });
    });

    it("Intersects with other RangeBitmaps properly", function() {
        var a = RangeBitmap.fromTo(10, 20);
        var b = RangeBitmap.fromTo(21, 30);
        var aAndB = a.intersection(b);
        expect(aAndB.size).toBe(0);

        var c = RangeBitmap.fromTo(15, 25);
        var expectedAAndC = RangeBitmap.fromTo(15, 20);
        expect(a.intersection(c).equals(expectedAAndC)).toBe(true);
        expect(c.intersection(a).equals(expectedAAndC)).toBe(true);
    });
});

describe("General-purpose Bitmaps", function() {
    var RangeBitmap = ozone.bitmap.RangeBitmap;
    var ArrayIterator = ozone.bitmap.OrderedArrayIterator;
    var unionOfIterators = ozone.bitmap.unionOfIterators;
    var intersectionOfOrderedIterators = ozone.bitmap.intersectionOfOrderedIterators;

    // Many of these were generated randomly.  We need to test boundaries around 32 for packed bitmaps
    var arrays = [
        [],
        [0],
        [0, 1],
        [31],
        [33],
        [100],
        [100, 111],
        [ 2, 5, 8, 11, 15, 16, 18, 19, 21, 25, 29, 33, 37, 38, 39, 40, 43, 45, 48, 52 ],
        [ 0, 2, 5, 12, 18, 26, 36, 45, 51, 55, 64, 73, 74, 76, 84, 92, 98, 108, 118, 123 ],
        [ 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 27, 29, 31, 33, 35, 36, 38, 40, 42, 44, 46, 47 ],
        [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32 ]
    ];

    var bitmapClasses = [ ozone.bitmap.ArrayIndexBitmap ];

    var forEachArray = function(beforeElements, onEachElement, afterElements) {
        for (var i=0; i< arrays.length; i++) {
            var array = arrays[i];
            if (typeof beforeElements === "function") {
                beforeElements(array);
            }
            if (typeof(onEachElement) === "function") {
                for (var j=0; j<array.length; j++) {
                    onEachElement(array, array[j]);
                }
            }
            if (typeof afterElements === "function") {
                afterElements(array);
            }
        }
    };

    var bitmapForEachArray = function(withArrayAndBitmap) {
        var builder;
        forEachArray(
            function(array)          { builder = bitmapClass.builder(); },
            function(array, element) { builder.onItem(element); },
            function(array)          { withArrayAndBitmap(array, builder.onEnd()); }
        );
    };

    describe("Binary search", function() {
        it("Finds each element, and only those elements", function() {
            forEachArray(function(array) {
                var element = 0;
                for (var arrayIndex=0; arrayIndex<array.length; arrayIndex++) {
                    var nextInArray = array[arrayIndex];
                    for (; element < nextInArray; element++) {
                        expect(ozone.bitmap.search(element, array, 0, array.length-1)).toEqual(~arrayIndex);
                    }
                    expect(ozone.bitmap.search(element, array, 0, array.length-1)).toEqual(arrayIndex);
                    element++;
                }
            });
        });
    });

    for (var bitmapClassIndex = 0; bitmapClassIndex < bitmapClasses.length; bitmapClassIndex++) {
        var bitmapClass = bitmapClasses[bitmapClassIndex];
        describe("Implementation "+bitmapClassIndex+": "+bitmapClass, function() {
            it("Has a builder that produces something of the right size", function() {
                var builder;
                forEachArray(
                    function() {
                        builder = bitmapClass.builder();
                        expect(typeof(builder)).toBe("object");
                    },
                    function(a, element) { builder.onItem(element); },
                    function(array)      { expect(builder.onEnd().size).toEqual(array.length); }
                );
            });
            it("Reports min accurately", function() {
                bitmapForEachArray(function(array, bitmap) {
                    var expected = (array.length == 0) ?  -1  : array[0];
                    expect(bitmap.min()).toEqual(expected);
                });
            });
            it("Reports max accurately", function() {
                bitmapForEachArray(function(array, bitmap) {
                    var expected = (array.length == 0) ?  -1  : array[array.length-1];
                    expect(bitmap.max()).toEqual(expected);
                });
            });
            it("Reports 'get' accurately", function() {
                bitmapForEachArray(function(array, bitmap) {
                    var element = 0;
                    for (var arrayIndex=0; arrayIndex<array.length; arrayIndex++) {
                        var nextInArray = array[arrayIndex];
                        for (; element < nextInArray; element++) {
                            expect(bitmap.get(element)).toEqual(false);
                        }
                        expect(bitmap.get(element)).toEqual(true);
                        element++;
                    }
                    for (; element < nextInArray+33; element++) {  // Check past next packed bits
                        expect(bitmap.get(element)).toEqual(false);
                    }
                });
            });
            describe("Iterator", function() {
                it("Increases monotonically", function() {
                    bitmapForEachArray(function(array, bitmap) {
                        var it = bitmap.iterator();
                        var previous = -1;
                        while (it.hasNext()) {
                            var element = it.next();
                            expect(element).toBeGreaterThan(previous);
                            previous = element;
                        }
                    });
                });
                it("Matches get", function() {
                    bitmapForEachArray(function(array, bitmap) {
                        var it = bitmap.iterator();
                        while (it.hasNext()) {
                            var element = it.next();
                            expect(bitmap.get(element)).toBe(true);
                        }
                    });
                });
                it("Matches size", function() {
                    bitmapForEachArray(function(array, bitmap) {
                        var it = bitmap.iterator();
                        var count = 0;
                        while (it.hasNext()) {
                            it.next();
                            count++;
                        }
                        expect(count).toBe(bitmap.size);
                    });
                });
                it("Skips properly", function() {
                    bitmapForEachArray(function(array, bitmap) {
                        if (array.length > 0) {
                            var it = bitmap.iterator();
                            it.skipTo(bitmap.min()-1);
                            expect(it.next()).toBe(bitmap.min());

                            it = bitmap.iterator();
                            it.skipTo(bitmap.min());
                            it.skipTo(bitmap.min());
                            it.skipTo(bitmap.min());
                            expect(it.next()).toBe(bitmap.min());
                            if (array.length > 1) {
                                it.skipTo(bitmap.max());
                                expect(it.next()).toBe(bitmap.max());
                            }

                            it = bitmap.iterator();
                            it.skipTo(bitmap.max()+1);
                            expect(it.hasNext()).toBe(false);

                            if (array.length > 1) {
                                it = bitmap.iterator();
                                var skipTo = bitmap.max()-1;
                                it.skipTo(skipTo);
                                var expectedNext = (bitmap.get(skipTo)) ?  skipTo  :  bitmap.max();
                                expect(it.next()).toBe(expectedNext);
                            }
                        }
                    });
                });
            });

            it("Has 'each' which matches the iterator", function() {
                bitmapForEachArray(function(array, bitmap) {
                    var it = bitmap.iterator();
                    bitmap.each(function(element) {
                        expect(element).toBe(it.next());
                    });
                    expect(it.hasNext()).toBe(false);
                });
            });

            it("Unions with a RangeBitmap with the same or wider range to produce a RangeBitmap", function() {
                bitmapForEachArray(function(array, bitmap) {
                    var sameSize = RangeBitmap.fromTo(bitmap.min(), bitmap.max());
                    var sameSizeUnion = bitmap.union(sameSize);
                    if (!sameSizeUnion.equals(sameSize)) {
                        console.log("sameSizeUnion min: "+sameSizeUnion.min()+", max: "+sameSizeUnion.max()+
                            ", size: "+sameSizeUnion.size+", equality: "+sameSizeUnion.equals(sameSize));
                    }
                    expect(sameSizeUnion.equals(sameSize)).toBe(true);
                    expect(sameSizeUnion instanceof RangeBitmap).toBe(true);

                    var bigger = RangeBitmap.fromTo(0, bitmap.max()+1);
                    var biggerUnion = bitmap.union(bigger);
                    expect(biggerUnion.equals(bigger)).toBe(true);
                    expect(biggerUnion instanceof RangeBitmap).toBe(true);
                });
            });

            it("Unions with a partially overlapping or smaller RangeBitmap properly", function() {
                bitmapForEachArray(function(array, intSet) {
                    if (array.length === 0) {
                        return;
                    }
                    var r1 = RangeBitmap.fromTo(0, intSet.min());
                    expect(intSet.union(r1).equals(unionOfIterators(r1.iterator(), intSet.iterator()))).toBe(true);

                    var r2 = RangeBitmap.fromTo(intSet.max(), intSet.max()+2);
                    expect(intSet.union(r2).equals(unionOfIterators(r2.iterator(), intSet.iterator()))).toBe(true);

                    if (intSet.size > 1) {
                        var r3 = RangeBitmap.fromTo(intSet.min()+1, intSet.max());
                        expect(intSet.union(r3).equals(unionOfIterators(r3.iterator(), intSet.iterator()))).toBe(true);
                    }
                    if (intSet.size > 2) {
                        var r4 = RangeBitmap.fromTo(intSet.min()+1, intSet.max()-1);
                        expect(intSet.union(r4).equals(unionOfIterators(r4.iterator(), intSet.iterator()))).toBe(true);
                    }
                });
            });

            it("Intersects with a RangeBitmap with the same or wider range to produce itself or an equivalent bitmap", function() {
                bitmapForEachArray(function(array, intSet) {
                    if (array.length === 0) {
                        return;
                    }
                    var r1 = RangeBitmap.fromTo(intSet.min(), intSet.max());
                    expect(intSet.intersection(r1).equals(intersectionOfOrderedIterators(r1.iterator(), intSet.iterator()))).toBe(true);

                    var r2 = RangeBitmap.fromTo(0, intSet.max()+1);
                    expect(intSet.intersection(r2).equals(intersectionOfOrderedIterators(r2.iterator(), intSet.iterator()))).toBe(true);

                });
            });

            it("Intersects with a partially overlapping or smaller RangeBitmap to produce a truncated subset", function() {
                bitmapForEachArray(function(array, intSet) {
                    if (array.length === 0) {
                        return;
                    }
                    var r1 = RangeBitmap.fromTo(0, intSet.min());
                    expect(intSet.intersection(r1).equals(intersectionOfOrderedIterators(r1.iterator(), intSet.iterator()))).toBe(true);

                    var r2 = RangeBitmap.fromTo(intSet.max(), intSet.max()+2);
                    expect(intSet.intersection(r2).equals(intersectionOfOrderedIterators(r2.iterator(), intSet.iterator()))).toBe(true);

                    if (intSet.size > 1) {
                        var r3 = RangeBitmap.fromTo(intSet.min()+1, intSet.max());
                        expect(intSet.intersection(r3).equals(intersectionOfOrderedIterators(r3.iterator(), intSet.iterator()))).toBe(true);
                    }
                    if (intSet.size > 2) {
                        var r4 = RangeBitmap.fromTo(intSet.min()+1, intSet.max()-1);
                        expect(intSet.intersection(r4).equals(intersectionOfOrderedIterators(r4.iterator(), intSet.iterator()))).toBe(true);
                    }
                });
            });

            it("Does a trivial union properly", function() {  // Less trivial cases are handled below
                var a1 = [    3,  5,   9 ];
                var a2 = [ 2,    5, 8    ];
                var au = [ 2, 3, 5, 8, 9 ];

                var set1 = bitmapClass.fromArray(a1);
                var set2 = bitmapClass.fromArray(a2);

                expect(set1.union(set2).size).toEqual(5);  // Hard coded, to keep other bugs from hiding failure
                expect(set1.union(set2).min()).toEqual(2);
                expect(set1.union(set2).max()).toEqual(9);
                expect(set1.union(set2)).toEqual(bitmapClass.fromArray(au));
                expect(set2.union(set1)).toEqual(bitmapClass.fromArray(au));

            });


            it("Does a trivial intersection properly", function() {  // Less trivial cases are handled below
                var a1 = [    3,  5, 8, 9 ];
                var a2 = [ 2,     5, 8    ];
                var ai = [        5, 8];

                var set1 = bitmapClass.fromArray(a1);
                var set2 = bitmapClass.fromArray(a2);

                expect(set1.intersection(set2).size).toEqual(2);  // Hard coded, to keep other bugs from hiding failure
                expect(set1.intersection(set2).min()).toEqual(5);
                expect(set1.intersection(set2).max()).toEqual(8);
                expect(set1.intersection(set2)).toEqual(bitmapClass.fromArray(ai));
                expect(set2.intersection(set1)).toEqual(bitmapClass.fromArray(ai));
            });

            for (var bitmapClassIndex1 = 0; bitmapClassIndex1 < bitmapClasses.length; bitmapClassIndex1++) {
                var bitmapClass1 = bitmapClasses[bitmapClassIndex1];
                describe("Interaction with "+bitmapClassIndex1+" "+bitmapClass1, function() {

                    var forEachArrayAndIntSet = function (onEach) {
                        bitmapForEachArray(function(array0, intSet0) {
                            for (var index1=0; index1< arrays.length; index1++) {
                                var array1 = arrays[index1];
                                var intSet1 = bitmapClass1.fromArray(array1);
                                onEach(array0, intSet0, array1, intSet1);
                            }
                        });
                    };

                    it("Intersects correctly", function() {
                        forEachArrayAndIntSet(function(array0, intSet0, array1, intSet1) {
                            var expected = intersectionOfOrderedIterators(intSet0.iterator(), intSet1.iterator());
                            expect(intSet0.intersection(intSet1).equals(expected)).toBe(true);
                        });
                    });

                    it("Unions correctly", function() {
                        forEachArrayAndIntSet(function(array0, intSet0, array1, intSet1) {
                            var expected = unionOfIterators(intSet0.iterator(), intSet1.iterator());
                            expect(intSet0.union(intSet1).equals(expected)).toBe(true);
                        });
                    });
                });
            }
        });
    }
});