// Import the APIs we need.
var contextMenu = require("context-menu");
var request = require("request").Request;
var selection = require("selection");
var tabs = require("tabs");
var timers = require("timers");
const widgets = require('widget');
const data = require('self').data;
var pageMod = require("page-mod");
var ss = require("simple-storage");
var this_worker, menuItem, options_panel, widget;

//set defaults
if(!ss.storage.RYMEnhancer) {
  ss.storage.RYMEnhancer = {
    active: true,
    contextmenu_search: true,
    ratings_10scale: false,
    artist_averageratings: true,
    ratings_colour: true,
    lists_highlightrated: true,
    lists_highlightowned: true,
    lists_highlightwishlisted: true,
    artist_showsplitratings: true,
    ratingslist: null,
    username: null,
  };
}

//set up and show options panel
function getOptionsPanel() {
  var panel = require("panel").Panel({
    width: 500,
    height: 260,
    contentURL: data.url("options.html"),
    contentScriptWhen: 'ready',
    contentScriptFile: [data.url('date.js'), data.url('options.js')],
    onMessage: function (msg) {
      switch(msg.request) {
        case 'get_prefs' :
            widget.panel.postMessage({
                request: 'have_prefs',
                data: {
                    contextmenu_search: ss.storage.RYMEnhancer.contextmenu_search,
                    ratings_10scale: ss.storage.RYMEnhancer.ratings_10scale,
                    artist_averageratings: ss.storage.RYMEnhancer.artist_averageratings,
                    ratings_colour: ss.storage.RYMEnhancer.ratings_colour,
                    lists_highlightrated: ss.storage.RYMEnhancer.lists_highlightrated,
                    lists_highlightowned: ss.storage.RYMEnhancer.lists_highlightowned,
                    lists_highlightwishlisted: ss.storage.RYMEnhancer.lists_highlightwishlisted,
                    artist_showsplitratings: ss.storage.RYMEnhancer.artist_showsplitratings,
                    username: ss.storage.RYMEnhancer.username,
                    retrieved: ss.storage.RYMEnhancer.ratingslist.retrieved
                }
            });
            break;
        case 'save_prefs' : 
          ss.storage.RYMEnhancer = {
            active: ss.storage.RYMEnhancer.active,
            contextmenu_search: msg.data.contextmenu_search,
            ratings_10scale: msg.data.ratings_10scale,
            artist_averageratings: msg.data.artist_averageratings,
            ratings_colour: msg.data.ratings_colour,
            lists_highlightrated: msg.data.lists_highlightrated,
            lists_highlightowned: msg.data.lists_highlightowned,
            lists_highlightwishlisted: msg.data.lists_highlightwishlisted,
            artist_showsplitratings: msg.data.artist_showsplitratings,
            username: ss.storage.RYMEnhancer.username,
            ratingslist: ss.storage.RYMEnhancer.ratingslist
          };    
          break;
        case 'get_list' : 
          downloadList(msg.data, function(obj) {
            var list = (obj.result.indexOf('error') === -1 ? obj.list.data : undefined);
            widget.panel.postMessage({
                request: 'have_list',
                data: {
                    'result': obj.result,
                    'list': obj.list ? obj.list.data : undefined,
                    'retrieved': obj.list ? obj.list.retrieved : undefined
                }
            });
          });
          break;
      }
    }
  });
  
  if(!ss.storage.RYMEnhancer.username) {
      openLoginTab();
  }
  
  return (widget.panel ? widget.panel : panel);
}
 
//activation toggle
function toggleActivation() {
    ss.storage.RYMEnhancer.active = !ss.storage.RYMEnhancer.active;
}

function setUserName(username) {
    var stored_username = ss.storage.RYMEnhancer.username;
    //console.log('setting username:'+username);
    if(!stored_username || stored_username !== username) {
        ss.storage.RYMEnhancer.username = username;
        if(stored_username !== username) {
            //username you have logged in as is different from the stored username, download new list
            widget.panel.show();
            widget.panel.postMessage({
                request: 'have_prefs',
                data: {
                    contextmenu_search: ss.storage.RYMEnhancer.contextmenu_search,
                    ratings_10scale: ss.storage.RYMEnhancer.ratings_10scale,
                    artist_averageratings: ss.storage.RYMEnhancer.artist_averageratings,
                    ratings_colour: ss.storage.RYMEnhancer.ratings_colour,
                    lists_highlightrated: ss.storage.RYMEnhancer.lists_highlightrated,
                    lists_highlightowned: ss.storage.RYMEnhancer.lists_highlightowned,
                    lists_highlightwishlisted: ss.storage.RYMEnhancer.lists_highlightwishlisted,
                    artist_showsplitratings: ss.storage.RYMEnhancer.artist_showsplitratings,
                    username: ss.storage.RYMEnhancer.username,
                    retrieved: ss.storage.RYMEnhancer.ratingslist.retrieved
                }
            });
            widget.panel.postMessage({
                request: 'call',
                data: 'initDownload'
            });
        }
        
    }
}

function getList(type, callback) {
    if(ss.storage.RYMEnhancer.ratingslist) {
        callback({
            result: 'success',
            list: {
                data: ss.storage.RYMEnhancer.ratingslist
            }
        });
    } else {
        downloadList(type, callback);
    }
}

