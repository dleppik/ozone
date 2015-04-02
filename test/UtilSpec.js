"use strict";

describe("BufferedOrderedIterator", function() {
    function iteratorForArray(a) {
        return new ozone.BufferedOrderedIterator( ozone.intSet.ArrayIndexIntSet.fromArray(a).iterator());
    }

    it("Iterates over an array", function() {
        var a = [2, 4, 6, 8, 10];
        var it = iteratorForArray(a);

        for (var i=0; i < a.length; i++) {
            var expected = a[i];
            expect( it.hasNext() ).toBe(true);
            expect( it.peek()    ).toEqual(expected);
            expect( it.next()    ).toEqual(expected);
        }
        expect(it.hasNext()).toBe(false);
    });

    it("Has undefined for peek on empty iterator", function() {
        expect( iteratorForArray([]).peek() ).toBeUndefined();
    });

    it("Can iterate via skip to current", function() {
        var a = [2, 4, 6, 8, 10];
        var it = iteratorForArray(a);
        for (var i=0; i < a.length; i++) {
            var expected = a[i];

            it.skipTo(expected);

            expect( it.hasNext() ).toBe(true);
            expect( it.peek()    ).toEqual(expected);
        }
        expect(it.hasNext()).toBe(true);
        it.next();
        expect(it.hasNext()).toBe(false);
    });

    it("Can iterate via skip to less than current", function() {
        var a = [2, 4, 6, 8, 10];
        var it = iteratorForArray(a);
        for (var i=0; i < a.length; i++) {
            var expected = a[i];

            it.skipTo(expected-1);

            expect( it.hasNext() ).toBe(true);
            expect( it.peek()    ).toEqual(expected);
        }
        expect(it.hasNext()).toBe(true);
        it.next();
        expect(it.hasNext()).toBe(false);
    });
});
