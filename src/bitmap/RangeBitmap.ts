/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.bitmap {

    /**
     * A trivial bitmap which contains all values in a range.
     */
    export class RangeBitmap implements Bitmap {

        public static emptyBitmap = new RangeBitmap(-1, 0);

        /** Return a RangeBitmap from minValue to maxValue inclusive. */
        public static fromTo(minValue : number, maxValue : number) : RangeBitmap {
            if (minValue === -1  && maxValue === -1) {
                return RangeBitmap.emptyBitmap;
            }
            var length = 1+maxValue-minValue;
            if (length <= 0) {
                return RangeBitmap.emptyBitmap;
            }
            if (maxValue < minValue) {
                throw new Error("Max "+maxValue+" < "+" min "+minValue);
            }
            if (minValue < 0) {
                throw new Error("Min must be at least 0 for non-empty bitmap, is "+minValue+" (to "+maxValue+")");
            }

            return new RangeBitmap(minValue, length);
        }

        constructor(private minValue : number, public size : number) {
            if (size===0) {
                this.minValue = -1;
            }
        }

        get(index:number):boolean {
            return this.size > 0  &&  index >= this.minValue  && index <= this.max();
        }

        min():number {
            return this.minValue;
        }

        max():number {
            if (this.size===0) {
                    return -1;
            }
            return this.minValue+(this.size-1);
        }

        each(action : (index : number) => void) {
            var max = this.max();
            for (var i=this.minValue; i<max; i++) {
                action(i);
            }
        }

        iterator() : OrderedIterator<number> {
            var index = this.minValue;
            var bm = this;
            var hasNext = function() {
                return bm.size > 0  && index <= bm.max();
            };

            return {
                hasNext : hasNext,
                next    : function() { return hasNext() ? index++  : undefined; },
                skipTo: function(i : number) { if (index < i)  index = i; }
            };
        }

        equals(bm : Bitmap) : boolean {
            // In the case of RangeBitmaps, we need only check min, max, and size
            // because size is a function of min and max.
            return this.size === bm.size  && this.min() === bm.min()  && this.max() === bm.max();
        }

        union(bm : Bitmap) : Bitmap {
            if (this.size===0) {
                return bm;
            }
            if (bm.size===0) {
                return this;
            }
            if (typeof(bm["unionWithRangeBitmap"]) === "function") {
                return bm["unionWithRangeBitmap"](this);
            }

            var lowBm = (this.min() < bm.min()) ? this : bm;

            if (bm instanceof RangeBitmap) {
                if (bm.min()===this.min() && bm.size===this.size) {
                    return this;
                }
                var highBm = (lowBm===this) ? bm : this;
                if (lowBm.max() >= highBm.min()) {
                    return RangeBitmap.fromTo(lowBm.min(), Math.max(lowBm.max(), highBm.max()));
                }
            }
            return ozone.bitmap.unionOfIterators(highBm.iterator(), lowBm.iterator());
        }

        intersection(bm : Bitmap) : Bitmap {
            if (this.size === 0 || bm.size === 0) {
                return RangeBitmap.emptyBitmap;
            }
            if (typeof(bm["intersectionWithRangeBitmap"]) === "function") {
                return bm["intersectionWithRangeBitmap"](this);
            }

            var min = Math.max(this.min(), bm.min());
            var max = Math.min(this.max(), bm.max());
            if (max < min) {
                return RangeBitmap.emptyBitmap;
            }
            if (bm instanceof RangeBitmap) {
                return RangeBitmap.fromTo(min, max);
            }
            return ozone.bitmap.intersectionOfOrderedIterators(this.iterator(), bm.iterator());
        }

        toString() {
            if (this.size===0) {
                return "empty";
            }
            return this.min()+"-"+this.max();
        }

    }
}