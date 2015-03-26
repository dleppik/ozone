/**
 * Created by Erin Gaschott and Reilly Grant on 3/24/15.
 */

(function(){

    var app = angular.module('angularDemo', []);

    app.controller('FilterController',function(){
        this.fieldsForFilter=[];

        this.proccessFields=function(fields){
            for(var i=0; i<fields.length;i++){
                var field=fields[i];
                var selector = selectorForField(field);
                var values = field.valueList;
                var id= field.identifier;
                var applied= false;
                this.fieldsForFilter.push({selector:selector,values:values,id:id, applied:applied});
            }
            return this.fieldsForFilter;
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
        var dataCtrl = this;
        dataCtrl.nfdb = {}; // data that will not have filters applied
        this.db={};

        this.fields = [];
        this.recivedData=false;
        this.currentFilters= [];

        $http.get("../SummerOlympicMedals.json")
            .success(function(data){
                dataCtrl.nfdb = ozone.serialization.readStore(data);
                dataCtrl.fields = dataCtrl.nfdb.fields();
                dataCtrl.recivedData=true;
                dataCtrl.db=dataCtrl.nfdb;

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