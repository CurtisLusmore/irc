/**
 * Split a string with the given separator at most n times.
 * @param {str} The string to split.
 * @param {sep} The separator to split on.
 * @param {n} The maximum number of splits to make.
 * @return An array of substrings.
 */
export function split(str, sep, n) {
    if (sep === undefined) { sep = ' '; }
    if (n === undefined) { n = 1; }
    var items = [];
    while (n-- > 0 && str.length > 0) {
        var index = str.indexOf(sep);
        var item = str.substring(0, index);
        str = str.substring(index+sep.length);
        items.push(item);
    }
    if (str.length > 0) items.push(str);
    return items;
}

/**
 * Create a new event. The event has a subscribe method and a notify method.
 *
 * The subscribe method returns a callable which will unsubscribe when called,
 * and can also have its subscribe method called to make further subscriptions.
 * The subscribe methods take two function handles, the first is the callback
 * which is called when the event is notified, the second is a predicate which
 * must return true if the callback is to be invoked. The second argument is
 * optional, if missing the callback is always called.
 *
 * The notify method takes any number of arguments and notifies all subscribers
 * by calling the predicate and callback functions with the supplied arguments.
 *
 * @return A new event.
 */
export function event() {
    var subscribers = {};
    var nextId = 0;
    return {
        subscribe: function (handler, predicate) {
            var ids = [];
            var unsubscriber = function () {
                for (var ind in ids) {
                    delete subscribers[ids[ind]];
                }
            };
            unsubscriber.subscribe = function (handler, predicate) {
                var id = nextId++;
                ids.push(id);
                subscribers[id] = {
                    handler: handler,
                    predicate: predicate || (() => true)
                };
                return this;
            };
            unsubscriber.subscribe(handler, predicate);
            return unsubscriber;
        },
        notify: function () {
            for (var id in subscribers) {
                var subscriber = subscribers[id];
                if (subscriber.predicate.apply(null, arguments)) {
                    subscriber.handler.apply(null, arguments);
                }
            }
        }
    };
}