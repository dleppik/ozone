/**
 * Copyright 2013-2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />


module ozone.intSet {

    /**
     * Implements all IntSet methods in terms of iterator().
     */
    export class AbstractIntSet implements IntSet {

        private  cachedMin : number = null;
        private  cachedMax : number = null;
        private cachedSize : number = null;

        private generateStats() {
            var max = Number.MIN_VALUE;
            var size = 0;

            var previous = -1;
            this.each(function(n) {
                previous = n;
                size++;
            });
            this.cachedSize = size;
            this.cachedMax = previous;
        }

        has(index: number) : boolean {
            var it = this.iterator();
            it.skipTo(index);
            return it.hasNext() && it.next() === index;
        }

        min() : number {
            if (this.cachedMin === null) {
                this.cachedMin = this.iterator().hasNext()  ?  this.iterator().next() : -1;
            }
            return this.cachedMin;
        }

        max() : number {
            if (this.cachedMax === null) {
                this.generateStats();
            }
            return this.cachedMax;
        }

        size() : number {
            if (this.cachedSize === null) {
                this.generateStats();
            }
            return this.cachedSize;
        }

        each(action: (p1:number)=>void) {
            var it = this.iterator();
            while (it.hasNext()) {
                var item = it.next();
                action(item);
            }
        }

        iterator() : ozone.OrderedIterator<number> {
            throw new Error("Subclasses must provide an implementation of iterator()");
        }

        union(bm: ozone.IntSet) : ozone.IntSet {
            return unionOfOrderedIterators(this.iterator(), bm.iterator());
        }

        intersection(set: ozone.IntSet) : ozone.IntSet {
            return intersectionOfOrderedIteratorsWithBuilder(
                bestBuilderForIntersection(this, set).builder(),
                [this.iterator(), set.iterator()]
            );
        }

        intersectionOfUnion(toUnion: ozone.IntSet[]) : ozone.IntSet {
            return ozone.intSet.intersectionOfUnionByIteration(this, toUnion);
        }

        equals(bm: ozone.IntSet):boolean {
            return equalIntSets(this, bm);
        }
    }
}