function getWidgetLabel() {
    return 'RYM Enhancer '+//(ss.storage.RYMEnhancer.active ? 'active' : 'inactive')+
        (ss.storage.RYMEnhancer.username ? '- user: '+ss.storage.RYMEnhancer.username : '')+
        ' (right-click for options, left-click to toggle activation)'; 
}

function openLoginTab() {
    var login_url = "http://rateyourmusic.com/account/login";
    if(widget && widget.panel) {
        widget.panel.hide().show();
    }
    if(tabs.activeTab.url !== login_url) {
        tabs.open(login_url);
    }
}

//list download
function downloadList(type, callback) {
    //console.log('downloading list');
    //retrieve ratings
    request({
         url: 'http://rateyourmusic.com/collection_p/'+ss.storage.RYMEnhancer.username+'/d.rp,a,l,tn,r0.0-5.0/',
         onComplete: function (response) {
            var retrieval_date;
            if (response.status === 200 && response.text !== null) {
                retrieval_date = Number((Date.now() / 1000).toFixed());
                ss.storage.RYMEnhancer.ratingslist = {
                    list: response.text,
                    retrieved: retrieval_date
                };
                callback({
                    result: 'success',
                    list: {
                        data: response.text,
                        retrieved: retrieval_date
                    }
                });
            } else if(response.status === 500){
                //not logged in
                setUserName(null);
        		openLoginTab();
                callback({ result: 'authentication error' });
        	} else {
        	    //some other error
                callback({ result: 'xhr/server error' });
            }
          }
    }).get();    
}
 
 //add context menu item
function adjustContextMenu() {
    //console.log('adjusting');
  if(menuItem){
    menuItem.destroy();
  }
  if(ss.storage.RYMEnhancer.active && ss.storage.RYMEnhancer.contextmenu_search) {
    menuItem = contextMenu.Item({
    label: "Search for '"+selection.text+"' on RYM",
    context: contextMenu.SelectionContext(),
    contentScript: 'self.on("click", function () {' +
                   '  var text = window.getSelection().toString();' +
                   '  self.postMessage(text);' +
                   '});',
    onMessage: function (text) {
      if (text.length == 0) {
        throw ("Text to search must not be empty");
      } 
      //console.log("search for: " + text);
      tabs.open("http://rateyourmusic.com/#/search?searchterm="+text+"&searchtype=a");
      }
    });
  }
}

exports.main = function(options, callbacks) {

  //widget setup
  widget = widgets.Widget({
    id: 'RYM Enhancer',
    label: getWidgetLabel(),
    contentURL: ss.storage.RYMEnhancer.active ?
                  data.url('icon_light.png') :
                  data.url('icon_dark.png'),
    contentScriptWhen: 'ready',
    //panel: getOptionsPanel(),
    contentScriptFile: data.url('widget.js'),
    onClick: function(type) {
    //  console.log(type);
    //  return false;
    //  this.panel.hide();
    },
    onMessage: function(message) {
      //if (message == 'left-click') {
       // toggleActivation();
        //console.log('activated: '+ss.storage.RYMEnhancer.active);
      //  widget.contentURL = ss.storage.RYMEnhancer.active ?
      //            data.url('icon_light.png') :
      //            data.url('icon_dark.png');    
      //  return false;
      //} else if (message == 'right-click') {
        //widget.onClick('blah');
        this.panel = getOptionsPanel();
        this.panel.show();   
        return false;
      //}
    }
  });
  
  widget.panel = getOptionsPanel();
 
  //appending RYMEnhancer content script to relevant tabs
  pageMod.PageMod({
    include: ["http://rateyourmusic.com*"],
    contentScriptWhen: 'ready',
    contentScriptFile: data.url("rym_enhancer.js"),
    onAttach: function onAttach(worker) {
      //console.log("Attaching content scripts");
      this_worker = worker;
      worker.on('message', function(msg) {
        if(ss.storage.RYMEnhancer.active) {
          //console.log('got msg:'+data);
          switch(msg.request) {
            case 'loaded': 
                setUserName(msg.data.username);
                //console.log('sending pref values');
                this_worker.postMessage({
                    request: 'have_prefs',
                    data: {
                      ratings_10scale: ss.storage.RYMEnhancer.ratings_10scale,
                      artist_averageratings: ss.storage.RYMEnhancer.artist_averageratings,
                      ratings_colour: ss.storage.RYMEnhancer.ratings_colour,
                      lists_highlightrated: ss.storage.RYMEnhancer.lists_highlightrated,
                      lists_highlightowned: ss.storage.RYMEnhancer.lists_highlightowned,
                      lists_highlightwishlisted: ss.storage.RYMEnhancer.lists_highlightwishlisted,
                      artist_showsplitratings: ss.storage.RYMEnhancer.artist_showsplitratings
                    }
                });
                break;
            case 'get_list':
                getList(msg.data, function(obj) {
                    this_worker.postMessage({
                      request: 'have_list',
                      data: {
                          'list': (obj.result.indexOf('error') === -1 ? obj.list.data : undefined)
                      }
                    });
                });
                break;
          }
        }
      });
    }
  });
  
  //set selection handler to adjust context menu before display
  selection.on('select', adjustContextMenu);
};

 
exports.onUnload = function (reason) {
  console.log(reason);
};


