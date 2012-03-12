//
// Gets ratings from RYM and applies them to selected files
//

function ratebird() {
    var that = {};
    that.isSidebar = false;
    that.mainWindow = null;
    that.paneMgr = null;
    that.pane = null;
    that.response = null;
    that.outputBox = null;
    that.pane_int = null;
    that.progressBar = null;
    that.context = null;
    that.prefs = {};
    that.media_items = {
	list: null,
	itemsRated: 0,
	numItems: 0
    };
    that.eventHandlers = {
	init: function(context) {    
	    that.context = context;

	    getPaneManager();
	    
	    //import javascript modules
	    Components.utils.import("resource://app/jsmodules/sbProperties.jsm");
	    Components.utils.import("resource://app/jsmodules/sbLibraryUtils.jsm");
	    Components.utils.import("resource://app/jsmodules/ArrayConverter.jsm");
		    
	    //get main window
	    that.wMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	    that.mainWindow = that.wMediator.getMostRecentWindow("Songbird:Main");
		    
	    //components classes for sending the metadata back to the files
	    that.mediaItemArray = Components.classes["@songbirdnest.com/moz/xpcom/threadsafe-array;1"].createInstance(Components.interfaces.nsIMutableArray);
	    that.metaDataService = Components.classes["@songbirdnest.com/Songbird/FileMetadataService;1"].getService(Components.interfaces.sbIFileMetadataService);
	    that.ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	    that.fileHandler = that.ioService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);

	    Components.utils.import("resource://app/jsmodules/SBJobUtils.jsm");
		
	    //get current pref values
	    that.prefs = {
		username: Application.prefs.get("extensions.ratebird.username") ? Application.prefs.get("extensions.ratebird.username").value : undefined,
		confirm_ratings: Application.prefs.get("extensions.ratebird.confirmRatings") ? Application.prefs.get("extensions.ratebird.confirmRatings").value : false,
		enable_writing: Application.prefs.get("songbird.metadata.ratings.enableWriting") ? Application.prefs.get("songbird.metadata.ratings.enableWriting").value : false,
		ratings_list: Application.prefs.get("extensions.ratebird.ratings_list") ? Application.prefs.get("extensions.ratebird.ratings_list").value : undefined,
		rounding_dir: Application.prefs.get("extensions.ratebird.round_dir").value ? Application.prefs.get("extensions.ratebird.round_dir").value : 'down'
	    };
	    
	    that.eventHandlers.showPane(that.eventHandlers.checkUsername);
	},
	showPane: function(paneAccessCallback) {
	    setTimeout(function() {
		var pane, paneInstList = that.paneMgr.instantiatorsList;
		while (paneInstList.hasMoreElements()) {
		    pane = paneInstList.getNext();
		    if(pane.contentUrl==='chrome://ratebird/content/ratebird.xul') {
			that.pane = pane;
			that.eventHandlers.checkPaneAccess(paneAccessCallback);
		    }
		}
	    }, 100);
	},
	checkPaneAccess: function(paneAccessCallback) {
	    if(that.pane) {
		setTimeout(function() {
		    //screen output
		    that.progressBar = that.pane.contentWindow.document.getElementById("progress");
		    that.outputBox = that.pane.contentWindow.document.getElementById("output").contentWindow.document.body;
			    
		    that.outputBox.style.fontSize = '10px';
		    that.outputBox.style.fontFamily = 'Verdana,Arial,sans-serif';
	    
		    clearInterval(that.pane_int);
		    paneAccessCallback();
		}, 100);	    
	    } else {
		setTimeout(function() {
		    that.eventHandlers.checkPaneAccess(paneAccessCallback);
		}, 100);
	    }
	},
	checkUsername: function() {
	    //if null username
	    if(that.prefs.username !== undefined) {
		//username exists, we can continue
		that.eventHandlers.getMediaItems();
	    } else {
		that.output({
		    alert: 'You need to enter your RYM username in the ratebird options panel, and log into the RYM site, before you can retrieve ratings.'
		});
	    }
	},
	getMediaItems: function() {
	    var canceled = false;
	    
	    //clear progress bar
	    that.setProgress({
		value: 0,
		mode: 'undetermined'
	    });
	    
	    //initialise list
		that.media_items.list = that.mainWindow.gBrowser.currentMediaListView.selection.selectedIndexedMediaItems;
		that.media_items.numItems = that.mainWindow.gBrowser.currentMediaListView.selection.count;

	    
	    //test for zero items
	    if(that.media_items.numItems < 1 && that.context === 'rate') {
		that.output({
		    alert: "You didn't select any items to apply ratings to!"
		});
		canceled = true;
	    }
	    
	    //confirm if pref set
	    if(!canceled && that.prefs.confirm_ratings && !confirm("Retrieve ratings for "+that.media_items.numItems+" track"+(that.media_items.numItems>1?"s":"")+"?  This may take some time, and Songbird may become less responsive during retrieval.  Any existing ratings will be overwritten.")) {
		//canceled
		canceled = true; 
	    }
	    
	    if(canceled) {
		that.setProgress({
		    value: 0,
		    mode: 'determined'
		});
		return;
	    }
	    
	    that.output({
		pane: "getting ratings list..."
	    });
	    
	    if(that.prefs.ratings_list && that.context === 'rate') {
		that.output({
		    pane: "loading saved list..."
		});
		that.eventHandlers.processRatingsList(that.prefs.ratings_list);
	    } else {
		that.getRatingsList({
		    callback: that.eventHandlers.processRatingsList
		});
	    }
	},
	processRatingsList: function(ratings_list) {
	    that.setProgress({
		value: 0,
		mode: 'determined'
	    });
	    
	    if(ratings_list) {
		that.output({
		    pane: "success.<br/>"
		});
		Application.prefs.setValue("extensions.ratebird.ratings_list", ratings_list);
		that.context === 'rate' ? function() { that.eventHandlers.getRatings(ratings_list); }() : function() { return; }();
	    } else {
		//not logged in, error
		that.output({
		    pane: "failed due to authentication error.<br/>Not logged in to RYM for username '"+that.prefs.username+"'.  Please log in and try again.<br/>",
		    alert: "Not logged in to RYM for username '"+that.prefs.username+"'.  Please log in and try again."
		});
		that.mainWindow.gBrowser.loadOneTab("http://rateyourmusic.com/account/login");
		    
		if(that.prefs.ratings_list.match(/<title>Error - Rate Your Music<\/title>/)) {
		    //saved list is invalid - wipe it
		    Application.prefs.setValue("extensions.ratebird.ratings_list", '');
		}
	    }
	},
	getRatings: function(ratings_list) {
	    pseudoThread(getRatings(ratings_list, that.eventHandlers.saveRatings));
	},
	saveRatings: function(result) {
	    var propArray, report_msg;
	    
	    //report to user
	    report_msg = result.num_items+" item"+(result.num_items!=1?"s":"")+" queried, "+result.items_rated+" item"+(result.items_rated!=1?"s":"")+" successfully matched to RYM ratings.<br/>";
	    that.output({
		pane: report_msg,
		alert: report_msg
	    });
      
	    //check for changed data
	    if(that.prefs.enable_writing && that.mediaItemArray.length > 0) {
		// Data has been changed so write ratings metadata to files
		// Defer a tick, as the job manager may launch a dialog which 
		// at this time will totally lock up the player.
		setTimeout(function() {
		    propArray = ArrayConverter.stringEnumerator([SBProperties.rating]);
		    job = that.metaDataService.write(that.mediaItemArray, propArray);
		    SBJobUtils.showProgressDialog(job, null);	    
		}, 0);
	    }
	}
    };
    
    that.setProgress = function(params) {
	//that.output({
	//    pane: 'mode:'+params.mode+', val:'+params.value+'<br/>'
	//});	
	if(that.progressBar) {
	    if(typeof params.value === 'number') {
		that.progressBar.value = params.value;
	    }
	    if(params.mode) {
		that.progressBar.mode = params.mode;
	    }	
	} else {
	    that.output({
		alert: 'no progress bar'
	    });	
	}
    };

    that.clearOutput = function() {
	
	//ensure pane access before we continue
	if(!that.pane) {
	    getPaneManager();
	    
	    setTimeout(function() {
		that.eventHandlers.showPane(that.clearOutput);
	    }, 100);
	    return;
	} else {
	    clearInterval(that.pane_int);
	    that.outputBox.innerHTML = "";
	    that.setProgress({
		value: 0,
		mode: 'determined'
	    });
	}
    };
	
    that.output = function(output_string) {
	if(that.outputBox && output_string.pane) {
	    that.outputBox.innerHTML += output_string.pane;
	    that.outputBox.scrollTop = that.outputBox.scrollHeight - that.outputBox.clientHeight;
	} else if(output_string.alert){
	    alert(output_string.alert.replace(/<br\/>/gi,""));	
	} else if(!that.outputBox) {
	    alert('no output :(');	
	}
    };
    
    function getPaneManager() {
	//get pane manager, show pane
	that.paneMgr = Components.classes["@songbirdnest.com/Songbird/DisplayPane/Manager;1"].getService(Components.interfaces.sbIDisplayPaneManager);
	that.paneMgr.showPane("chrome://ratebird/content/ratebird.xul");
    }
    
    function parseRatingsList(artist, album, ratings_list) {
	var splitArtistsArray, i, RYM_album, RYM_artist, RYM_rating, matches, ratings_table;
	var match_array = {
	    artist: [],
	    album: [],
	    rating: [],
	    type: []
	};
	var count = 0, list = { matched: false };
	
	//split list
	ratings_table = ratings_list.match(/<\/th><\/tr>(.*)<\/table>/);
	matches = ratings_table[1].split(/<tr><td class="or_q_artist"><a[^>]* class="artist">([^<]*)<\/a><\/td><td class="or_q_album"><a[^>]* class="album">([^<]*)<\/a><\/td><td class="or_q_rating" id="rating[0-9]*">([^<]*)<\/td><\/tr>/gi);	
	for (i=0;i<matches.length;i++) {
	    //if(i < 30) that.output({ pane: i+':'+matches[i]+'<br/>' });
	    if(i%4==1) {
		//item artist  - check for match from here
		RYM_artist = cleanString(matches[i]);
		RYM_album = cleanString(matches[i+1]);
		splitArtistsArray = explode(' / ',RYM_artist);
		    
		list = {
		    matched: list.matched,
		    album_match: (RYM_artist===artist && RYM_album===album),
		    va_release_match: (RYM_album===album && RYM_artist==='various artists'),
		    split_release_match: (RYM_artist!==artist && RYM_artist!=='various artists' && in_array(artist, splitArtistsArray))
		};
		    
		//debug
		//if(count < 100) {
		    //that.output({ pane: RYM_artist+"::"+RYM_album+"...res (a,r,sr):"+result.album_match+","+result.va_release_match+","+result.split_release_match+"<br/>" });
		//    that.output({ pane: list.matched+" || "+list.album_match+" || "+list.va_release_match+" || "+list.split_release_match+"<br/>" });
		//}
    
		list.matched = (list.album_match || list.va_release_match || list.split_release_match);
		//}
		      
		//if(list.matched) {
		RYM_rating = matches[i+2];
		    
		if(list.album_match) {
		    //that.output({ pane: "<br/>album match: "+RYM_artist+':'+RYM_album+':'+RYM_rating });
		    return {
			artist: [RYM_artist],
			album: [RYM_album],
			rating: [(that.prefs.rounding_dir==='up' ? Math.ceil(RYM_rating) : Math.floor(RYM_rating))],
			type: ['album']
		    }
		} else if(list.matched) {
		    //that.output({ pane: "<br/>other match: "+RYM_artist+':'+RYM_album+':'+RYM_rating });
		    match_array.artist.push(RYM_artist);
		    match_array.album.push(RYM_album);
		    match_array.rating.push(that.prefs.rounding_dir==='up' ? Math.ceil(RYM_rating) : Math.floor(RYM_rating));
		    match_array.type.unshift(list.va_release_match ? 'VA release' : 'split release');
		}
		    
	    } else {
		count++;
	    }
	}
	
	return match_array;
    }
    
    function getRatingMatches(artist, album, ratings_list, existing_matches, existing_nonmatches){
	//debug
	//alert(artist+'|'+album);
	var match_array, nonmatch_array, result = { matched: false };
	
	result = {
	    album_match: (existing_matches && in_array(artist, existing_matches.artist) && in_array(album, existing_matches.album)) && (existing_matches.artist.indexOf(artist) === existing_matches.album.indexOf(album)),
	    va_release_match: (existing_matches && in_array(album, existing_matches.album)) && (existing_matches.artist.indexOf('various artists') === existing_matches.album.indexOf(album)),
	    nonmatched: (existing_nonmatches && (in_array(artist, existing_nonmatches.artist) && in_array(album, existing_nonmatches.album)) && (existing_nonmatches.artist.indexOf(artist) === existing_nonmatches.album.indexOf(album)))
	};
	result.matched = (!result.nonmatched && (result.album_match || result.va_release_match));
	//alert('matched:'+result.matched+'nonmatched:'+result.nonmatched);
	
	match_array = (result.matched || result.nonmatched ? existing_matches : parseRatingsList(artist, album, ratings_list));
	nonmatch_array = existing_nonmatches ? existing_nonmatches : {
	    artist: [],
	    album: []
	};
	
	if(!match_array.rating[0]) {
	    //nonmatch
	    nonmatch_array.artist.push(artist);
	    nonmatch_array.album.push(album);
	}

	//alert('returning:'+(cache.matched ? 'existing_matches' : 'match_array'));
	//alert('returning:'+nonmatch_array.artist[0]+'::'+nonmatch_array.album[0]);
	
	//at this stage we should have either an array of matches or no match at all
	return {
	    matches: match_array,
	    nonmatches: nonmatch_array
	};
    }
	
    function getRatings(ratings_list, callback) {
	var list = that.media_items.list;
	var num_items = that.media_items.numItems;
	var mediaItem, mediaItemFile, artist, album, reportMsg, job, new_rating, list_progress = 0;
	var results = {
	    matches: null,
	    nonmatches: null
	};
	var mediaItemArray = [], items_rated = that.media_items.itemsRated;

	//go through selected items, get ratings
	while (list.hasMoreElements()) {
            mediaItem = list.getNext().mediaItem;
            mediaItemFile = that.fileHandler.getFileFromURLSpec(mediaItem.getProperty(SBProperties.contentURL)); // returns [xpconnect wrapped nsIFile]

            artist = mediaItem.getProperty(SBProperties.artistName) ? cleanString(mediaItem.getProperty(SBProperties.artistName).toLowerCase()) : '';
            album = mediaItem.getProperty(SBProperties.albumName) ? cleanString(mediaItem.getProperty(SBProperties.albumName).toLowerCase()) : '';
    
            that.output({
		pane: artist+"|"+album+"..."
	    });
	    
            results = getRatingMatches(artist, album, ratings_list, results.matches, results.nonmatches);
			
            if(results && results.matches && results.matches.rating && results.matches.rating[0]) {
		//ideally the user will be able to choose between matched ratings, but we need a popup overlay with radio buttons and an 'apply to all tracks of this release' checkbox 
	        //single rating case
		new_rating = results.matches.rating[0];
	        mediaItem.setProperty(SBProperties.rating, new_rating);
	        mediaItemArray[items_rated] = mediaItem;
	        items_rated++;
                that.output({
		    pane: "matched ("+results.matches.type[0]+")<br/>"
		});
                yield;
            } else {
		that.output({
		    pane: "no match found<br/>"
		});
	    }
	    
	    list_progress++;
	    
	    that.setProgress({
		value: Math.floor((list_progress / num_items)*100),
		mode: 'determined'
            });
	    
            yield;
	}
  
	callback({
	    'num_items': num_items,
	    'items_rated': items_rated
	});
    }
	
	
    that.getRatingsList = function(params) {
	var url_request, req, list;
	that.response = null;
	
	that.output({
	    pane: "requesting from RYM..."
	});
	
	//create AJAX request    
	url_request = 'http://rateyourmusic.com/collection_p/'+that.prefs.username+'/d.rp,a,l,tn,r0.5-5.0/';
	//r0.5-5.0,n9999/';
 
	req = new XMLHttpRequest();
	req.open('GET', url_request, true);
	req.onreadystatechange = function () {
	    if (req.readyState === 4) {
		if(req.status === 200 && req.responseText!==null) {
		    //list retrieved
		    params.callback(req.responseText);
		} else if(req.status === 500){
		    //not logged in
		    params.callback();
		} else {
		    //some other error
		    that.output({
			pane: "failed due to RYM server error.<br/>"
		    });
		}
	    }
	}
	
	try {
	    req.send(null);
	} catch(e) {
	    that.output({
		pane: "failed due to connection error.<br/>"
	    });
	    that.setProgress({
		value: 0,
		mode: 'determined'
	    });
	    params.callback(false);
	    //Components.utils.reportError("init() called");
	}

    };
	
	
    that.rate = function(context) {
	that.eventHandlers.init('rate');
    };
    
    that.list = function(context) {
	that.eventHandlers.init('list');
    };
    
    return that;
}


