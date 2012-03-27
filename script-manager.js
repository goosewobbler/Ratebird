ratebird.define(
    'script_manager',
    ['requester'],
    function (module) {
        
        function ratebird_ScriptStorage() {
            this.prefMan=new ratebird_PrefManager();
        }
        ratebird_ScriptStorage.prototype.setValue = function(name, val) {
            this.prefMan.setValue(name, val);
        }
        ratebird_ScriptStorage.prototype.getValue = function(name, defVal) {
            return this.prefMan.getValue(name, defVal);
        }
	
        var manager = {
            'getUrlContents': function(aUrl){
                var str, input, channel;
                var	ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
                
                var	scriptableStream = Components.classes["@mozilla.org/scriptableinputstream;1"].getService(Components.interfaces.nsIScriptableInputStream);
                var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
                unicodeConverter.charset = "UTF-8";
                channel = ioService.newChannel(aUrl, null, null);
                input = channel.open();
                scriptableStream.init(input);
                str = scriptableStream.read(input.available());
                scriptableStream.close();
                input.close();
    
                try {
                    return unicodeConverter.ConvertToUnicode(str);
                } catch (e) {
                    return str;
                }
            },
            'isGreasemonkeyable': function(url) {
                var scheme = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).extractScheme(url);
                return (/http|https|file/.test(scheme) && !/hiddenWindow\.html$/.test(url));
            },
            'contentLoad': function(e) {
                var unsafeWin, unsafeLoc, href, script;
                unsafeWin = e.target.defaultView;
                unsafeWin = unsafeWin.wrappedJSObject ? unsafeWin.wrappedJSObject : unsafeWin;
            
                unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
                href = new XPCNativeWrapper(unsafeLoc, "href").href;
            
                if(compiler.isGreasemonkeyable(href) && /.*rateyourmusic\.com.*/.test(href)) {
                    script = manager.getUrlContents('chrome://ratebird/content/scripts/rymenhancerenhanced.js');
                    compiler.injectScript(script, href, unsafeWin);
                }
            },
            'injectScript': function(script, url, unsafeContentWin) {
                var sandbox, logger, storage, xmlhttpRequester;
                var safeWin = new XPCNativeWrapper(unsafeContentWin);
            
                sandbox = new Components.utils.Sandbox(safeWin);
                storage = new ratebird_ScriptStorage();
                xmlhttpRequester = module.requester.create(
                    unsafeContentWin, window//appSvc.hiddenDOMWindow
                );
                sandbox.window = safeWin;
                sandbox.document = sandbox.window.document;
                sandbox.unsafeWindow = unsafeContentWin;
            
                // patch missing properties on xpcnw
                sandbox.XPathResult = Components.interfaces.nsIDOMXPathResult;
            
                // add our own APIs
                sandbox.GM_addStyle = function(css) {
                    manager.addStyle(sandbox.document, css);
                };
                sandbox.GM_setValue = manager.hitch(storage, "setValue");
                sandbox.GM_getValue = manager.hitch(storage, "getValue");
                sandbox.GM_openInTab = manager.hitch(this, "openInTab", unsafeContentWin);
                sandbox.GM_xmlhttpRequest = manager.hitch(
                    xmlhttpRequester, "contentStartRequest"
                );
                //unsupported
                sandbox.GM_registerMenuCommand = function(){};
                sandbox.GM_log = function(){};
                sandbox.GM_getResourceURL = function(){};
                sandbox.GM_getResourceText = function(){};
            
                sandbox.__proto__ = sandbox.window;
                
                try {
                    this.evalInSandbox("(function(){" + script + "})()", url, sandbox);
                } catch (e) {
                    var e2 = new Error(typeof e === "string" ? e : e.message);
                    e2.fileName = script.filename;
                    e2.lineNumber = 0;
                    //GM_logError(e2);
                    alert(e2);
                }
            },
            'evalInSandbox': function(code, codebase, sandbox) {
                if (Components.utils && Components.utils.Sandbox) {
                    // DP beta+
                    Components.utils.evalInSandbox(code, sandbox);
                } else if (Components.utils && Components.utils.evalInSandbox) {
                    // DP alphas
                    Components.utils.evalInSandbox(code, codebase, sandbox);
                } else if (Sandbox) {
                    // 1.0.x
                    evalInSandbox(code, sandbox, codebase);
                } else {
                    throw new Error("Could not create sandbox.");
                }
            },
            'openInTab': function(unsafeContentWin, url) {
                var loadInBackground, sendReferrer, browser, referrer;
                var tabBrowser = getBrowser(), isMyWindow = false;
                for (var i = 0; browser = tabBrowser.browsers[i]; i++) {
                    if (browser.contentWindow == unsafeContentWin) {
                        isMyWindow = true;
                        break;
                    }
                }
                if (!isMyWindow) {
                    return;
                }
             
                loadInBackground = tabBrowser.mPrefs.getBoolPref("browser.tabs.loadInBackground");
                sendReferrer = tabBrowser.mPrefs.getIntPref("network.http.sendRefererHeader");
                if (sendReferrer) {
                    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
                    referrer = ios.newURI(content.document.location.href, null, null);
                }
                tabBrowser.loadOneTab(url, referrer, null, null, loadInBackground);
            },
            'apiLeakCheck': function(allowedCaller) {
                var stack = Components.stack, leaked = false;
                do {
                    if (2 == stack.language) {
                        if ('chrome' != stack.filename.substr(0, 6) && allowedCaller != stack.filename) {
                            leaked=true;
                            break;
                        }
                    }
                    stack=stack.caller;
                } while (stack);
                return leaked;
            },
            'hitch': function(obj, meth) {
                var hitchCaller, staticArgs;
                if (!obj[meth]) {
                    throw "method '" + meth + "' does not exist on object '" + obj + "'";
                }
                hitchCaller = Components.stack.caller.filename;
                staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);
            
                return function() {
                    if (this.apiLeakCheck(hitchCaller)) {
                        return false;
                    }
                    
                    // make a copy of staticArgs (don't modify it because it gets reused for
                    // every invocation).
                    var args = staticArgs.concat();
            
                    // add all the new arguments
                    for (var i = 0; i < arguments.length; i++) {
                        args.push(arguments[i]);
                    }
            
                    // invoke the original function with the correct this obj and the combined
                    // list of static and dynamic arguments.
                    return obj[meth].apply(obj, args);
                };
            },
            'addStyle': function(doc, css) {
                var head, style;
                head = doc.getElementsByTagName('head')[0];
                if (!head) {
                    return;
                }
                style = doc.createElement('style');
                style.type = 'text/css';
                style.innerHTML = css;
                head.appendChild(style);
            },
            'onLoad': function() {
                var	appcontent = window.document.getElementById("appcontent");
                if (appcontent && !appcontent.ratebird) {
                    appcontent.ratebird = true;
                    appcontent.addEventListener("DOMContentLoaded", manager.contentLoad, false);
                }
                window.addEventListener('unload', manager.onunload);
            },
            'onUnLoad': function() {
                //remove now unnecessary listeners
                window.removeEventListener('load', manager.onLoad, false);
                window.removeEventListener('unload', manager.onUnLoad, false);
                window.document.getElementById("appcontent").removeEventListener("DOMContentLoaded", manager.contentLoad, false);
            }
        };

        return {
            'onload': manager.onLoad,
            'hitch': manager.hitch
        };
    }
);