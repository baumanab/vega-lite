"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Utility files for producing Vega ValueRef for marks
 */
var channel_1 = require("../../channel");
var fielddef_1 = require("../../fielddef");
var scale_1 = require("../../scale");
var util_1 = require("../../util");
var common_1 = require("../common");
// TODO: we need to find a way to refactor these so that scaleName is a part of scale
// but that's complicated.  For now, this is a huge step moving forward.
/**
 * @return Vega ValueRef for stackable x or y
 */
function stackable(channel, channelDef, scaleName, scale, stack, defaultRef) {
    if (fielddef_1.isFieldDef(channelDef) && stack && channel === stack.fieldChannel) {
        // x or y use stack_end so that stacked line's point mark use stack_end too.
        return fieldRef(channelDef, scaleName, { suffix: 'end' });
    }
    return midPoint(channel, channelDef, scaleName, scale, stack, defaultRef);
}
exports.stackable = stackable;
/**
 * @return Vega ValueRef for stackable x2 or y2
 */
function stackable2(channel, aFieldDef, a2fieldDef, scaleName, scale, stack, defaultRef) {
    if (fielddef_1.isFieldDef(aFieldDef) && stack &&
        // If fieldChannel is X and channel is X2 (or Y and Y2)
        channel.charAt(0) === stack.fieldChannel.charAt(0)) {
        return fieldRef(aFieldDef, scaleName, { suffix: 'start' });
    }
    return midPoint(channel, a2fieldDef, scaleName, scale, stack, defaultRef);
}
exports.stackable2 = stackable2;
/**
 * Value Ref for binned fields
 */
function bin(fieldDef, scaleName, side, offset) {
    var binSuffix = side === 'start' ? undefined : 'end';
    return fieldRef(fieldDef, scaleName, { binSuffix: binSuffix }, offset ? { offset: offset } : {});
}
exports.bin = bin;
function fieldRef(fieldDef, scaleName, opt, mixins) {
    var ref = {
        scale: scaleName,
        field: fielddef_1.field(fieldDef, opt),
    };
    if (mixins) {
        return __assign({}, ref, mixins);
    }
    return ref;
}
exports.fieldRef = fieldRef;
function band(scaleName, band) {
    if (band === void 0) { band = true; }
    return {
        scale: scaleName,
        band: band
    };
}
exports.band = band;
/**
 * Signal that returns the middle of a bin. Should only be used with x and y.
 */
function binMidSignal(fieldDef, scaleName) {
    return {
        signal: "(" +
            ("scale(\"" + scaleName + "\", " + fielddef_1.field(fieldDef, { expr: 'datum' }) + ")") +
            " + " +
            ("scale(\"" + scaleName + "\", " + fielddef_1.field(fieldDef, { binSuffix: 'end', expr: 'datum' }) + ")") +
            ")/2"
    };
}
/**
 * @returns {VgValueRef} Value Ref for xc / yc or mid point for other channels.
 */