function pseudoThread(gen) {
  var thisGen = this;    
  var callback = {
    observe: function(subject, topic, data) {
      // we are only interested in timer callbacks, not other messages.
      if (!topic == "timer-callback") return;
      try {
        gen.next();
      } catch (e) {
        threadTimer.cancel();
        threadTimer = null; // break XPCOM cycle
        gen.close();
        // a StopIteration message exception indicates a normal generator shutdown
        if (!(e instanceof StopIteration)) { 
          Components.utils.reportError(e);
        }
      };
    }
  }
  var threadTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
  threadTimer.init(callback, 0, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
}

function ratebird_displayCMItems() {
    //reset menu items
    document.getElementById("LibCMRateThis").setAttribute("hidden","true");
    document.getElementById("LibCMFindRelease").setAttribute("hidden","true");
  
    //show menu items if relevant prefs set
    if(Application.prefs.get("extensions.ratebird.displayLibCMRateThis").value===true) {
        document.getElementById("LibCMRateThis").setAttribute("hidden","false");
    }
    if(Application.prefs.get("extensions.ratebird.displayLibCMFindRelease").value===true) {
        document.getElementById("LibCMFindRelease").setAttribute("hidden","false");
    }
}

//Ratebird Helper functions

function cleanString(input) {
  var s = input.toLowerCase(); //lowercase everything
  s = html_entity_decode(s,'ENT_QUOTES'); //replace html characters 
  s = s.replace(/\n /,"\n");  //remove spaces after line breaks
  s = s.replace(/(\(disc [0-9]*\))/gi,""); //remove format/disc identifications
  s = s.replace(/(\(disc [0-9]*:\s[a-z0-9\s]*\))/gi,"");
  s = s.replace(/(\[disc [0-9]*:\s[a-z0-9\s]*\])/gi,"");
  s = s.replace(/(\[disc [0-9]*\])/gi,"");
  s = s.replace(/(\sdisc[0-9]*)/gi,"");
  s = s.replace(/(\(cd [0-9]*\))/gi,"");
  s = s.replace(/(\(cd[0-9]*\))/gi,"");
  s = s.replace(/(\[cd [0-9]*\])/gi,"");
  s = s.replace(/(\[cd[0-9]*\])/gi,"");
  s = s.replace(/(\scd[0-9]*)/gi,"");
  s = s.replace(/(\[digital ep\])/gi,"");
  s = s.replace(/(\(digital ep\))/gi,"");
  s = s.replace(/(\[bonus disc\])/gi,"");
  s = s.replace(/(\(bonus disc\))/gi,"");
  s = s.replace(/(\[bonus cd\])/gi,"");
  s = s.replace(/(\(bonus cd\))/gi,"");
  s = s.replace(/(\[bonus\])/gi,"");
  s = s.replace(/(\(bonus\))/gi,"");
  s = s.replace(/(\[vinyl\])/gi,"");
  s = s.replace(/(\(vinyl\))/gi,"");
  s = s.replace(/(\[vinyl edition\])/gi,"");
  s = s.replace(/(\(vinyl edition\))/gi,"");
  s = s.replace(/(\(ep\))/gi,"");
  s = s.replace(/(\[ep\])/gi,"");
  s = s.replace(/(\sep$)/gi,"");
  s = s.replace(/(\(cdep\))/gi,"");
  s = s.replace(/(\[cdep\])/gi,"");
  s = s.replace(/(\scdep$)/gi,"");
  s = s.replace(/(\(cds\))/gi,"");
  s = s.replace(/(\[cds\])/gi,"");
  s = s.replace(/(\scds$)/gi,"");
  s = s.replace(/(^\s*)|(\s*$)/gi,""); //remove leading and trailing spaces
  s = s.replace(/[ ]{2,}/gi," "); //remove any double spaces
  return s;
}

function RealTypeOf(v) {
  if (typeof(v) == "object") {
    if (v === null) return "null";
    if (v.constructor == (new Array).constructor) return "array, length "+v.length;
    if (v.constructor == (new Date).constructor) return "date";
    if (v.constructor == (new RegExp).constructor) return "regex";
    return "object";
  }
  return typeof(v);
}

function html_entity_decode (string, quote_style) {
    // http://kevin.vanzonneveld.net
    // +   original by: john (http://www.jd-tech.net)
    // +      input by: ger
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Onno Marsman
    // +   improved by: marc andreu
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Ratheous
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Nick Kolosov (http://sammy.ru)
    // +   bugfixed by: Fox
    // -    depends on: get_html_translation_table
    // *     example 1: html_entity_decode('Kevin &amp; van Zonneveld');
    // *     returns 1: 'Kevin & van Zonneveld'
    // *     example 2: html_entity_decode('&amp;lt;');
    // *     returns 2: '&lt;'

    var hash_map = {}, symbol = '', tmp_str = '', entity = '';
    tmp_str = string.toString();
    
    if (false === (hash_map = this.get_html_translation_table('HTML_ENTITIES', quote_style))) {
        return false;
    }

    // fix &amp; problem
    // http://phpjs.org/functions/get_html_translation_table:416#comment_97660
    delete(hash_map['&']);
    hash_map['&'] = '&amp;';

    for (symbol in hash_map) {
        entity = hash_map[symbol];
        tmp_str = tmp_str.split(entity).join(symbol);
    }
    tmp_str = tmp_str.split('&#039;').join("'");
    
    return tmp_str;
}

function get_html_translation_table (table, quote_style) {
    // http://kevin.vanzonneveld.net
    // +   original by: Philip Peterson
    // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: noname
    // +   bugfixed by: Alex
    // +   bugfixed by: Marco
    // +   bugfixed by: madipta
    // +   improved by: KELAN
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Frank Forte
    // +   bugfixed by: T.Wild
    // +      input by: Ratheous
    // %          note: It has been decided that we're not going to add global
    // %          note: dependencies to php.js, meaning the constants are not
    // %          note: real constants, but strings instead. Integers are also supported if someone
    // %          note: chooses to create the constants themselves.
    // *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
    // *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
    
    var entities = {}, hash_map = {}, decimal = 0, symbol = '';
    var constMappingTable = {}, constMappingQuoteStyle = {};
    var useTable = {}, useQuoteStyle = {};
    
    // Translate arguments
    constMappingTable[0]      = 'HTML_SPECIALCHARS';
    constMappingTable[1]      = 'HTML_ENTITIES';
    constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
    constMappingQuoteStyle[2] = 'ENT_COMPAT';
    constMappingQuoteStyle[3] = 'ENT_QUOTES';

    useTable       = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
    useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT';

    if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
        throw new Error("Table: "+useTable+' not supported');
        // return false;
    }

    entities['38'] = '&amp;';
    if (useTable === 'HTML_ENTITIES') {
        entities['160'] = '&nbsp;';
        entities['161'] = '&iexcl;';
        entities['162'] = '&cent;';
        entities['163'] = '&pound;';
        entities['164'] = '&curren;';
        entities['165'] = '&yen;';
        entities['166'] = '&brvbar;';
        entities['167'] = '&sect;';
        entities['168'] = '&uml;';
        entities['169'] = '&copy;';
        entities['170'] = '&ordf;';
        entities['171'] = '&laquo;';
        entities['172'] = '&not;';
        entities['173'] = '&shy;';
        entities['174'] = '&reg;';
        entities['175'] = '&macr;';
        entities['176'] = '&deg;';
        entities['177'] = '&plusmn;';
        entities['178'] = '&sup2;';
        entities['179'] = '&sup3;';
        entities['180'] = '&acute;';
        entities['181'] = '&micro;';
        entities['182'] = '&para;';
        entities['183'] = '&middot;';
        entities['184'] = '&cedil;';
        entities['185'] = '&sup1;';
        entities['186'] = '&ordm;';
        entities['187'] = '&raquo;';
        entities['188'] = '&frac14;';
        entities['189'] = '&frac12;';
        entities['190'] = '&frac34;';
        entities['191'] = '&iquest;';
        entities['192'] = '&Agrave;';
        entities['193'] = '&Aacute;';
        entities['194'] = '&Acirc;';
        entities['195'] = '&Atilde;';
        entities['196'] = '&Auml;';
        entities['197'] = '&Aring;';
        entities['198'] = '&AElig;';
        entities['199'] = '&Ccedil;';
        entities['200'] = '&Egrave;';
        entities['201'] = '&Eacute;';
        entities['202'] = '&Ecirc;';
        entities['203'] = '&Euml;';
        entities['204'] = '&Igrave;';
        entities['205'] = '&Iacute;';
        entities['206'] = '&Icirc;';
        entities['207'] = '&Iuml;';
        entities['208'] = '&ETH;';
        entities['209'] = '&Ntilde;';
        entities['210'] = '&Ograve;';
        entities['211'] = '&Oacute;';
        entities['212'] = '&Ocirc;';
        entities['213'] = '&Otilde;';
        entities['214'] = '&Ouml;';
        entities['215'] = '&times;';
        entities['216'] = '&Oslash;';
        entities['217'] = '&Ugrave;';
        entities['218'] = '&Uacute;';
        entities['219'] = '&Ucirc;';
        entities['220'] = '&Uuml;';
        entities['221'] = '&Yacute;';
        entities['222'] = '&THORN;';
        entities['223'] = '&szlig;';
        entities['224'] = '&agrave;';
        entities['225'] = '&aacute;';
        entities['226'] = '&acirc;';
        entities['227'] = '&atilde;';
        entities['228'] = '&auml;';
        entities['229'] = '&aring;';
        entities['230'] = '&aelig;';
        entities['231'] = '&ccedil;';
        entities['232'] = '&egrave;';
        entities['233'] = '&eacute;';
        entities['234'] = '&ecirc;';
        entities['235'] = '&euml;';
        entities['236'] = '&igrave;';
        entities['237'] = '&iacute;';
        entities['238'] = '&icirc;';
        entities['239'] = '&iuml;';
        entities['240'] = '&eth;';
        entities['241'] = '&ntilde;';
        entities['242'] = '&ograve;';
        entities['243'] = '&oacute;';
        entities['244'] = '&ocirc;';
        entities['245'] = '&otilde;';
        entities['246'] = '&ouml;';
        entities['247'] = '&divide;';
        entities['248'] = '&oslash;';
        entities['249'] = '&ugrave;';
        entities['250'] = '&uacute;';
        entities['251'] = '&ucirc;';
        entities['252'] = '&uuml;';
        entities['253'] = '&yacute;';
        entities['254'] = '&thorn;';
        entities['255'] = '&yuml;';
    }

    if (useQuoteStyle !== 'ENT_NOQUOTES') {
        entities['34'] = '&quot;';
    }
    if (useQuoteStyle === 'ENT_QUOTES') {
        entities['39'] = '&#39;';
    }
    entities['60'] = '&lt;';
    entities['62'] = '&gt;';


    // ascii decimals to real symbols
    for (decimal in entities) {
        symbol = String.fromCharCode(decimal);
        hash_map[symbol] = entities[decimal];
    }
    
    return hash_map;
}

function explode (delimiter, string, limit) {
    // http://kevin.vanzonneveld.net
    // +     original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     improved by: kenneth
    // +     improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     improved by: d3x
    // +     bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: explode(' ', 'Kevin van Zonneveld');
    // *     returns 1: {0: 'Kevin', 1: 'van', 2: 'Zonneveld'}
    // *     example 2: explode('=', 'a=bc=d', 2);
    // *     returns 2: ['a', 'bc=d']
 
    var emptyArray = { 0: '' };
    
    // third argument is not required
    if ( arguments.length < 2 ||
        typeof arguments[0] == 'undefined' ||
        typeof arguments[1] == 'undefined' )
    {
        return null;
    }
 
    if ( delimiter === '' ||
        delimiter === false ||
        delimiter === null )
    {
        return false;
    }
 
    if ( typeof delimiter == 'function' ||
        typeof delimiter == 'object' ||
        typeof string == 'function' ||
        typeof string == 'object' )
    {
        return emptyArray;
    }
 
    if ( delimiter === true ) {
        delimiter = '1';
    }
    
    if (!limit) {
        return string.toString().split(delimiter.toString());
    } else {
        // support for limit argument
        var splitted = string.toString().split(delimiter.toString());
        var partA = splitted.splice(0, limit - 1);
        var partB = splitted.join(delimiter.toString());
        partA.push(partB);
        return partA;
    }
}


function in_array (needle, haystack, argStrict) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: vlado houba
    // +   input by: Billy
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // *     example 1: in_array('van', ['Kevin', 'van', 'Zonneveld']);
    // *     returns 1: true
    // *     example 2: in_array('vlado', {0: 'Kevin', vlado: 'van', 1: 'Zonneveld'});
    // *     returns 2: false
    // *     example 3: in_array(1, ['1', '2', '3']);
    // *     returns 3: true
    // *     example 3: in_array(1, ['1', '2', '3'], false);
    // *     returns 3: true
    // *     example 4: in_array(1, ['1', '2', '3'], true);
    // *     returns 4: false

    var key = '', strict = !!argStrict;

    if (strict) {
        for (key in haystack) {
            if (haystack[key] === needle) {
                return true;
            }
        }
    } else {
        for (key in haystack) {
            if (haystack[key] == needle) {
                return true;
            }
        }
    }

    return false;
}



var rb = new ratebird();