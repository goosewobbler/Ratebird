// Make a namespace.
if (typeof ratebird == 'undefined') {
  var ratebird = {};
}

/**
 * UI controller that is loaded into the main player window
 */
ratebird.Controller = {

  /**
   * Called when the window finishes loading
   */
  onLoad: function() {

    // initialization code
    this._initialized = true;
    this._strings = document.getElementById("ratebird-strings");
    
    // Perform extra actions the first time the extension is run
    if (Application.prefs.get("extensions.ratebird.firstrun").value) {
      Application.prefs.setValue("extensions.ratebird.firstrun", false);
      this._firstRunSetup();
    }

    // Make a local variable for this controller so that
    // it is easy to access from closures.
    var controller = this;

  },
  

  /**
   * Called when the window is about to close
   */
  onUnLoad: function() {
    this._initialized = false;
  },
  
  
  /**
   * Perform extra setup the first time the extension is run
   */
  _firstRunSetup : function() {
  
  },
  
  /**
   * Helper to add a toolbaritem within a given toolbar
   * 
   *   toolbar - the ID of a toolbar element
   *   newItem - the ID of a toolbaritem element within the 
   *            associated toolbarpalette
   *   insertAfter - ID of an toolbaritem after which newItem should appear
   */
  _insertToolbarItem: function(toolbar, newItem, insertAfter) {
    toolbar = document.getElementById(toolbar);
    var list = toolbar.currentSet || "";
    list = list.split(",");
    
    // If this item is not already in the current set, add it
    if (list.indexOf(newItem) == -1)
    {
      // Add to the array, then recombine
      insertAfter = list.indexOf(insertAfter);
      if (insertAfter == -1) {
        list.push(newItem);
      } else {
        list.splice(insertAfter + 1, 0, newItem);
      }
      list = list.join(",");
      
      toolbar.setAttribute("currentset", list);
      toolbar.currentSet = list;
      document.persist(toolbar.id, "currentset");
    }
  }

  
};

window.addEventListener("load", function(e) { ratebird.Controller.onLoad(e); }, false);
window.addEventListener("unload", function(e) { ratebird.Controller.onUnLoad(e); }, false);