function midPoint(channel, channelDef, scaleName, scale, stack, defaultRef) {
    // TODO: datum support
    if (channelDef) {
        /* istanbul ignore else */
        if (fielddef_1.isFieldDef(channelDef)) {
            if (channelDef.bin) {
                // Use middle only for x an y to place marks in the center between start and end of the bin range.
                // We do not use the mid point for other channels (e.g. size) so that properties of legends and marks match.
                if (util_1.contains(['x', 'y'], channel) && channelDef.type === 'quantitative') {
                    if (stack && stack.impute) {
                        // For stack, we computed bin_mid so we can impute.
                        return fieldRef(channelDef, scaleName, { binSuffix: 'mid' });
                    }
                    // For non-stack, we can just calculate bin mid on the fly using signal.
                    return binMidSignal(channelDef, scaleName);
                }
                return fieldRef(channelDef, scaleName, common_1.binRequiresRange(channelDef, channel) ? { binSuffix: 'range' } : {});
            }
            var scaleType = scale.get('type');
            if (scale_1.hasDiscreteDomain(scaleType)) {
                if (scaleType === 'band') {
                    // For band, to get mid point, need to offset by half of the band
                    return fieldRef(channelDef, scaleName, { binSuffix: 'range' }, { band: 0.5 });
                }
                return fieldRef(channelDef, scaleName, { binSuffix: 'range' });
            }
            else {
                return fieldRef(channelDef, scaleName, {}); // no need for bin suffix
            }
        }
        else if (fielddef_1.isValueDef(channelDef)) {
            return { value: channelDef.value };
        }
        else {
            return undefined;
        }
    }
    if (defaultRef === 'zeroOrMin') {
        /* istanbul ignore else */
        if (channel === channel_1.X || channel === channel_1.X2) {
            return zeroOrMinX(scaleName, scale);
        }
        else if (channel === channel_1.Y || channel === channel_1.Y2) {
            return zeroOrMinY(scaleName, scale);
        }
        else {
            throw new Error("Unsupported channel " + channel + " for base function"); // FIXME add this to log.message
        }
    }
    else if (defaultRef === 'zeroOrMax') {
        /* istanbul ignore else */
        if (channel === channel_1.X || channel === channel_1.X2) {
            return zeroOrMaxX(scaleName, scale);
        }
        else if (channel === channel_1.Y || channel === channel_1.Y2) {
            return zeroOrMaxY(scaleName, scale);
        }
        else {
            throw new Error("Unsupported channel " + channel + " for base function"); // FIXME add this to log.message
        }
    }
    return defaultRef;
}
exports.midPoint = midPoint;
function text(textDef, config) {
    // text
    if (textDef) {
        if (fielddef_1.isFieldDef(textDef)) {
            return common_1.formatSignalRef(textDef, textDef.format, 'datum', config);
        }
        else if (fielddef_1.isValueDef(textDef)) {
            return { value: textDef.value };
        }
    }
    return undefined;
}
exports.text = text;
function mid(sizeRef) {
    return __assign({}, sizeRef, { mult: 0.5 });
}
exports.mid = mid;
function zeroOrMinX(scaleName, scale) {
    if (scaleName) {
        // Log / Time / UTC scale do not support zero
        if (!util_1.contains([scale_1.ScaleType.LOG, scale_1.ScaleType.TIME, scale_1.ScaleType.UTC], scale.get('type')) &&
            scale.get('zero') !== false) {
            return {
                scale: scaleName,
                value: 0
            };
        }
    }
    // Put the mark on the x-axis
    return { value: 0 };
}
/**
 * @returns {VgValueRef} base value if scale exists and return max value if scale does not exist
 */
function zeroOrMaxX(scaleName, scale) {
    if (scaleName) {
        // Log / Time / UTC scale do not support zero
        if (!util_1.contains([scale_1.ScaleType.LOG, scale_1.ScaleType.TIME, scale_1.ScaleType.UTC], scale.get('type')) &&
            scale.get('zero') !== false) {
            return {
                scale: scaleName,
                value: 0
            };
        }
    }
    return { field: { group: 'width' } };
}
function zeroOrMinY(scaleName, scale) {
    if (scaleName) {
        // Log / Time / UTC scale do not support zero
        if (!util_1.contains([scale_1.ScaleType.LOG, scale_1.ScaleType.TIME, scale_1.ScaleType.UTC], scale.get('type')) &&
            scale.get('zero') !== false) {
            return {
                scale: scaleName,
                value: 0
            };
        }
    }
    // Put the mark on the y-axis
    return { field: { group: 'height' } };
}
/**
 * @returns {VgValueRef} base value if scale exists and return max value if scale does not exist
 */
