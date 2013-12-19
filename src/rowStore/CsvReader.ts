/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />

module ozone.rowStore {

    /** Converts CSV into simple JavaScript objects for use by RowStore.  The first row must provide column names. */
    export class CsvReader implements Reducer<any,void> {

        public delimiter : string = ',';
        public quote : string = '"';
        public ignoreFirstRow = false;
        public columnNames : string[];
        private rowNumber = 0;

        constructor(parameters : any = {}) {
            for (var key in parameters) {
                if (parameters.hasOwnProperty(key)) {
                    this[key] = parameters[key];
                }
            }
            this.reset();
        }

        private reset() {
            this.columnNames = null;
            this.rowNumber = 0;
        }

        /** Resets, including forgetting the column names. */
        public onEnd() {
            this.reset();
        }


        public onItem(row : any) : any {
            this.rowNumber++;
            if (this.ignoreFirstRow  && this.rowNumber === 1) {
                return null;
            }

            var resultArray = this.lineToArray(row);
            if (resultArray===null) {
                return null;
            }
            if (this.columnNames===null  && resultArray !== null) {
                this.columnNames = resultArray;
                return null;
            }

            var result = {};
            var valuesFoundCount = 0;
            for (var i=0; i<this.columnNames.length && i<resultArray.length; i++) {
                var key : string = this.columnNames[i];
                var value : string = resultArray[i];
                if (value !== '') {
                    valuesFoundCount++;
                    result[key] = value;
                }
            }
            if (valuesFoundCount === 0) {
                return null;
            }
            return result;
        }


        private lineToArray(row : any) : string[] {
            var cells : string[] = [];
            var str = <string> row;
            var quoteCharCode = this.quote.charCodeAt(0);

            var pos = 0;

            var parseQuote = function() : string {
                pos++;
                var start = pos;
                for (; pos < str.length; pos++) {
                    if (str.charCodeAt(pos) === quoteCharCode) {
                        var soFar = str.substring(start, pos);
                        pos++;
                        if (str.charCodeAt(pos) === quoteCharCode) {
                            return soFar+'"'+parseQuote();
                        }
                        return soFar;
                    }
                }
                throw new Error("Line ended with unterminated quote.  Full line: "+str);
            };
            var skipWhitespace = function() {
                while (pos < str.length  &&  str.charAt(pos).match(/\s/)) {
                    pos++;
                }
            };


            parseCell: while (pos < str.length) {
                skipWhitespace();

                var start = pos;

                if (str.charAt(pos) === this.quote) {
                    cells.push(parseQuote());
                    skipWhitespace();
                    if (pos < str.length  &&  str.charAt(pos) !== this.delimiter) {
                        throw new Error("Expected ["+this.delimiter+"], got ["+str.charAt(pos)+"] in ["+str.substring(pos)+"]");
                    }
                    pos++;
                }
                else {
                    for (; pos < str.length; pos++) {
                        if (str.charAt(pos) === this.delimiter) {
                            str.substring(start, pos);
                            cells.push(str.substring(start, pos).trim());
                            pos++;
                            continue parseCell;
                        }
                    }
                    cells.push(str.substring(start).trim());
                }
            }
            return cells;
        }
   }
}