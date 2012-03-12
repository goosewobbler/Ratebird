var last_retrieved;

function getValues() {
    var values = {
        contextmenu_search: document.forms[0].elements['RYMEnhancer_contextmenu_search'].checked,
        ratings_10scale: document.forms[0].elements['RYMEnhancer_ratings_10scale'].checked,
        artist_averageratings: document.forms[0].elements['RYMEnhancer_artist_averageratings'].checked,
        ratings_colour: document.forms[0].elements['RYMEnhancer_ratings_colour'].checked,
        lists_highlightrated: document.forms[0].elements['RYMEnhancer_lists_highlightrated'].checked,
        lists_highlightowned: document.forms[0].elements['RYMEnhancer_lists_highlightowned'].checked,
        lists_highlightwishlisted: document.forms[0].elements['RYMEnhancer_lists_highlightwishlisted'].checked,
        artist_showsplitratings: document.forms[0].elements['RYMEnhancer_artist_showsplitratings'].checked
    };
    
    return values;
}

function replaceText(parent, new_text) {
    if (parent.hasChildNodes()) {
        parent.replaceChild(document.createTextNode(new_text), parent.firstChild);
    } else {
        parent.appendChild(document.createTextNode(new_text));
    }
}

function updatePanel(msg) {
    var download_err, progress_el = document.querySelector('progress');
    
    if(msg.request === 'have_list') {
        //list download
        download_err = (msg.data.result.indexOf('error') > -1);
        replaceText(document.getElementById('rym_status_download'), (download_err ? msg.data.result : 'list downloaded.'));
        progress_el.setAttribute('value', (download_err ? 0 : 100));   
    } else {
        //initial load of prefs
        replaceText(document.querySelector('#rym_status_auth span'), msg.data.username);
        document.getElementById('rym_status_unauth').style.display = (msg.data.username ? "none" : "block");
        document.getElementById('rym_status_auth').style.display = (msg.data.username ? "block" : "none");
        document.getElementById('download_ratings_list_btn').style.display = (msg.data.username ? "block" : "none");
        
        document.forms[0].elements['RYMEnhancer_contextmenu_search'].checked = msg.data.contextmenu_search;
        document.forms[0].elements['RYMEnhancer_ratings_10scale'].checked = msg.data.ratings_10scale;
        document.forms[0].elements['RYMEnhancer_artist_averageratings'].checked = msg.data.artist_averageratings;
        document.forms[0].elements['RYMEnhancer_ratings_colour'].checked = msg.data.ratings_colour;
        document.forms[0].elements['RYMEnhancer_lists_highlightrated'].checked = msg.data.lists_highlightrated;
        document.forms[0].elements['RYMEnhancer_lists_highlightowned'].checked = msg.data.lists_highlightowned;
        document.forms[0].elements['RYMEnhancer_lists_highlightwishlisted'].checked = msg.data.lists_highlightwishlisted;
        document.forms[0].elements['RYMEnhancer_artist_showsplitratings'].checked = msg.data.artist_showsplitratings;   
    
        progress_el.style.display = (msg.data.username ? "block" : "none");
    }

    if(typeof msg.data.retrieved === 'number' || typeof last_retrieved !== 'number') {
        //only update if last retrieved value is not a number or current retrieved value is a number
        timestamp_now = Number((Date.now() / 1000).toFixed());
        date_now = date('j', timestamp_now);
        date_retrieved = date('j', msg.data.retrieved);
        date_format = (date_now === date_retrieved ? 'H:i' : 'F j, H:i');
        replaceText(document.querySelector('#rym_status_list'), (typeof msg.data.retrieved === 'number' ? 'Latest List Retrieval: '+date(date_format, msg.data.retrieved) : 'No Ratings List Stored.'));
        last_retrieved = msg.data.retrieved;
    }
    document.getElementById('rym_status_download').style.display = (msg.request === 'have_list' ? "block" : "none");
}

function initDownload() {
    replaceText(document.getElementById('rym_status_download'), 'please wait...');
    document.getElementById('rym_status_download').style.display = "block";
    document.querySelector('progress').setAttribute('value', undefined);
    self.postMessage({
        request: 'get_list',
        data: 'ratings'
    });     
}

function getPrefs() {
    self.postMessage({
        request: 'get_prefs'
    });  
}

var boxes = document.querySelectorAll('input[type="checkbox"]');
for(var i = 0; i < boxes.length; i++) {
    boxes[i].onclick = function() {
        self.postMessage({ 
            request: 'save_prefs',
            data: getValues() 
        });                
    };
}

document.getElementById('download_ratings_list_btn').onclick = initDownload;

self.on('message', function (msg) {
    // Handle the message
    if(msg.request === 'call') {
        window[msg.data]();
    } else { 
        updatePanel(msg);
    }
});

getPrefs();  

