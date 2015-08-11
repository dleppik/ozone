/**
 * Copyright 2013-2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />


module ozone.intSet {

    /**
     * Wraps an Iterator to build an OrderedIterator.
     */
    export class SimpleOrderedIterator<I> implements OrderedIterator<I> {

        private nextItem: I;
        private hasNextItem: boolean;

        constructor(private iterator : Iterator<I>) {
            this.hasNextItem = iterator.hasNext();
            if (this.hasNextItem) {
                this.nextItem = iterator.next();
            }
        }

        hasNext() : boolean { return this.hasNextItem; }

        next() : I {
            var result = this.nextItem;
            this.hasNextItem = this.iterator.hasNext();
            this.nextItem = this.iterator.next();
            return result;
        }

        skipTo(item: I) {
            while(this.hasNext()  &&  this.nextItem < item) {
                this.next();
            }
        }
    }
}