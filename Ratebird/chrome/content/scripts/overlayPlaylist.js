
function ratebird_findRelease() {
	
  //import javascript modules
  if (!window.SBProperties) Components.utils.import("resource://app/jsmodules/sbProperties.jsm");
  if (!window.LibraryUtils) Components.utils.import("resource://app/jsmodules/sbLibraryUtils.jsm");
  
  //get main window
  var wMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
  var mainWindow = wMediator.getMostRecentWindow("Songbird:Main");
  
  //stats variables
  var itemsRated = 0;
  var numItems = 0;
  
  //get selected items list, count items, reinitialise list  
  var list = window.mediaPage._playlist.getListView().selection.selectedIndexedMediaItems;
  var numItems = window.mediaPage._playlist.getListView().selection.count;
  
  
  pseudoThread(openSearchWindows(list,mainWindow,numItems));
  return true;
}

function openSearchWindows(list,mainWindow,numItems) {
  var itemsRated = 0;
  var term='';
  var type='';

  //components classes for sending the metadata back to the files
  var mediaItemArray = Components.classes["@songbirdnest.com/moz/xpcom/threadsafe-array;1"].createInstance(Components.interfaces.nsIMutableArray);
  var metaDataService = Components.classes["@songbirdnest.com/Songbird/FileMetadataService;1"].getService(Components.interfaces.sbIFileMetadataService);
  var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
  var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
    
  //go through selected items, get ratings
  while (list.hasMoreElements()) {
    var mediaItem = list.getNext().mediaItem;
    var mediaItemFile = fileHandler.getFileFromURLSpec(mediaItem.getProperty(SBProperties.contentURL)); // returns [xpconnect wrapped nsIFile]

    var artist = cleanString(mediaItem.getProperty(SBProperties.artistName).toLowerCase());
    var album = cleanString(mediaItem.getProperty(SBProperties.albumName).toLowerCase());

	var prevTerm = term;
	var prevType = type;

	if(album!=null) {
		//album search first
		term = album;
		type = 'l';
	}
	else {
		term = artist;
		type = 'a';
	}

	if(prevTerm!=term || prevType!=type) {
		//only open search tab if we haven't already opened one for this artist/album
		mainWindow.gBrowser.loadOneTab("http://rateyourmusic.com/search?searchterm="+term+"&searchtype="+type);
	}
    yield;
  }
}

