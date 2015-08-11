/**
 * Copyright 2013-2015 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />


module ozone.intSet {

    /**
     * ASCII Run-Length Encoding IntSet:  a fairly compact ASCII representation of a bitmap.  Intended for use in JSON,
     * where data should be short and/or easily compressed.  Being simple enough to spot-check values is also desirable,
     * and since JSON files are likely to be transmitted in a compressed format, we focus on compressibility rather than
     * actual compactness.
     *
     * This is a quick, good-enough implementation that doesn't require WindowBase64.btoa() (not in IE 9 or Node.js)
     * or ArrayBuffer (not in IE 9).  As a result, this is likely to go away once we drop support for IE 9.  (We are
     * likely to be considerably slower than Microsoft in dropping IE 9 support.)
     *
     * Consists of a string of numbers; single digit numbers are written verbatim, while multi-digit numbers are in
     * parentheses.  The base of the numbers varies; ARLE-10 is base-10, useful for debugging, ARLE-36 is the most
     * compact. Thus, the ARLE-10 string '4(32)123(18)' yields the numbers [4, 32, 1, 2, 3, 18].
     *
     * Once the string of numbers is decoded, interpretation is simple run-length encoding: the first digit is the
     * number of 0's, the second is the number of 1's, and so on.  Thus, the ARLE-10 string '3211' yields the
     * little-endian bits 0001101, which in turn means that the IntSet consists of 3, 4, and 6.  Similarly, '0123'
     * yields bits 100111, and the IntSet consists of the numbers [0, 3, 4, 5].  Note that '0' should only occur as the
     * first character, where it indicates that the IntSet includes 0.  Because the bits should always end with a 1,
     * there is always an even number of run-length numbers.
     */
    export class ArleIntSet extends AbstractIntSet {

        public static builderWithBase(base) : Reducer<number,ArleIntSet> {
            var           data = "";
            var           done = false;
            var    lastWritten = -1;
            var       lastItem = -1;
            var numConsecutive =  0;

            var writeNumber = function(num : number) {
                var str = num.toString(base);
                data += (str.length === 1) ? str : "("+str+")";
            };

            var writePair = function(numFalse: number, numTrue: number) {
                writeNumber(numFalse);
                writeNumber(numTrue);
            };

            var numBlank = function() {
                var consecutiveStart = lastItem - numConsecutive + 1;
                return consecutiveStart - lastWritten - 1;
            };

            return <Reducer<number,ArleIntSet>> {
                onItem: function(item : number) {
                    if (done) {
                        throw new Error("Builder being called multiple times.");
                    }
                    if (lastItem === item-1  || lastItem === -1) {
                        numConsecutive++;
                    }
                    else {
                        writePair(numBlank(), numConsecutive);

                        numConsecutive = 1;
                        lastWritten = lastItem;
                    }
                    lastItem = item;
                },
                onEnd:  function() {
                    done = true;
                    if (lastItem === -1) {
                        return new ArleIntSet(base, "");
                    }
                    writePair(numBlank(), numConsecutive);
                    return new ArleIntSet(base, data);
                }
            };
        }

        public static builder(min : number = 0, max: number = -1, base: number = 36) : Reducer<number,IntSet> {
            return this.builderWithBase(base);
        }

        constructor(public base: number, public data : string) { super(); }

        /** Iterates over the run length numbers. */
        runLengthIterator() : Iterator<number> {
            var data = this.data;
            var base = this.base;
            var dataIndex = 0;
            var hasNext = () => {
                return dataIndex < data.length;
            };

            var nextRleNumber = () => {
                if (hasNext()) {
                    var ch = data.charAt(dataIndex);
                    dataIndex++;
                    var result = (ch === '(')  ?  readLongNumber()  :  parseInt(ch, base);
                    return result;
                }
            };

            var readLongNumber = () => {
                var str = "";
                var ch = "";
                while (hasNext() && ch !== ')') {
                    ch = data.charAt(dataIndex);
                    str += ch;
                    dataIndex++;
                }
                if (ch !== ')') {
                    throw new Error("Unterminated parentheses");
                }
                return parseInt(str, base);
            };

            return {
                hasNext: hasNext,
                next: nextRleNumber
            };
        }

        iterator() : OrderedIterator<number> {
            return new SimpleOrderedIterator(new RunLengthConversionIterator(this.runLengthIterator()));
        }
    }

    /** Translates run-length data into OrderedIterator data. */
    class RunLengthConversionIterator implements Iterator<number> {
        private previous = -1;
        private remainingTrues = 0;

        constructor(private runLengthIterator : Iterator<number>) {}

        hasNext() { return this.remainingTrues > 0  ||  this.runLengthIterator.hasNext(); }

        private readPair() {
            this.previous += this.runLengthIterator.next();       // Skip to the next true
            this.remainingTrues = this.runLengthIterator.next();  // the next true
        }

        next() : number {
            if (this.hasNext()) {
                if ( ! this.remainingTrues) {
                    this.readPair();
                }
                this.previous++;
                this.remainingTrues--;
                return this.previous;
            }
        }
    }
}