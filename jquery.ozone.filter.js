/**
 * Create a filter toggle widget.  Takes an Ozone DB context, which the widget will modify whenever there is a change.
 * This is because Ozone databases are immutable, and filters are immutable views of the unfiltered database.
 *
 * Usage:
 *
 *     var dbContext = {
 *         db: myFilteredDatabase,
 *         onChange : function(oldDb, newDb) {
 *             alert("Filter was added or removed.");
 *             return true;  // To cancel the change, return false.
 *         }
 *     };
 *     $(".widgetContainer").ozoneFilterToggle( {
 *             ctx: dbContext,
  *            field: "Gender"  // Optional:  use this if you want to restrict the widget to a specific field
 *         });
 *
 *     console.log( "The context now has "dbContext.listeners.length +" listeners. " );  // Added itself to the listeners
 *
 *
 * Copyright 2014 by Vocal Laboratories, Inc. Shared under the Apache License 2.0.
 */

(function ($) {
    "use strict";

    $.fn.ozoneFilterToggle = function( argObject ) {
        var $els = this;

        var args = decorateArgs(argObject);

        $els.each(function() {
            reset(this, args);
        });
    };

    function decorateArgs(args) {
        var result = { ctx: args.ctx };
        result.field           = (args.hasOwnProperty("field"))           ? args.ctx.db.field(args.field) :  null;
        result.chooseFieldText = (args.hasOwnProperty("chooseFieldText")) ? args.chooseFieldText          : "Select a field";
        result.chooseValueText = (args.hasOwnProperty("chooseValueText")) ? args.chooseValueText          : "Select a value";
        return result;
    }

    function reset(el, args) {
        var $el = $(this);
        $el.data("ozoneContext", args.ctx);
        $el.html("");
        if (args.field === null) {
            throw new Error("Field selector not supported yet, please specify a field"); // TODO
        }
        else {
            resetValuePicker(el, args.field, args.ctx, args.chooseValueText);
        }
    }

    function resetValuePicker(el, field, ctx, chooseValueText) {
        var $values = $("<select class='valueFilter'></select>")
            .appendTo(el);

        $("<option></option>")
            .text(chooseValueText)
            .appendTo($values)
            .get(0).value = chooseValueText;  // Handle HTML escaping

        (function (values) {
            for (var valueIndex=0; valueIndex < values.length; valueIndex++) {
                var value = values[valueIndex];
                $("<option></option>")
                    .text(value)
                    .appendTo($values)
                    .get(0).value = ""+value;  // Handle HTML escaping
            }
            var filter = valueFilterForField(ctx.db, field);
            if (filter !== null) {
                $values.get(0).value = ""+filter.value;
            }
        })(field.values());


        $values.change(function() {
            // Remove all filters for the field, add one as needed.
            var oldFilters = ctx.db.filters();
            var newDb = ctx.db;
            for (var i=0; i<oldFilters.length; i++) {
                var filter = oldFilters[i];
                if (isValueFilterOnField(filter, field)) {
                    newDb = newDb.removeFilter(filter);
                }
            }
            var newValue = this.value;
            if (newValue !== chooseValueText) {
                newDb = newDb.filter(field, newValue);
            }
            changeDb(ctx, newDb);
        });
    }

    function isValueFilterOnField(filter, field) {
        return  (filter instanceof ozone.ValueFilter)
            &&  (filter.fieldDescriptor.identifier === field.identifier);
    }

    function valueFilterForField(db, field) {
        var filters = db.filters();
        for (var i=0; i<filters.length; i++) {
            var filter = filters[i];
            if (isValueFilterOnField(filter, field)) {
                return filter;
            }
        }
        return null;
    }


    function changeDb(ctx, newDb) {
        var oldDb = ctx.db;
        ctx.db = newDb;
        if (ctx.onChange) {
            if (ctx.onChange(oldDb, newDb) === false) {
                return;
            }
        }
        if (ctx.listeners) {
            for (var i=0; i<ctx.listeners.length; i++) {
                ctx.listeners[i].onOzoneChange(ctx, oldDb, newDb);
            }
        }
    }

    function isFilteredOnValue(db, field, value) {
        var currentFilters = db.filters();
        var filter = new ozone.ValueFilter(field, value);
        for (var i=0; i<currentFilters.length; i++) {
            var oldFilter = currentFilters[i];
            if (filter.equals(oldFilter)) {
                return true;
            }
        }
        return false;
    }

})( jQuery );