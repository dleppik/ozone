/**
 * Created by ecgaschott on 3/24/15.
 */

(function(){

    var app = angular.module('angularDemo', []);


    app.controller('DataController', function(){
        this.db = columnStore;
        this.distinct = function(field){
            return field.distinctValueEstimate()+" distinct values.";
        }

        this.occuranceValue = function(field,occurance) {
            if(field.valueMap)
                return field.valueMap[occurance]["indexes"].length;
            else return "Data is not indexed";
        }

    });



    var data =
        "name,   color, animal, pin\n"+
        "Alice,    red,    cow, 101\n"+
        "Bob,    green,    dog, 102\n"+
        "Chris,   blue,    cat, 103\n"+
        "Doug,     red,    rat, 104\n"+
        "Ellie,  green,    cow, 105\n"+
        "Frank,   blue,    dog, 106\n"+
        "Greg,     red,    cat, 107\n"+
        "Hubert, green,    rat, 108\n"+
        "George,  red,    rat, 109\n";

    var storeParams = {
        fields: {
            name: { class: ozone.columnStore.UnIndexedField },
            pin:  { class: ozone.columnStore.UnIndexedField,
                typeOfValue: "number",
                range: new ozone.Range(101, 108, true)
            }
        }
    };

    var    rowStore = ozone.rowStore.buildFromCsv(data);
    var columnStore = ozone.columnStore.buildFromStore( rowStore, storeParams );
    var   nameField = columnStore.field("name");
    var  colorField = columnStore.field("color");
    var animalField = columnStore.field("animal");
    var    pinField = columnStore.field("pin");

    var ValueFilter = ozone.ValueFilter;

})();