function ratebird_PrefManager() {
	var startPoint="ratebird.";

	var pref=Components.classes["@mozilla.org/preferences-service;1"].
		getService(Components.interfaces.nsIPrefService).
		getBranch(startPoint);

	var observers={};

	// whether a preference exists
	this.exists=function(prefName) {
		return pref.getPrefType(prefName) != 0;
	}

	// returns the named preference
	this.getValue=function(prefName) {
		return (Application.prefs.get(prefName) ? Application.prefs.get(prefName).value : undefined);
	};

	// sets the named preference to the specified value. values must be strings,
	// booleans, or integers.
	this.setValue=function(prefName, value) {
		
		var prefType=typeof(value);

		switch (prefType) {
			case "string":
			case "boolean":
				break;
			case "number":
				if (value % 1 != 0) {
					throw new Error("Cannot set preference to non integral number");
				}
				break;
			default:
				throw new Error("Cannot set preference with datatype: " + prefType);
		}

		// underlying preferences object throws an exception if new pref has a
		// different type than old one. i think we should not do this, so delete
		// old pref first if this is the case.
		if (this.exists(prefName) && prefType != typeof(this.getValue(prefName))) {
			this.remove(prefName);
		}

		// set new value using correct method
		switch (prefType) {
			case "string": pref.setCharPref(prefName, value); break;
			case "boolean": pref.setBoolPref(prefName, value); break;
			case "number": pref.setIntPref(prefName, Math.floor(value)); break;
		}
	}

	// deletes the named preference or subtree
	this.remove=function(prefName) {
		pref.deleteBranch(prefName);
	}

	// call a function whenever the named preference subtree changes
	this.watch=function(prefName, watcher) {
		// construct an observer
		var observer={
			observe:function(subject, topic, prefName) {
				watcher(prefName);
			}
		};

		// store the observer in case we need to remove it later
		observers[watcher]=observer;

		pref.QueryInterface(Components.interfaces.nsIPrefBranchInternal).
			addObserver(prefName, observer, false);
	}

	// stop watching
	this.unwatch=function(prefName, watcher) {
		if (observers[watcher]) {
			pref.QueryInterface(Components.interfaces.nsIPrefBranchInternal)
				.removeObserver(prefName, observers[watcher]);
		}
	}
}