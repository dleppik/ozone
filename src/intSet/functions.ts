/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc.  Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />


module ozone.intSet {

    export var empty : RangeIntSet;  // Initialized in RangeIntSet.ts

    export function asString(input : IntSet) { return JSON.stringify(toArray(input)); }

    export function toArray(input : IntSet) : number[] {
        var result = [];
        input.each(function(item ) { result.push(item) });
        return result;
    }

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
     * Return the default IntSet builder.  If min and max are provided, a builder optimized for that size may be returned.
     */
    export function builder(min : number = 0, max: number = -1) : Reducer<number,IntSet> {
        return BitmapArrayIntSet.builder();
    }

    export function mostEfficientIntSet(input : IntSet) : IntSet {
        if (input.size() == 0) {
            return empty;
        }
        if (input.max() - input.min() + 1 == input.size()) {
            return ozone.intSet.RangeIntSet.fromTo(input.min(), input.max());
        }

        // If the data is sparse, use an ArrayIndexIntSet, if it is dense, use BitmapArrayIntSet.
        // The values here are an educated guess, need to to some testing to optimize
        var builder : Reducer<number, IntSet>;
        var iterator = input.iterator();
        if ((input.max() - input.min() + 1) / input.size() > 128) {
            if (input instanceof ArrayIndexIntSet) {
                return input;
            }
            builder = ArrayIndexIntSet.builder(input.min(), input.max());
        }
        else {
            if (input instanceof BitmapArrayIntSet) {
                return input;
            }
            builder = BitmapArrayIntSet.builder(input.min(), input.max());
        }

        while (iterator.hasNext()) {
            builder.onItem(iterator.next());
        }

        return builder.onEnd();
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

    /** Return a IntSet containing all the numbers provided by the ordered iterators. This is more efficient
     * than unionOfIterators.  Returns the type of IntSet most appropriate for the size of the data.
     * */
    export function unionOfOrderedIterators(...iterators : OrderedIterator<number>[]) : IntSet {
        if (iterators.length===0) {
            return empty;
        }

        var builder = ozone.intSet.builder();
        var nexts : number[] = [];
        var previous : number = -1;
        var smallestIndex : number = 0;
        for (var i = 0; i < iterators.length; i++) {
            if (iterators[i].hasNext()) {
                nexts[i] = iterators[i].next();
                if (nexts[smallestIndex] == -1 || nexts[i] < nexts[smallestIndex]) {
                    smallestIndex = i;
                }
            }
            else {
                nexts[i] = -1;
            }
        }
        while (nexts[smallestIndex] >= 0) {
            if (nexts[smallestIndex] > previous) {
                builder.onItem(nexts[smallestIndex]);
                previous = nexts[smallestIndex];
            }
            nexts[smallestIndex] = iterators[smallestIndex].hasNext() ? iterators[smallestIndex].next() : -1;

            // Find the new smallest value in nexts
            smallestIndex = 0;
            for (var i = 0; i < nexts.length; i++) {
                if ((nexts[smallestIndex] == -1) || (nexts[i] != -1 && nexts[i] < nexts[smallestIndex])) {
                    smallestIndex = i;
                }
            }
        }
        return mostEfficientIntSet(builder.onEnd());
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
            return unionOfOrderedIterators(iterators[0]);  // The algorithm below assumes at least 2 iterators.
        }


        return mostEfficientIntSet(intersectionOfOrderedIteratorsWithBuilder(builder(), iterators));
    }

    export function intersectionOfOrderedIteratorsWithBuilder(builder : Reducer<number,IntSet>,
                                                   iterators : OrderedIterator<number>[]) : IntSet {
        if (iterators.length === 0) {
            return builder.onEnd();
        }


        // Cycle through the iterators round-robbin style, skipping to the highest element so far.  When we have N
        // iterators in a row giving us the same value, that element goes into the builder.
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

    /** Implementation of intersectionOfUnion that intersects each set in toUnion with container, then unions them. */
    export function intersectionOfUnionBySetOperations(container : IntSet, toUnion : IntSet[]) : IntSet {
        if (toUnion.length === 0) {
            return container;
        }
        var intersected : IntSet[] = [];
        for (var i=0; i<toUnion.length; i++) {
            intersected.push( container.intersection(toUnion[i]) );
        }
        var result = intersected[0];
        for (var i=1; i<intersected.length; i++) {
            result = result.union(intersected[i]);
        }
        return result;
    }

    /** Implementation of intersectionOfUnion that builds from iterators. */
    export function intersectionOfUnionByIteration(container : IntSet, toUnion : IntSet[]) : IntSet {
        if (toUnion.length === 0) {
            return container;
        }
        var containerIt = container.iterator();
        var toUnionIts : BufferedOrderedIterator<number>[] = [];
        for (var i=0; i<toUnion.length; i++) {
            toUnionIts.push(new BufferedOrderedIterator(toUnion[i].iterator()));
        }

        var builder = ozone.intSet.builder();
        while (containerIt.hasNext()) {
            var index : number = containerIt.next();
            var shouldInclude : boolean = toUnionIts.some(function(it) {
                it.skipTo(index);
                return it.hasNext() && it.peek() === index;
            });
            if (shouldInclude) {
                builder.onItem(index);
            }
        }
        return builder.onEnd();
    }

    export function equalIntSets(set1 : IntSet, set2 : IntSet) : boolean {
        if (set1===set2) {
            return true;
        }
        if (set1 instanceof RangeIntSet) {
            return set1.equals(set2);  // RangeIntSet has a nice quick implementation-independent equality check.
        }
        if (set2 instanceof RangeIntSet) {
            return set2.equals(set1);
        }
        if (set1.size() !== set2.size()  || set1.min() !== set2.min()  || set1.max() !== set2.max()) {
            return false;
        }
        if (set1.size()===0) {
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


    export function packedBitwiseCompare(set1 : PackedIntSet, set2 : PackedIntSet,
                                         bitwiseCompare : (word1 : number, word2 : number) => number,
                                         hasNextCompare : (next1 : boolean, next2 : boolean) => boolean,
                                         minPicker : (min1 : number, min2 : number) => number) : IntSet {
        //  When we get more packed types, might need to rethink this.
        if (set2.isPacked === true) {
            var myIterator      = set1.wordIterator();
            var otherIterator   = set2.wordIterator();
            var array : number[] = [];
            var currentWord : number;
            var size : number     = 0;

            var offset : number = minPicker(set1.minWord(), set2.minWord());
            myIterator.skipTo(offset);
            otherIterator.skipTo(offset);

            while (hasNextCompare(myIterator.hasNext(), otherIterator.hasNext())) {
                currentWord = bitwiseCompare(myIterator.next(), otherIterator.next());
                size += bits.countBits(currentWord);
                array.push(currentWord);
            }
            return mostEfficientIntSet(new BitmapArrayIntSet(array, offset, size));
        }
        return ozone.intSet.unionOfOrderedIterators(set1.iterator(), set2.iterator());
    }


}