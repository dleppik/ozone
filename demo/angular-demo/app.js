/**
 * Created by Erin Gaschott and Reilly Grant on 3/24/15.
 */

(function(){

    var app = angular.module('angularDemo', []);

    var filterCtrl;
    var dataCtrl;

    app.controller('FilterController',function(){
        this.fieldsForFilter=[];
        filterCtrl=this;

        this.processFields=function(fields){
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var selector = this.selectorForField(field);
                var values = field.valueList;
                var id = field.identifier;
                var name= field.displayName;
                var applied = false;
                this.fieldsForFilter.push({selector: selector,
                                            values : values,
                                            id     : id,
                                            applied: applied,
                                            name   : name});
            }
            return this.fieldsForFilter;
        };

        this.selectorForField=function(field){
                var selector;
                if (field.distinctValueEstimate() < 5) {
                    selector = "checkbox";
                    console.log("checkbox\n");
                }
                else if (field.distinctValueEstimate() < 100 ) {
                    selector = "drop-down menu";
                    console.log("drop-down menu\n");
                }
                else {
                    selector = "search field";
                    console.log("search field\n");
                }
            return selector;
        }


    });

    app.controller('DataController', [ '$http', function($http){
        dataCtrl = this;
        dataCtrl.nfdb = {}; // data that will not have filters applied
        this.db={};

        this.fields = [];
        this.recivedData=false;
        this.currentFilters= [];

        $http.get("../SummerOlympicMedals.json")
            .success(function(data){
                dataCtrl.nfdb = ozone.serialization.readStore(data);
                dataCtrl.fields = dataCtrl.nfdb.fields();
                dataCtrl.recivedData = true;
                dataCtrl.db = dataCtrl.nfdb;
                filterCtrl.processFields(dataCtrl.fields);
            });

        this.distinct = function(field){
            return field.distinctValueEstimate()+" distinct values.";
        };

        this.addFilter=function(identifier,value){
            this.currentFilters.push({ id:identifier, value:value });
        };

        this.occuranceValue = function(field,occurance) {
                return field.valueMap[occurance]["indexes"].length;
        };

        /*this.occuranceDisplay= function(field,occurance){
                return occurance + ",  "+ data.occuranceValue(field,occurance)
        }*/

        this.displayField=function(field){
            return field.displayName + " has " + this.distinct(field);
        };

        this.applyFilters= function() {
          if(this.recivedData){
              this.db=this.nfdb;
              var cFilters= this.currentFilters;
              for(var i=0;i<cFilters.length;i++) {
                  var cFilter= cFilters[i];
                  this.db = this.db.filter(cFilter.id, cFilter.value);
              }
          }
        };

    }]);


})();