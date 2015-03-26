/**
 * Created by Erin Gaschott and Reilly Grant on 3/24/15.
 */

(function(){

    var app = angular.module('angularDemo', []);

    var filterCtrl;
    var dataCtrl;

    app.controller('FilterController',function(){
        this.chosenFilters=[];
        filterCtrl=this;

        this.cantSubmit= function(){
            if(chosenFilters==[]){
                return true;
            }
            for(var i= 0; i<this.chosenFilters.length; i++ ){
                var chosenFilter= chosenFilters[i];
                if(chosenFilter.sValue===""){
                    return true;
                }
            }
            return false;
        };


        this.updateFilters= function(){
            dataCtrl.clearFilters();
            for(var i =0; i<this.chosenFilters.length;i++){
                var filterField=this.chosenFilters[i];
                if(filterField.applied){
                    dataCtrl.addFilter(filterField.id,filterField.sValue);
                }
            }
            dataCtrl.applyFilters();
        };

        this.processFields=function(fields){
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var selector = this.selectorForField(field);
                var values = field.valueList;
                var id = field.identifier;
                var name= field.displayName;
                var applied = false;
                this.chosenFilters.push({selector: selector,
                                            values : values,
                                            id     : id,
                                            applied: applied,
                                            name   : name,
                                            sValue : ""});
            }
            return this.chosenFilters;
        };

        this.selectorForField=function(field){
                var selector;
                if (field.distinctValueEstimate() < 5) {
                    selector = "checkbox";

                }
                else if (field.distinctValueEstimate() < 100 ) {
                    selector = "drop-down menu";

                }
                else {
                    selector = "search field";

                }
            return selector;
        }


    });

    app.controller('DataController', [ '$http', function($http){
        dataCtrl = this;
        dataCtrl.nfdb = {}; // data that will not have filters applied
        this.db={};
        this.counter=0;

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

        this.clearFilters=function(){
            this.db=this.nfdb;
            this.currentFilters=[];
        };

        this.occuranceValue = function(field,occurance) {
                return this.db.filter(field,occurance).size;
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
              this.fields= this.db.fields();
              this.counter++;
          }
        };



    }]);


})();