function zeroOrMaxY(scaleName, scale) {
    if (scaleName) {
        // Log / Time / UTC scale do not support zero
        if (!util_1.contains([scale_1.ScaleType.LOG, scale_1.ScaleType.TIME, scale_1.ScaleType.UTC], scale.get('type')) &&
            scale.get('zero') !== false) {
            return {
                scale: scaleName,
                value: 0
            };
        }
    }
    // Put the mark on the y-axis
    return { value: 0 };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsdWVyZWYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY29tcGlsZS9tYXJrL3ZhbHVlcmVmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7R0FFRztBQUNILHlDQUFvRDtBQUVwRCwyQ0FTd0I7QUFDeEIscUNBQXlEO0FBRXpELG1DQUFvQztBQUVwQyxvQ0FBNEQ7QUFJNUQscUZBQXFGO0FBQ3JGLHdFQUF3RTtBQUV4RTs7R0FFRztBQUNILG1CQUEwQixPQUFrQixFQUFFLFVBQThCLEVBQUUsU0FBaUIsRUFBRSxLQUFxQixFQUNsSCxLQUFzQixFQUFFLFVBQWtEO0lBQzVFLEVBQUUsQ0FBQyxDQUFDLHFCQUFVLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUN0RSw0RUFBNEU7UUFDNUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUNELE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztBQUM1RSxDQUFDO0FBUEQsOEJBT0M7QUFFRDs7R0FFRztBQUNILG9CQUEyQixPQUFvQixFQUFFLFNBQTZCLEVBQUUsVUFBOEIsRUFBRSxTQUFpQixFQUFFLEtBQXFCLEVBQ3BKLEtBQXNCLEVBQUUsVUFBa0Q7SUFDNUUsRUFBRSxDQUFDLENBQUMscUJBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLO1FBQzlCLHVEQUF1RDtRQUN2RCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDakQsQ0FBQyxDQUFDLENBQUM7UUFD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Q0FBQztnQkFDTCxLQUFLLEVBQUUsU0FBUztnQkFDaEIsS0FBSyxFQUFFLENBQUM7YUFDVCxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFDRCw2QkFBNkI7SUFDN0IsTUFBTSxDQUFDLEVBQUMsS0FBSyxFQUFFLEVBQUMsS0FBSyxFQUFFLFFBQVEsRUFBQyxFQUFDLENBQUM7QUFDcEMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsb0JBQW9CLFNBQWlCLEVBQUUsS0FBcUI7SUFDMUQsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNkLDZDQUE2QztRQUM3QyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQVEsQ0FBQyxDQUFDLGlCQUFTLENBQUMsR0FBRyxFQUFFLGlCQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5RSxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFFOUIsTUFBTSxDQUFDO2dCQUNMLEtBQUssRUFBRSxTQUFTO2dCQUNoQixLQUFLLEVBQUUsQ0FBQzthQUNULENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztJQUNELDZCQUE2QjtJQUM3QixNQUFNLENBQUMsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXRpbGl0eSBmaWxlcyBmb3IgcHJvZHVjaW5nIFZlZ2EgVmFsdWVSZWYgZm9yIG1hcmtzXG4gKi9cbmltcG9ydCB7Q2hhbm5lbCwgWCwgWDIsIFksIFkyfSBmcm9tICcuLi8uLi9jaGFubmVsJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuLi8uLi9jb25maWcnO1xuaW1wb3J0IHtcbiAgQ2hhbm5lbERlZixcbiAgQ2hhbm5lbERlZldpdGhDb25kaXRpb24sXG4gIGZpZWxkLFxuICBGaWVsZERlZixcbiAgRmllbGRSZWZPcHRpb24sXG4gIGlzRmllbGREZWYsXG4gIGlzVmFsdWVEZWYsXG4gIFRleHRGaWVsZERlZixcbn0gZnJvbSAnLi4vLi4vZmllbGRkZWYnO1xuaW1wb3J0IHtoYXNEaXNjcmV0ZURvbWFpbiwgU2NhbGVUeXBlfSBmcm9tICcuLi8uLi9zY2FsZSc7XG5pbXBvcnQge1N0YWNrUHJvcGVydGllc30gZnJvbSAnLi4vLi4vc3RhY2snO1xuaW1wb3J0IHtjb250YWluc30gZnJvbSAnLi4vLi4vdXRpbCc7XG5pbXBvcnQge1ZnU2lnbmFsUmVmLCBWZ1ZhbHVlUmVmfSBmcm9tICcuLi8uLi92ZWdhLnNjaGVtYSc7XG5pbXBvcnQge2JpblJlcXVpcmVzUmFuZ2UsIGZvcm1hdFNpZ25hbFJlZn0gZnJvbSAnLi4vY29tbW9uJztcbmltcG9ydCB7U2NhbGVDb21wb25lbnR9IGZyb20gJy4uL3NjYWxlL2NvbXBvbmVudCc7XG5cblxuLy8gVE9ETzogd2UgbmVlZCB0byBmaW5kIGEgd2F5IHRvIHJlZmFjdG9yIHRoZXNlIHNvIHRoYXQgc2NhbGVOYW1lIGlzIGEgcGFydCBvZiBzY2FsZVxuLy8gYnV0IHRoYXQncyBjb21wbGljYXRlZC4gIEZvciBub3csIHRoaXMgaXMgYSBodWdlIHN0ZXAgbW92aW5nIGZvcndhcmQuXG5cbi8qKlxuICogQHJldHVybiBWZWdhIFZhbHVlUmVmIGZvciBzdGFja2FibGUgeCBvciB5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFja2FibGUoY2hhbm5lbDogJ3gnIHwgJ3knLCBjaGFubmVsRGVmOiBDaGFubmVsRGVmPHN0cmluZz4sIHNjYWxlTmFtZTogc3RyaW5nLCBzY2FsZTogU2NhbGVDb21wb25lbnQsXG4gICAgc3RhY2s6IFN0YWNrUHJvcGVydGllcywgZGVmYXVsdFJlZjogVmdWYWx1ZVJlZiB8ICd6ZXJvT3JNaW4nIHwgJ3plcm9Pck1heCcpOiBWZ1ZhbHVlUmVmIHtcbiAgaWYgKGlzRmllbGREZWYoY2hhbm5lbERlZikgJiYgc3RhY2sgJiYgY2hhbm5lbCA9PT0gc3RhY2suZmllbGRDaGFubmVsKSB7XG4gICAgLy8geCBvciB5IHVzZSBzdGFja19lbmQgc28gdGhhdCBzdGFja2VkIGxpbmUncyBwb2ludCBtYXJrIHVzZSBzdGFja19lbmQgdG9vLlxuICAgIHJldHVybiBmaWVsZFJlZihjaGFubmVsRGVmLCBzY2FsZU5hbWUsIHtzdWZmaXg6ICdlbmQnfSk7XG4gIH1cbiAgcmV0dXJuIG1pZFBvaW50KGNoYW5uZWwsIGNoYW5uZWxEZWYsIHNjYWxlTmFtZSwgc2NhbGUsIHN0YWNrLCBkZWZhdWx0UmVmKTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIFZlZ2EgVmFsdWVSZWYgZm9yIHN0YWNrYWJsZSB4MiBvciB5MlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhY2thYmxlMihjaGFubmVsOiAneDInIHwgJ3kyJywgYUZpZWxkRGVmOiBDaGFubmVsRGVmPHN0cmluZz4sIGEyZmllbGREZWY6IENoYW5uZWxEZWY8c3RyaW5nPiwgc2NhbGVOYW1lOiBzdHJpbmcsIHNjYWxlOiBTY2FsZUNvbXBvbmVudCxcbiAgICBzdGFjazogU3RhY2tQcm9wZXJ0aWVzLCBkZWZhdWx0UmVmOiBWZ1ZhbHVlUmVmIHwgJ3plcm9Pck1pbicgfCAnemVyb09yTWF4Jyk6IFZnVmFsdWVSZWYge1xuICBpZiAoaXNGaWVsZERlZihhRmllbGREZWYpICYmIHN0YWNrICYmXG4gICAgICAvLyBJZiBmaWVsZENoYW5uZWwgaXMgWCBhbmQgY2hhbm5lbCBpcyBYMiAob3IgWSBhbmQgWTIpXG4gICAgICBjaGFubmVsLmNoYXJBdCgwKSA9PT0gc3RhY2suZmllbGRDaGFubmVsLmNoYXJBdCgwKVxuICAgICAgKSB7XG4gICAgcmV0dXJuIGZpZWxkUmVmKGFGaWVsZERlZiwgc2NhbGVOYW1lLCB7c3VmZml4OiAnc3RhcnQnfSk7XG4gIH1cbiAgcmV0dXJuIG1pZFBvaW50KGNoYW5uZWwsIGEyZmllbGREZWYsIHNjYWxlTmFtZSwgc2NhbGUsIHN0YWNrLCBkZWZhdWx0UmVmKTtcbn1cblxuLyoqXG4gKiBWYWx1ZSBSZWYgZm9yIGJpbm5lZCBmaWVsZHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbihmaWVsZERlZjogRmllbGREZWY8c3RyaW5nPiwgc2NhbGVOYW1lOiBzdHJpbmcsIHNpZGU6ICdzdGFydCcgfCAnZW5kJywgb2Zmc2V0PzogbnVtYmVyKSB7XG4gIGNvbnN0IGJpblN1ZmZpeCA9IHNpZGUgPT09ICdzdGFydCcgPyB1bmRlZmluZWQgOiAnZW5kJztcbiAgcmV0dXJuIGZpZWxkUmVmKGZpZWxkRGVmLCBzY2FsZU5hbWUsIHtiaW5TdWZmaXh9LCBvZmZzZXQgPyB7b2Zmc2V0fSA6IHt9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpZWxkUmVmKFxuICAgIGZpZWxkRGVmOiBGaWVsZERlZjxzdHJpbmc+LCBzY2FsZU5hbWU6IHN0cmluZywgb3B0OiBGaWVsZFJlZk9wdGlvbixcbiAgICBtaXhpbnM/OiB7b2Zmc2V0PzogbnVtYmVyIHwgVmdWYWx1ZVJlZiwgYmFuZD86IG51bWJlcnxib29sZWFufVxuICApOiBWZ1ZhbHVlUmVmIHtcbiAgY29uc3QgcmVmOiBWZ1ZhbHVlUmVmID0ge1xuICAgIHNjYWxlOiBzY2FsZU5hbWUsXG4gICAgZmllbGQ6IGZpZWxkKGZpZWxkRGVmLCBvcHQpLFxuICB9O1xuICBpZiAobWl4aW5zKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnJlZixcbiAgICAgIC4uLm1peGluc1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHJlZjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJhbmQoc2NhbGVOYW1lOiBzdHJpbmcsIGJhbmQ6IG51bWJlcnxib29sZWFuID0gdHJ1ZSk6IFZnVmFsdWVSZWYge1xuICByZXR1cm4ge1xuICAgIHNjYWxlOiBzY2FsZU5hbWUsXG4gICAgYmFuZDogYmFuZFxuICB9O1xufVxuXG4vKipcbiAqIFNpZ25hbCB0aGF0IHJldHVybnMgdGhlIG1pZGRsZSBvZiBhIGJpbi4gU2hvdWxkIG9ubHkgYmUgdXNlZCB3aXRoIHggYW5kIHkuXG4gKi9cbmZ1bmN0aW9uIGJpbk1pZFNpZ25hbChmaWVsZERlZjogRmllbGREZWY8c3RyaW5nPiwgc2NhbGVOYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHtcbiAgICBzaWduYWw6IGAoYCArXG4gICAgICBgc2NhbGUoXCIke3NjYWxlTmFtZX1cIiwgJHtmaWVsZChmaWVsZERlZiwge2V4cHI6ICdkYXR1bSd9KX0pYCArXG4gICAgICBgICsgYCArXG4gICAgICBgc2NhbGUoXCIke3NjYWxlTmFtZX1cIiwgJHtmaWVsZChmaWVsZERlZiwge2JpblN1ZmZpeDogJ2VuZCcsIGV4cHI6ICdkYXR1bSd9KX0pYCtcbiAgICBgKS8yYFxuICB9O1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHtWZ1ZhbHVlUmVmfSBWYWx1ZSBSZWYgZm9yIHhjIC8geWMgb3IgbWlkIHBvaW50IGZvciBvdGhlciBjaGFubmVscy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1pZFBvaW50KGNoYW5uZWw6IENoYW5uZWwsIGNoYW5uZWxEZWY6IENoYW5uZWxEZWY8c3RyaW5nPiwgc2NhbGVOYW1lOiBzdHJpbmcsIHNjYWxlOiBTY2FsZUNvbXBvbmVudCwgc3RhY2s6IFN0YWNrUHJvcGVydGllcyxcbiAgZGVmYXVsdFJlZjogVmdWYWx1ZVJlZiB8ICd6ZXJvT3JNaW4nIHwgJ3plcm9Pck1heCcsKTogVmdWYWx1ZVJlZiB7XG4gIC8vIFRPRE86IGRhdHVtIHN1cHBvcnRcblxuICBpZiAoY2hhbm5lbERlZikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG5cbiAgICBpZiAoaXNGaWVsZERlZihjaGFubmVsRGVmKSkge1xuICAgICAgaWYgKGNoYW5uZWxEZWYuYmluKSB7XG4gICAgICAgIC8vIFVzZSBtaWRkbGUgb25seSBmb3IgeCBhbiB5IHRvIHBsYWNlIG1hcmtzIGluIHRoZSBjZW50ZXIgYmV0d2VlbiBzdGFydCBhbmQgZW5kIG9mIHRoZSBiaW4gcmFuZ2UuXG4gICAgICAgIC8vIFdlIGRvIG5vdCB1c2UgdGhlIG1pZCBwb2ludCBmb3Igb3RoZXIgY2hhbm5lbHMgKGUuZy4gc2l6ZSkgc28gdGhhdCBwcm9wZXJ0aWVzIG9mIGxlZ2VuZHMgYW5kIG1hcmtzIG1hdGNoLlxuICAgICAgICBpZiAoY29udGFpbnMoWyd4JywgJ3knXSwgY2hhbm5lbCkgJiYgY2hhbm5lbERlZi50eXBlID09PSAncXVhbnRpdGF0aXZlJykge1xuICAgICAgICAgIGlmIChzdGFjayAmJiBzdGFjay5pbXB1dGUpIHtcbiAgICAgICAgICAgIC8vIEZvciBzdGFjaywgd2UgY29tcHV0ZWQgYmluX21pZCBzbyB3ZSBjYW4gaW1wdXRlLlxuICAgICAgICAgICAgcmV0dXJuIGZpZWxkUmVmKGNoYW5uZWxEZWYsIHNjYWxlTmFtZSwge2JpblN1ZmZpeDogJ21pZCd9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gRm9yIG5vbi1zdGFjaywgd2UgY2FuIGp1c3QgY2FsY3VsYXRlIGJpbiBtaWQgb24gdGhlIGZseSB1c2luZyBzaWduYWwuXG4gICAgICAgICAgcmV0dXJuIGJpbk1pZFNpZ25hbChjaGFubmVsRGVmLCBzY2FsZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWVsZFJlZihjaGFubmVsRGVmLCBzY2FsZU5hbWUsIGJpblJlcXVpcmVzUmFuZ2UoY2hhbm5lbERlZiwgY2hhbm5lbCkgPyB7YmluU3VmZml4OiAncmFuZ2UnfSA6IHt9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2NhbGVUeXBlID0gc2NhbGUuZ2V0KCd0eXBlJyk7XG4gICAgICBpZiAoaGFzRGlzY3JldGVEb21haW4oc2NhbGVUeXBlKSkge1xuICAgICAgICBpZiAoc2NhbGVUeXBlID09PSAnYmFuZCcpIHtcbiAgICAgICAgICAvLyBGb3IgYmFuZCwgdG8gZ2V0IG1pZCBwb2ludCwgbmVlZCB0byBvZmZzZXQgYnkgaGFsZiBvZiB0aGUgYmFuZFxuICAgICAgICAgIHJldHVybiBmaWVsZFJlZihjaGFubmVsRGVmLCBzY2FsZU5hbWUsIHtiaW5TdWZmaXg6ICdyYW5nZSd9LCB7YmFuZDogMC41fSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpZWxkUmVmKGNoYW5uZWxEZWYsIHNjYWxlTmFtZSwge2JpblN1ZmZpeDogJ3JhbmdlJ30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZpZWxkUmVmKGNoYW5uZWxEZWYsIHNjYWxlTmFtZSwge30pOyAvLyBubyBuZWVkIGZvciBiaW4gc3VmZml4XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZhbHVlRGVmKGNoYW5uZWxEZWYpKSB7XG4gICAgICByZXR1cm4ge3ZhbHVlOiBjaGFubmVsRGVmLnZhbHVlfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBpZiAoZGVmYXVsdFJlZiA9PT0gJ3plcm9Pck1pbicpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChjaGFubmVsID09PSBYIHx8IGNoYW5uZWwgPT09IFgyKSB7XG4gICAgICByZXR1cm4gemVyb09yTWluWChzY2FsZU5hbWUsIHNjYWxlKTtcbiAgICB9IGVsc2UgaWYgKGNoYW5uZWwgPT09IFkgfHwgY2hhbm5lbCA9PT0gWTIpIHtcbiAgICAgIHJldHVybiB6ZXJvT3JNaW5ZKHNjYWxlTmFtZSwgc2NhbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGNoYW5uZWwgJHtjaGFubmVsfSBmb3IgYmFzZSBmdW5jdGlvbmApOyAvLyBGSVhNRSBhZGQgdGhpcyB0byBsb2cubWVzc2FnZVxuICAgIH1cbiAgfSBlbHNlIGlmIChkZWZhdWx0UmVmID09PSAnemVyb09yTWF4Jykge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGNoYW5uZWwgPT09IFggfHwgY2hhbm5lbCA9PT0gWDIpIHtcbiAgICAgIHJldHVybiB6ZXJvT3JNYXhYKHNjYWxlTmFtZSwgc2NhbGUpO1xuICAgIH0gZWxzZSBpZiAoY2hhbm5lbCA9PT0gWSB8fCBjaGFubmVsID09PSBZMikge1xuICAgICAgcmV0dXJuIHplcm9Pck1heFkoc2NhbGVOYW1lLCBzY2FsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgY2hhbm5lbCAke2NoYW5uZWx9IGZvciBiYXNlIGZ1bmN0aW9uYCk7IC8vIEZJWE1FIGFkZCB0aGlzIHRvIGxvZy5tZXNzYWdlXG4gICAgfVxuICB9XG4gIHJldHVybiBkZWZhdWx0UmVmO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGV4dCh0ZXh0RGVmOiBDaGFubmVsRGVmV2l0aENvbmRpdGlvbjxUZXh0RmllbGREZWY8c3RyaW5nPj4sIGNvbmZpZzogQ29uZmlnKTogVmdWYWx1ZVJlZiB7XG4gIC8vIHRleHRcbiAgaWYgKHRleHREZWYpIHtcbiAgICBpZiAoaXNGaWVsZERlZih0ZXh0RGVmKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFNpZ25hbFJlZih0ZXh0RGVmLCB0ZXh0RGVmLmZvcm1hdCwgJ2RhdHVtJywgY29uZmlnKTtcbiAgICB9IGVsc2UgaWYgKGlzVmFsdWVEZWYodGV4dERlZikpIHtcbiAgICAgIHJldHVybiB7dmFsdWU6IHRleHREZWYudmFsdWV9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWlkKHNpemVSZWY6IFZnU2lnbmFsUmVmKTogVmdWYWx1ZVJlZiB7XG4gIHJldHVybiB7Li4uc2l6ZVJlZiwgbXVsdDogMC41fTtcbn1cblxuZnVuY3Rpb24gemVyb09yTWluWChzY2FsZU5hbWU6IHN0cmluZywgc2NhbGU6IFNjYWxlQ29tcG9uZW50KTogVmdWYWx1ZVJlZiB7XG4gIGlmIChzY2FsZU5hbWUpIHtcbiAgICAvLyBMb2cgLyBUaW1lIC8gVVRDIHNjYWxlIGRvIG5vdCBzdXBwb3J0IHplcm9cbiAgICBpZiAoIWNvbnRhaW5zKFtTY2FsZVR5cGUuTE9HLCBTY2FsZVR5cGUuVElNRSwgU2NhbGVUeXBlLlVUQ10sIHNjYWxlLmdldCgndHlwZScpKSAmJlxuICAgICAgc2NhbGUuZ2V0KCd6ZXJvJykgIT09IGZhbHNlKSB7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjYWxlOiBzY2FsZU5hbWUsXG4gICAgICAgIHZhbHVlOiAwXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICAvLyBQdXQgdGhlIG1hcmsgb24gdGhlIHgtYXhpc1xuICByZXR1cm4ge3ZhbHVlOiAwfTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7VmdWYWx1ZVJlZn0gYmFzZSB2YWx1ZSBpZiBzY2FsZSBleGlzdHMgYW5kIHJldHVybiBtYXggdmFsdWUgaWYgc2NhbGUgZG9lcyBub3QgZXhpc3RcbiAqL1xuZnVuY3Rpb24gemVyb09yTWF4WChzY2FsZU5hbWU6IHN0cmluZywgc2NhbGU6IFNjYWxlQ29tcG9uZW50KTogVmdWYWx1ZVJlZiB7XG4gIGlmIChzY2FsZU5hbWUpIHtcbiAgICAvLyBMb2cgLyBUaW1lIC8gVVRDIHNjYWxlIGRvIG5vdCBzdXBwb3J0IHplcm9cbiAgICBpZiAoIWNvbnRhaW5zKFtTY2FsZVR5cGUuTE9HLCBTY2FsZVR5cGUuVElNRSwgU2NhbGVUeXBlLlVUQ10sIHNjYWxlLmdldCgndHlwZScpKSAmJlxuICAgICAgc2NhbGUuZ2V0KCd6ZXJvJykgIT09IGZhbHNlKSB7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjYWxlOiBzY2FsZU5hbWUsXG4gICAgICAgIHZhbHVlOiAwXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICByZXR1cm4ge2ZpZWxkOiB7Z3JvdXA6ICd3aWR0aCd9fTtcbn1cblxuZnVuY3Rpb24gemVyb09yTWluWShzY2FsZU5hbWU6IHN0cmluZywgc2NhbGU6IFNjYWxlQ29tcG9uZW50KTogVmdWYWx1ZVJlZiB7XG4gIGlmIChzY2FsZU5hbWUpIHtcbiAgICAvLyBMb2cgLyBUaW1lIC8gVVRDIHNjYWxlIGRvIG5vdCBzdXBwb3J0IHplcm9cbiAgICBpZiAoIWNvbnRhaW5zKFtTY2FsZVR5cGUuTE9HLCBTY2FsZVR5cGUuVElNRSwgU2NhbGVUeXBlLlVUQ10sIHNjYWxlLmdldCgndHlwZScpKSAmJlxuICAgICAgc2NhbGUuZ2V0KCd6ZXJvJykgIT09IGZhbHNlKSB7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjYWxlOiBzY2FsZU5hbWUsXG4gICAgICAgIHZhbHVlOiAwXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICAvLyBQdXQgdGhlIG1hcmsgb24gdGhlIHktYXhpc1xuICByZXR1cm4ge2ZpZWxkOiB7Z3JvdXA6ICdoZWlnaHQnfX07XG59XG5cbi8qKlxuICogQHJldHVybnMge1ZnVmFsdWVSZWZ9IGJhc2UgdmFsdWUgaWYgc2NhbGUgZXhpc3RzIGFuZCByZXR1cm4gbWF4IHZhbHVlIGlmIHNjYWxlIGRvZXMgbm90IGV4aXN0XG4gKi9cbmZ1bmN0aW9uIHplcm9Pck1heFkoc2NhbGVOYW1lOiBzdHJpbmcsIHNjYWxlOiBTY2FsZUNvbXBvbmVudCk6IFZnVmFsdWVSZWYge1xuICBpZiAoc2NhbGVOYW1lKSB7XG4gICAgLy8gTG9nIC8gVGltZSAvIFVUQyBzY2FsZSBkbyBub3Qgc3VwcG9ydCB6ZXJvXG4gICAgaWYgKCFjb250YWlucyhbU2NhbGVUeXBlLkxPRywgU2NhbGVUeXBlLlRJTUUsIFNjYWxlVHlwZS5VVENdLCBzY2FsZS5nZXQoJ3R5cGUnKSkgJiZcbiAgICAgIHNjYWxlLmdldCgnemVybycpICE9PSBmYWxzZSkge1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzY2FsZTogc2NhbGVOYW1lLFxuICAgICAgICB2YWx1ZTogMFxuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgLy8gUHV0IHRoZSBtYXJrIG9uIHRoZSB5LWF4aXNcbiAgcmV0dXJuIHt2YWx1ZTogMH07XG59XG4iXX0=