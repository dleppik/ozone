/**
 * Copyright 2013 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='_all.ts' />
module ozone {
    export class StoreProxy implements DataStore {

        constructor( public source : DataStore ) {
        }

        public fields(): Field<any>[] {
            return this.source.fields();
        }

        public field(key: string): Field<any> {
            return this.source.field(key);
        }

        eachRow(rowAction : (rowToken : any) => void) {
            this.source.eachRow(rowAction);
        }

    }
}
