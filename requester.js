ratebird.define(
    'requester',
    ['script_compiler'],
    function (module) {
        
        var buildRequester = function(unsafeContentWin, chromeWindow) {
            var requester = {
                'unsafeContentWin': unsafeContentWin,
                'chromeWindow': chromeWindow,
                'contentStartRequest': function(details) {
                    var url, ioService, scheme;
                    url = details.url;
                    
                    if (typeof url !== "string") {
                        throw new Error("Invalid url: url must be of type string");
                    }
                    
                    ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
                    scheme = ioService.extractScheme(url);
    
                    switch (scheme) {
                        case "http":
                        case "https":
                        case "ftp":
                            this.chromeWindow.setTimeout(function() {
                                module.script_manager.hitch(this, "chromeStartRequest", url, details);
                            }, 0);
                            break;
                        default:
                            throw new Error("Invalid url: " + url);
                    }
                },
                'chromeStartRequest': function(safeUrl, details) {
                    var prop, req = new this.chromeWindow.XMLHttpRequest();
                
                    this.setupRequestEvent(this.unsafeContentWin, req, "onload", details);
                    this.setupRequestEvent(this.unsafeContentWin, req, "onerror", details);
                    this.setupRequestEvent(this.unsafeContentWin, req, "onreadystatechange", details);
                
                    req.open(details.method, safeUrl);
                
                    if (details.headers) {
                        for (prop in details.headers) {
                            req.setRequestHeader(prop, details.headers[prop]);
                        }
                    }
                
                    req.send(details.data);
                },
                'setupRequestEvent': function(unsafeContentWin, req, event, details) {
                    if (details[event]) {
                        req[event] = function() {
                            var responseState = {
                                'responseText': req.responseText,
                                'readyState': req.readyState,
                                'responseHeaders': (req.readyState === 4 ? req.getAllResponseHeaders() : ''),
                                'status': (req.readyState === 4 ? req.status : 0),
                                'statusText': (req.readyState === 4 ? req.statusText : '')
                            };
                
                            new XPCNativeWrapper(unsafeContentWin, "setTimeout()").setTimeout(function(){
                                details[event](responseState);
                            }, 0);
                        }
                    }
                }
            };

            return requester;
        };
        
        
        return {
            'create': function(unsafeContentWin, chromeWindow) {
                return buildRequester(unsafeContentWin, chromeWindow);
            }
        };
    }
);