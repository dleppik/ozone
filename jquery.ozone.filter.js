/**
 * Create a filter toggle widget.  Takes an Ozone DB context, which the widget will modify whenever there is a change.
 * This is needed because Ozone databases are immutable, and filters are immutable views of the unfiltered database.
 *
 * Usage:
 *
 *     var dbContext = {
 *         db: myFilteredDatabaseView,
 *         onChange : function(oldDb, newDb) {
 *             alert("Filter was added or removed.");
 *             return true;  // To cancel the change, return false.
 *         }
 *     };
 *     $(".widgetContainer").ozoneFilterToggle( {
 *             ctx: dbContext,
 *             field: "Gender"  // Optional:  use this if you want to restrict the widget to a specific field
 *         });
 *
 *
 * Copyright 2014 by Vocal Laboratories, Inc. Shared under the Apache License 2.0.
 */

(function ($) {
    "use strict";

    $.fn.ozoneFilterWidget = function( argObject ) {
        var $els = this;

        var args = decorateArgs(argObject);

        $els.each(function() {
            reset(this, args);
        });
    };

    function decorateArgs(args) {
        var result = { ctx: args.ctx };
        result.field           = (args.hasOwnProperty("field"))           ? args.ctx.db.field(args.field) :  null;
        result.chooseFieldText = (args.hasOwnProperty("chooseFieldText")) ? args.chooseFieldText          : "Select a field to filter";
        result.chooseValueText = (args.hasOwnProperty("chooseValueText")) ? args.chooseValueText          : "Select a value";
        return result;
    }

    function reset(el, args) {
        var $el = $(this);
        $el.data("ozoneContext", args.ctx);

        var $widget = $("<div class='ozoneFilterWidget'></div>")
            .appendTo(el);
        if (args.field === null) {
            createFieldPicker($widget, args.ctx, args.chooseFieldText, args.chooseValueText);
        }
        else {
            createValuePicker($widget, args.field, args.ctx, args.chooseValueText);
        }
    }

    function createFieldPicker($widget, ctx, chooseFieldText, chooseValueText) {

        var $fieldsContainer = $("<div class='ozoneFilterFieldPickerContainer'></div>")
            .appendTo($widget);

        var $fields = $("<select class='ozoneFilterFieldPicker'></select>")
            .appendTo($fieldsContainer);

        var $valueList = $("<div class='ozoneFilterValuePickerList'></div>")
            .appendTo($widget);

        appendOption($fields, chooseFieldText);
        (function (fields) {
            for (var i=0; i<fields.length; i++) {
                var field = fields[i];
                appendOption($fields, field.displayName, field.identifier);

            }
        })( ctx.db.fields() );

        $fields.change(function() {
            var field = ctx.db.field(this.value);
            if (field) {
                var $valueContainer = $("<div class='ozoneFilterValueContainer'></div>")
                    .appendTo($valueList);
                $("<div class='ozoneFilterFieldName'></div>")
                    .text(field.displayName)
                    .appendTo($valueContainer);
                createValuePicker($valueContainer.get(0), field, ctx, chooseValueText);

                $("<div class='ozoneFilterFieldRemove'>Remove</div>")
                    .appendTo($valueContainer)
                    .click(function() {
                        var newDb = removeFiltersForField(ctx.db, field);
                        changeDb(ctx, newDb);
                        $valueContainer.remove();
                    });
                this.value = chooseFieldText;
            }
        });
    }



    function createValuePicker(el, field, ctx, chooseValueText) {
        var $values = $("<select class='ozoneFilterValuePicker'></select>")
            .appendTo(el);

        appendOption($values, chooseValueText);
        (function (values) {
            for (var valueIndex=0; valueIndex < values.length; valueIndex++) {
                var value = values[valueIndex];
                appendOption($values, value);
            }
        })(field.values());
        $values.get(0).value = chooseValueText;


        var oldSelectedValue = $values.get(0).value;
        if (oldSelectedValue===chooseValueText) {
            oldSelectedValue = null;
        }

        $values.change(function() {
            var newDb = (oldSelectedValue === null)
                ? ctx.db
                : ctx.db.removeFilter(new ozone.ValueFilter(field, oldSelectedValue));
            var newValue = this.value;
            if (newValue === chooseValueText) {
                oldSelectedValue = null;
            }
            else {
                newDb = newDb.filter(field, newValue);
                oldSelectedValue = newValue;
            }
            changeDb(ctx, newDb);
        });
    }

    function removeFiltersForField(db, field) {
        if (field === null) {
            return db;
        }
        var oldFilters = db.filters();
        var newDb = db;
        for (var i=0; i<oldFilters.length; i++) {
            var filter = oldFilters[i];
            if (isValueFilterOnField(filter, field)) {
                newDb = newDb.removeFilter(filter);
            }
        }
        return newDb;
    }

    /** Append an option element to a select element, with proper escaping. */
    function appendOption($select, text, value) {
        text = ""+text;
        if (typeof value === "undefined" || value===null) {
            value = text;
        }
        $("<option></option>")
            .text(""+text)
            .appendTo($select)
            .get(0).value = ""+value;
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
        if (oldDb === newDb) {
            return;
        }
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