/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc.  Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />


module ozone.intSet {

    export var empty : RangeIntSet;  // Initialized in RangeIntSet.ts

    /**
     * A textbook binary search which returns the index where the item is found,
     * or two's complement of its insert location if it is not found.
     * Based on sample code from Oliver Caldwell at
     * http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
     *
     * but note that that implementation is buggy.
     */
    export function search(searchElement : any, array : any[], minIndex : number, maxIndex : number) : number {
        var currentIndex : number;
        var currentElement : any;

        if (maxIndex < 0 || array.length === 0) {
            return -1;
        }

        while (minIndex <= maxIndex) {
            currentIndex = (minIndex + maxIndex) / 2 | 0;
            currentElement = array[currentIndex];
            if (currentElement < searchElement) {
                minIndex = currentIndex + 1;
            }
            else if (currentElement > searchElement) {
                maxIndex = currentIndex - 1;
            }
            else {
                return currentIndex;
            }
        }
        return ~Math.max(minIndex, maxIndex);
    }

    /**
     * Return a IntSet builder.  If min and max are provided, a builder optimized for that size may be returned.
     */
    export function builder(min : number = 0, max: number = -1) : Reducer<number,IntSet> {
        return ArrayIndexIntSet.builder();
    }

    /** Return a IntSet containing all the numbers provided by the iterators. */
    export function unionOfIterators(...iterators : Iterator<number>[]) : IntSet {
        if (iterators.length===0) {
            return empty;
        }

        var values : number[] = [];
        for (var i=0; i<iterators.length; i++) {
            var it = iterators[i];
            while (it.hasNext()) {
                values.push(it.next());
            }
        }
        if (values.length===0) {
            return empty;
        }

        values.sort(function(a,b) { return a-b; });  // Default sort function is alphabetical

        var builder = ozone.intSet.builder(values[0], values[values.length-1]);
        var lastValue : number = NaN;
        for (i=0; i<values.length; i++) {
            var val = values[i];
            if (val !== lastValue) {
                builder.onItem(val);
                lastValue = val;
            }
        }
        return builder.onEnd();
    }

    export function unionOfIntSets(...intSets : IntSet[]) : IntSet {
        if (intSets.length === 0) {
            return empty;
        }

        var result = intSets[0];
        for (var i=1; i<intSets.length; i++) {
            result = result.union(intSets[i]);
        }
        return result;
    }

    /** Return a IntSet containing only the numbers provided by all of the iterators. */
    export function intersectionOfOrderedIterators(...iterators : OrderedIterator<number>[]) : IntSet {
        if (iterators.length === 0) {
            return empty;
        }
        if (iterators.length === 1) {
            return unionOfIterators(iterators[0]);  // The algorithm below assumes at least 2 iterators.
        }

        // Cycle through the iterators round-robbin style, skipping to the highest element so far.  When we have N
        // iterators in a row giving us the same value, that element goes into the builder.

        var builder = ArrayIndexIntSet.builder();
        var currentIteratorIndex = 0;
        var numIteratorsWithCurrentValue = 1; // Always start with 1, for the current iterator
        var previousValue : number = NaN;
        var it = iterators[currentIteratorIndex];

        while (it.hasNext()) {
            var currentValue = it.next();
            if (currentValue === previousValue) {
                numIteratorsWithCurrentValue++;
                if (numIteratorsWithCurrentValue === iterators.length) {
                    builder.onItem(currentValue);
                }
            }
            else {
                previousValue = currentValue;
                numIteratorsWithCurrentValue = 1;  // Always start with 1, for the current iterator
            }
            currentIteratorIndex = (currentIteratorIndex+1) % iterators.length;
            it = iterators[currentIteratorIndex];
            it.skipTo(currentValue);
        }
        return builder.onEnd();
    }

    export function intersectionOfIntSets(...intSets : IntSet[]) : IntSet {
        if (intSets.length === 0) {
            return empty;
        }

        // Eventually we may want to do something more clever, such as sort by length or type

        var result = intSets[0];
        for (var i=1; i<intSets.length; i++) {
            result = result.intersection(intSets[i]);
        }
        return result;
    }

    export function equalIntSets(set1 : IntSet, set2 : IntSet) : boolean {
        if (set1===set2) {
            return true;
        }
        if (set1 instanceof RangeIntSet) {
            return set1.equals(set2);
        }
        if (set2 instanceof RangeIntSet) {
            return set2.equals(set1);
        }
        if (set1.size !== set2.size  || set1.min() !== set2.min()  || set1.max() !== set2.max()) {
            return false;
        }
        if (set1.size===0) {
            return true;  // both empty
        }

        var it1 = set1.iterator();
        var it2 = set2.iterator();

        while(it1.hasNext()) {
            if (it1.next() != it2.next()) {
                return false;
            }
        }
        return true;
    }

}