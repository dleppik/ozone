/**
 * Created by dleppik on 11/8/13.
 */

"use strict";

describe("Generic bitmap methods", function() {

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

    var bitmapClasses = [ ozone.columnStore.ArrayIndexBitmap ];

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
                        expect(ozone.columnStore.search(element, array, 0, array.length-1)).toEqual(~arrayIndex);
                    }
                    expect(ozone.columnStore.search(element, array, 0, array.length-1)).toEqual(arrayIndex);
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
                                console.log("skip to "+skipTo+", expectedNext = "+expectedNext+" on "+array);
                                expect(it.next()).toBe(expectedNext);
                            }
                        }
                    });
                });
            });

            it("Fails", function() {
                expect("true").toBeFalsy();
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
        });
    }
});