getRatingsList = function(params) {
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

