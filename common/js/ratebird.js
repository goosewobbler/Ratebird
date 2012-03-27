/* Module registry and management functions */

var ratebird = (function () {
    var contracts = {}, channels = {}, modules = {};
    var onload_fns = [];
    var registry = {
        'error': function (msg) {
            throw {
                'name': 'ratebirdModuleRegistryError',
                'message': msg
            };
        },
        'onload': function () {
            var i;
            for (i = 0; i < onload_fns.length; i++) {
                onload_fns[i]();
            }
        },
        'define': function (name, dependencies, obj, force) {
            var i, dependency_objs = [];
            if (force || !modules[name]) {
                for(i = 0; i < dependencies.length; i++) {
                    dependency_objs.push(modules[dependencies[i]]);
                }
                modules[name] = function() {
                    obj.apply(obj, dependency_objs);
                };
                if (typeof obj.onload === 'Function') {
                    onload_fns.push(obj.onload);
                }
                return obj;
            }
            return registry.error('refusing to override module: ' + name);
        },
        'get': function(name) {
            if(!modules[name]) {
                return registry.error('no such module: ' + name);
            }
            return modules[name]();
        }
    };
    var mediator = {
        'subscribe': function(name, fn) {
            if(!channels[name]) {
                channels[name] = [];
            }
            channels[channel].push({
                'context': this,
                'callback': fn
            });
            return this;
        },
        'publish': function(name) {
            var i, subscription, args;
            if(!channels[name]) {
                return false;
            }
            args = Array.prototype.slice.call(arguments, 1);
            for (i = 0; i < channels[name].length; i++) {
                subscription = channels[name][i];
                subscription.callback.apply(subscription.context, args);
            }
            return this;
        }
    };
    var contract = {
        'define': function (name, method_names, defaults, guarantees, force) {
            var obj;
            if (force || !contracts[name]) {
                obj = {
                    'method_names': method_names,
                    'defaults': defaults,
                    'guarantees': guarantees
                };
                contracts[name] = obj;
                return obj;
            }
            return registry.error('refusing to override contract ' + name);
        },
        'ensure': function (name, obj) {
            var i, method_name;
            var contract = contracts[name];
            for (i = 0; i < contract.method_names.length; i++) {
                method_name = contract.method_names[i];
                obj[method_name] = this.fulfil(contract, method_name, obj);
            }
            return obj;
        },
        'fulfil': function (contract, method_name, obj) {
            var implementation;
            var guarantee = (contract.guarantees ? contract.guarantees[method_name] : undefined);

            if (null != obj[method_name]) {
                implementation = obj[method_name];
            } else {
                implementation = (contract.defaults && contract.defaults[method_name] ?
                    contract.defaults[method_name] : function () { /*empty*/ });
            }

            if (undefined !== guarantee) {
                return function () {
                    try {
                        return implementation.apply(obj, arguments);
                    } catch (e) {
                        return ('function' === typeof guarantee ? guarantee.apply(obj, [e]) : guarantee);
                    }
                };
            }
            return implementation;
        }
    };
    
    return {
        'load': registry.onload,
        'define': registry.define,
        'require': function() {
            var i, dependencies = {}, args = Array.prototype.slice.call(arguments, 1);            
            if(typeof args[1] === 'Function') {
                return registry.get(args[0]);
            } else {
                for (i = 0; i < args[0].length; i++) {
                    dependencies[args[0][i]] = registry.get(args[0][i]);
                }
                return args[1].apply(args[1], dependencies);
            }
        },
        'contract': contract,
        'publish': mediator.publish,
        'subscribe': mediator.subscribe,
        'installMediator': function(obj) {
            obj.subscribe = mediator.subscribe;
            obj.publish = mediator.publish;
        }
    };
})();
