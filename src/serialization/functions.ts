/**
 * Copyright 2013-2014 by Vocal Laboratories, Inc. Distributed under the Apache License 2.0.
 */
/// <reference path='../_all.ts' />


/**
 * Convert ColumnStores, IntSets, etc. to JSON-compatible data objects.
 */
module ozone.serialization {

    /**
     * Convenience function for reading a string containing CSV.  This simply calls rowStore.buildFromCsv() and sends
     * the result to columnStore.buildFromStore().
     */
    export function buildFromCsv(csvText : string, metaData : any = {}) : columnStore.ColumnStore {
        return columnStore.buildFromStore(rowStore.buildFromCsv(csvText), metaData);
    }


    /** Read Ozone's native JSON format. */
    export function readStore(storeData : StoreData) : columnStore.ColumnStore {
        var fields = <RandomAccessField<any>[]> [];
        for (var i=0; i<storeData.fields.length; i++) {
            fields[i] = readField(storeData.fields[i]);
        }
        var sizeFieldId = storeData.sizeFieldId ? storeData.sizeFieldId : null;
        return new columnStore.ColumnStore(storeData.rowCount, fields, sizeFieldId);
    }

    export function writeStore(store : columnStore.ColumnStore) : StoreData {
        var fieldData = <FieldMetaData[]> [];
        var fields = store.fields();
        for (var i=0; i< fields.length; i++) {
            fieldData.push(writeField(fields[i]));
        }
        var result : StoreData = {
            rowCount : store.size(),
            fields   : fieldData
        };
        if (store.sizeField()) {
            result['sizeFieldId'] = store.sizeField().identifier;
        }
        return result;
    }

    export function readField(fieldData : FieldMetaData) : RandomAccessField<any> {
        var type = parseType(fieldData.type);
        if (type.subTypes.length > 0) {
            throw new Error("Don't support subtypes for "+fieldData.type);
        }
        switch(type.mainType) {
            case "indexed"   : return readIndexedField(<IndexedFieldData>     fieldData);
            case "unindexed" : return readUnIndexedField(<UnIndexedFieldData> fieldData);
            default          : throw new Error("Unknown field type: "+fieldData.type);
        }
    }

    function readIndexedField(data : IndexedFieldData) : RandomAccessField<any> {
        var descriptor = FieldDescriptor.build(data);
        var valueList : any[] = [];
        var valueMap = <{(valueId:string) : IntSet}> {};
        for (var i=0; i< data.values.length; i++) {
            var valueData = data.values[i];
            valueList.push(valueData.value);
            valueMap[valueData.value.toString()] = readIntSet(valueData.data);
        }
        return new ozone.columnStore.IndexedField(descriptor, valueList, valueMap);
    }


    function readUnIndexedField(data : UnIndexedFieldData) : RandomAccessField<any> {
        var descriptor = FieldDescriptor.build(data);
        return new columnStore.UnIndexedField(descriptor, data.dataArray, data.offset);
    }

    export function writeField(f : RandomAccessField<any>) : FieldMetaData {
        if (f instanceof columnStore.IndexedField)   return writeIndexedField(  <columnStore.IndexedField<any>>   f);
        if (f instanceof columnStore.UnIndexedField) return writeUnIndexedField(<columnStore.UnIndexedField<any>> f);
        throw new Error("Don't know how to write "+f.identifier);
    }

    function writeIndexedField(field : columnStore.IndexedField<any>) : IndexedFieldData {
        var result = writeIndexMetaData(field, "indexed");
        var values : ValueIndexData[] = [];
        var fieldValues = field.allValues();
        for (var i=0; i<fieldValues.length; i++) {
            var key = fieldValues[i];
            values[i] = {
                value: key,
                data : writeIntSet(field.intSetForValue(key.toString()))
            };
        }
        result['values'] = values;
        return <IndexedFieldData> result;
    }

    function writeUnIndexedField(field : columnStore.UnIndexedField<any>) : UnIndexedFieldData {
        var result = writeIndexMetaData(field, "unindexed");
        result['offset'] = field.firstRowToken();
        result['dataArray'] = field.dataArray();
        return <UnIndexedFieldData> result;
    }

    function writeIndexMetaData(f : RandomAccessField<any>, type: string) : FieldMetaData {
        var result = {
            type: type,
            identifier: f.identifier,
            displayName : f.displayName,
            typeOfValue : f.typeOfValue,
            distinctValueEstimate : f.distinctValueEstimate()
        };
        if (f.displayName === null) {
            result.displayName = f.identifier;
        }
        if (f.typeConstructor !== null) {
            result['typeConstructorName'] = f.typeConstructor.toString();
        }
        var range = f.range();
        if (range !== null) {
            result['range'] = range;
        }
        return result;
    }

    export function readIntSet( jsonData : any) : IntSet {
        //
        // Types generally mirror the IntSet implementations, but there is no requirement that they serialize
        // one-to-one.
        //

        if (jsonData.hasOwnProperty("type")) {
            var type = parseType(jsonData.type);
            if (type.subTypes.length > 0) {
                throw new Error("Unknown subtypes: "+type.subTypes);
            }
            switch (type.mainType) {
                case "array" : return intSet.ArrayIndexIntSet.fromArray(jsonData.data);
                case "empty" : return ozone.intSet.empty;
                case "range" : return intSet.RangeIntSet.fromTo(jsonData.min, jsonData.max);
                default: throw new Error("Unknown IntSet type: "+jsonData.type)
            }
        }
        throw new Error("IntSet type not specified");
    }

    export function writeIntSet( toWrite : IntSet ) : IntSetMetaData {
        if (toWrite.size() === 0)                  return writeEmptyIntSet(toWrite);
        if (toWrite instanceof intSet.RangeIntSet) return writeRangeIntSet(<intSet.RangeIntSet> toWrite);
        return writeIntSetArrayData(toWrite);
    }

    function writeEmptyIntSet(toWrite : IntSet) : IntSetMetaData {
        return { type: "empty"};  // Trivial function, but this provides compile-time type safety
    }

    function writeRangeIntSet(rangeIntSet : intSet.RangeIntSet) : IntSetRangeData {
        return {
            type : "range",
            min: rangeIntSet.min(),
            max: rangeIntSet.max()
        };
    }

    function writeIntSetArrayData(toWrite : IntSet) : IntSetArrayData {
        var array : number[] = [];
        if (toWrite instanceof intSet.ArrayIndexIntSet) {
            array = (<intSet.ArrayIndexIntSet> toWrite).toArray();
        }
        else {
            toWrite.each(value => { array.push(value) });
        }
        return {
            type: "array",
            data: array
        };
    }

    export function parseType( typeString : String) {
        var hintSplit = typeString.split(";");
        var nonHint = hintSplit[0];
        var hints = hintSplit.slice(1);

        var types = nonHint.split("/");
        var mainType = types[0];
        return new ParsedType(mainType, types.splice(1), hints);
    }

    export class ParsedType {
        constructor(
            public mainType: string,
            public subTypes : string[],
            public hints: string[])
        {}

        next() : ParsedType {
            if (this.subTypes.length === 0) {
                return null;
            }
            return new ParsedType(this.subTypes[0], this.subTypes.slice(1), this.hints);
        }
    }
}