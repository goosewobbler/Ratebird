// RYM Enhancer enhanced and hacked about for Songbird & Firefox extension goodness

var url = document.URL, split_urls;    
var gUrlSubstr = url.split("/"); /*Sets global array containing the URL, used in various functions*/
var RYMEnhancer_username = document.querySelector('a[title="Your Personal Page on RYM"]') ? document.querySelector('a[title="Your Personal Page on RYM"]').textContent : null;
var RYMEnhancer_prefs = {};

function initRYMEnhancer() {
    /*This checks user preferences and calls each function depending on them*/
	//self.postMessage('init');
	//self.postMessage('split:'+RYMEnhancer_prefs.artist_showsplitratings);
    if(RYMEnhancer_prefs.artist_averageratings)		{averageCalculator();}
    if(RYMEnhancer_prefs.ratings_colour)		{colorizer();}
    if(RYMEnhancer_prefs.ratings_10scale)		{ratingsDuplicator();}
	if(RYMEnhancer_username) {
		chartsHighlighter();
		if(RYMEnhancer_prefs.artist_showsplitratings)		{showSplitRatings();}
	}
}

function ratingsDuplicator() /*Duplicates each 0.5-5 rating on the site*/
{
	function parseXpath(xpathQuery) /*Duplicates each rating value for each xpath query*/
	{
		for(var i=0; i<xpathQuery.snapshotLength; i++)
		{
			var target = xpathQuery.snapshotItem(i);
			var rating = target.textContent;
			//alert(i+':'+rating);
			if(!isNaN(rating))
			{
				rating*=2;
				target.textContent = rating.toFixed(2);
			}
		}
	}
	if(gUrlSubstr[3]=="artist")
	{
		parseXpath(xpath('//td/div[@class="medium"]'));									/*Album rating*/					
		parseXpath(xpath('//div[@class="medium"]/span'));								/*Grey album ratings*/
		parseXpath(xpath('//div[@class="small"]/a[@class="artist_rate"]'));				/*My rating*/
	}
	else if(gUrlSubstr[3]=="release")
	{

		
		//parseXpath(xpath('//div[@id="albuminfo"]/table[@class="mbgen"]/tbody/tr/td[@class="albuminfo"]'));

		parseXpath(xpath('//span[@style="font-size: 1.1em; font-weight: bold; color: rgb(51, 136, 51);"]')); /*Friend's ratings text*/
		parseXpath(xpath('//span[@id="rym_rating"]')); 								/*Main rating text*/
		parseXpath(xpath('//a[@class="ratingbutton"]')); 							/*Rating buttons*/
		parseXpath(xpath('//a[@class="ratingbuttonhc"]')); 							/*Used rating button*/
		parseXpath(xpath('//tbody/tr/td[@style="width: 3em;"]')); 					/*Rating distributions*/
		parseXpath(xpath('//span[@id="ratingtext"]')); 								/*Rating text near stars*/
	}
	else if(gUrlSubstr[3]=="charts"||(gUrlSubstr[3].slice(0,11))=="customchart")
		{parseXpath(xpath('//a/b[1]'));}												/*Small ratings at charts*/
	else if(gUrlSubstr[3].slice(0,1)=="~")
		{parseXpath(xpath('//a[@class="medium"]'));}
	
	starPathQuery = xpath('//img[@width="90"]'); /*Star images title text*/
	for(var i=0; i<starPathQuery.snapshotLength; i++)
	{
		var target = starPathQuery.snapshotItem(i);
		var starTitle = target.title;
		target.title = (parseFloat(starTitle)*2)+" out of 10";
	}								/*Rating distribution at user sites*/
}

function averageCalculator() /*Calculates average ratings for an artist and individual categories*/
{
	if(gUrlSubstr[3]=="artist")
	{
		function categoryAverage(category)
		{
			if(category)
			{
				var tBody = category.getElementsByTagName("tbody")[0];
				var rows = tBody.getElementsByTagName("tr");
				var average=0, i=2, errors=0;
				for(var row=null; row=rows[i]; i++)
				{
					var cell = row.getElementsByTagName("td")[6];
					var rating = cell.textContent;
					if(!isNaN(parseFloat(rating))) {average+=parseFloat(rating);}
					if(isNaN(parseFloat(rating))) {++errors;}
				}
				globalAverage+=average;
				globalRecordNumber+=(i-2-errors);
				average/=(i-2-errors);
				var row = document.createElement("tr");
				for(var e=0; e<8; e++)
				{
					cells = document.createElement("td");
					cells.style.background = 'rgb(255,255,204)';
					if(e==1)
					{
						cellText = document.createTextNode("Average rating: ");
						cells.appendChild(cellText);
						cells.style.fontWeight = 'bold';
					}
					else if(e==6)
					{
						var div = document.createElement('div');
						div.className = 'medium';
						divText = document.createTextNode(!isNaN(average) ? average.toFixed(2) : '');
						div.appendChild(divText);
						cells.appendChild(div);
					}
					row.appendChild(cells);
				}
				category.appendChild(row);
			}
		}
		var globalAverage=0, globalRecordNumber=0;
		categoryAverage(document.getElementById("album_disc_s"));
		categoryAverage(document.getElementById("album_disc_e"));
		categoryAverage(document.getElementById("album_disc_c"));
		categoryAverage(document.getElementById("album_disc_i"));
		categoryAverage(document.getElementById("album_disc_b"));
		categoryAverage(document.getElementById("album_disc_d"));
		globalAverage /= globalRecordNumber;
		var row = document.createElement("tr");
		var td = document.createElement("td");
		var tdText = document.createTextNode("Rating");
		td.appendChild(tdText);
		row.appendChild(td);
		td = document.createElement("td");
		//if(GM_getValue('ratingsDuplicator', 1))
		//	{tdText = document.createTextNode((globalAverage*2).toFixed(2));}
		//else
		//	{
                tdText = document.createTextNode(globalAverage.toFixed(2));
                //}
		td.appendChild(tdText);
		row.appendChild(td);
		var table = document.getElementsByTagName("table")[0];
		if(table && table.getElementsByTagName("table")[1]) {
			secondTable=table.getElementsByTagName("table")[1];
		} else if(table && table.getElementsByTagName("table")[0]){
			secondTable=table.getElementsByTagName("table")[0];
		}
		if(secondTable) secondTable.appendChild(row);
	}
}

function colorizer() /*Gives color to ratings*/
{
	function applyColor(xpathQuery)
	{
		for(var i=0; i<xpathQuery.snapshotLength; ++i)
		{
			var div = xpathQuery.snapshotItem(i);
			var value = div.textContent;
			if(!isNaN(value))
			{
				if(value<2) 		{div.style.color="#ff3333";}
				else if(value<3.5)	{div.style.color="#ffcc33";}
				else 				{div.style.color="#339900";}
			}
		}
	}
	
	if(gUrlSubstr[3]=="artist")
	{
		applyColor(xpath('//td/div[@class="medium"]'));									/*Album rating*/					
		applyColor(xpath('//div[@class="medium"]/span'));								/*Grey album ratings*/
	}
	else if(gUrlSubstr[3]=="release")
	{
		applyColor(xpath('//span[@style="font-size: 1.3em; font-weight: bold;"]'));	/*Rating*/
		applyColor(xpath('//span[@style="font-size: 1.3em; font-weight: bold; color: rgb(51, 136, 51);"]')); 
																						/*Friends rating*/
	}
	else if(gUrlSubstr[3]=="charts"||(gUrlSubstr[3].slice(0,11))=="customchart")
		{applyColor(xpath('//a/b[1]'));}												/*Small ratings at charts*/
	else if(gUrlSubstr[3].slice(0,1)=="~")
		{applyColor(xpath('//a[@class="medium"]'));}									/*Rating distribution at user sites*/
}

function chartsHighlighter() /*Highlights rated records from a chart page*/
{
	if(gUrlSubstr[3]=="charts"||gUrlSubstr[3]=="list"||(gUrlSubstr[3]=="lists"&&gUrlSubstr[4].substr(0,9)=="list_view")||(gUrlSubstr[3].slice(0,11))=="customchart") {
		var username = RYMEnhancer_username;
		var highlight = false;
		if(RYMEnhancer_lists_highlightrated) {
			if(RYMEnhancer_lists_highlightowned) {
			        highlight = (RYMEnhancer_lists_highlightwishlisted ? 'rateownwishlist' : 'rateown');
			} else {
				highlight = (RYMEnhancer_lists_highlightwishlisted ? 'ratewishlist' : 'have rated');
		}
		} else if(RYMEnhancer_lists_highlightowned) {
			highlight = (RYMEnhancer_lists_highlightwishlisted ? 'wishlistown' : 'own');
		} else if(RYMEnhancer_lists_highlightwishlisted) {
			highlight = 'have wishlisted';
		}

		if(username!='' && highlight)
		{
			if(gUrlSubstr[3]=="list"||gUrlSubstr[3]=="lists") var page = "list";
			else var page = "customchart";
			
			//single options set
			if(highlight == 'have rated') var urlRequest = 'http://rateyourmusic.com/collection_p/'+username+'/d.a,a,l,o,r0.5-5.0,n9999/';
			else if(highlight == 'own') var urlRequest = 'http://rateyourmusic.com/collection_p/'+username+'/d.a,a,l,o,r0.0-5.0,n9999,oo/';
			else if(highlight == 'have wishlisted') var urlRequest = 'http://rateyourmusic.com/collection_p/'+username+'/d.a,a,l,o,r0.0-5.0,n9999,ow/';
			
			if(urlRequest) {
				
				highlightCells(urlRequest,highlight,page);			
			}
			else { //multiple options set
				
				if(highlight.match('rate')) { //rated
					var urlRequest = 'http://rateyourmusic.com/collection_p/'+username+'/d.a,a,l,o,r0.5-5.0,n9999/';
					highlightCells(urlRequest,'have rated',page);
				}
				
				if(highlight.match('own')) { //owned
					var urlRequest = 'http://rateyourmusic.com/collection_p/'+username+'/d.a,a,l,o,r0.0-5.0,n9999,oo/';
					highlightCells(urlRequest,'own',page);
				}
				
				if(highlight.match('wishlist')) { //wishlisted
					var urlRequest = 'http://rateyourmusic.com/collection_p/'+username+'/d.a,a,l,o,r0.0-5.0,n9999,ow/';
					highlightCells(urlRequest,'have wishlisted',page);
				}
			}
		}
	}
}


function showSplitRatings() /*Make RYM show your ratings for split releases on the relevant artist pages*/
{
	var username = RYMEnhancer_username;
        var ratings_list = RYMEnhancer_prefs.ratingslist;


	
	if(gUrlSubstr[3]=="artist" && username!='') {

		//get array of urls
		split_urls = getSplitUrlsArray(xpath('//table[@class="mbgen"]/tbody/tr/td[2]/span[1]'));
		

		//only continue if there are actually split releases
		if(split_urls.length>0) {
			
			if(!ratings_list) {
			    self.postMessage({
                    request: 'get_list'
                });
			} else {
                processList(ratings_list);
			}
		}
	}
}

    function getSplitUrlsArray(xpathQuery) {
		var splitUrlsArray = new Array();

		for(var i=0; i<xpathQuery.snapshotLength; ++i)
		{
			var div = xpathQuery.snapshotItem(i);
			var value = div.textContent;
			if(value=='Appears on:') {
				var href = div.parentNode.childNodes[2].getAttribute('href');
				if(href==null) href = div.parentNode.childNodes[2].childNodes[0].getAttribute('href');
				if(href!=null) splitUrlsArray.push(href);
			}
			
		}
		return splitUrlsArray;
	}

	function attachRating(xpathQuery,rating) {
		for(var i=0; i<xpathQuery.snapshotLength; ++i)
		{
			var div = xpathQuery.snapshotItem(i);
			if(rating=='NaN') rating = 'Wishlist'; 
			div.textContent = rating;
			div.setAttribute('class', 'artist_rate small');
		}
		return true;
	}

    function processList(list) {
		if(list) {
			var response = list.substring(list.indexOf('<table class="mbgen">'),list.indexOf('</table>'));

			for(var i=0;i<split_urls.length;i++) {
				//search in responseText
				var urlIndex = response.indexOf('href="'+split_urls[i]+'"');
				var releaseID = response.substring(urlIndex-100,urlIndex+30).match(/ title="\[Album(.*)\]"(.*)/);
				if(releaseID!=null) {
					var ratingIDIndex = response.indexOf('id="rating'+releaseID[1]+'"');
					var rating = response.substring(ratingIDIndex-100,ratingIDIndex+30).match(/class="or_q_rating"(.*)>(.*)<\/td>(.*)/);
					if(rating) {
						attachRating(xpath('//table[@class="mbgen"]/tbody/tr/td/a[@class="artist_rate_act"][@href="'+url[i]+'"]'),parseFloat(rating[2]*(RYMEnhancer_ratings_10scale?2:1)).toFixed(2));
					}
				}
			}
		}
	}

function highlightCells(urlRequest,highlight,page){
	//alert(urlRequest);
	var req = new XMLHttpRequest;
	req.open('GET', urlRequest, true);
	req.send(null);
	req.onreadystatechange = function () {
	    if (req.readyState === 4) {
		if(req.status === 200 && req.responseText!==null) {
			//list retrieved
	var response = req.responseText;
			var aux, recordsIHave = 0;
			var albums = document.getElementsByClassName(page==='list' ? 'list_album' : 'album');
	
	for(var i=0; i<albums.length; i++) {
		var href=str_replace('http://rateyourmusic.com','',albums[i].href);
		aux = response.indexOf(href);

		if(aux!=-1) {
			recordsIHave++;
			if(page=="customchart") {
				var highlightEl = albums[i].parentNode.parentNode.parentNode.parentNode;
				var targetBG = highlightEl.style.backgroundColor;					
					} else {
				var highlightEl = albums[i].parentNode.parentNode.parentNode;
				var targetBG = highlightEl.style.backgroundColor;		
			}
			
			if(highlight == 'own') {
						highlightEl.style.background = (targetBG === 'rgb(204, 204, 255)' ? "rgb(204, 255, 204)" : "rgb(255, 255, 204)");
					} else if(highlight == 'have rated') {
						highlightEl.style.background = (targetBG === 'rgb(255, 255, 204)' ? "rgb(204, 255, 204)" : "rgb(204, 204, 255)");
					} else if(highlight == 'have wishlisted') {
						highlightEl.style.background = (targetBG === 'rgb(204, 204, 255)' ? "rgb(255, 204, 255)" : "rgb(255, 204, 204)");
			}
			}
			}
			
			appendTotal(highlight, i, recordsIHave, albums[0], page);
			}
		}
	}	
}

function appendTotal(havetext,records,recordsIHave,target,page) {
			var row = document.createElement('tr');
			if(page=="customchart") {
				for(var i=0; i<3; i++)
				{
					var cell = document.createElement('td');
					if(i==0) 		{cell.appendChild(document.createTextNode('You '+havetext));}
					else if(i==1)	{cell.appendChild(document.createTextNode(recordsIHave+'/'+records));}
					else 			{cell.appendChild(document.createTextNode('of these records'));}
					cell.style.fontSize = '20px !important';
					cell.style.fontWeight = 'bold';
					cell.style.color = '#777777';
					cell.style.backgroundColor = (havetext=='both') ? '#CCFFCC' : (havetext=='own') ? '#FFFFCC' : (havetext=='have rated') ? '#CCCCFF' : (havetext=='have wishlisted') ? '#FFCCCC' : '';
					cell.style.textAlign = (i!=2) ? 'center' : 'left';
					row.appendChild(cell);
				}
			}
			else {
				for(var i=0; i<2; i++) {
					var cell = document.createElement('td');
					if(i==0) 		{cell.appendChild(document.createTextNode('You '+havetext));}
					else 			{cell.appendChild(document.createTextNode(recordsIHave+'/'+records+' of these records'));}
					cell.style.fontSize = '20px !important';
					cell.style.fontWeight = 'bold';
					cell.style.color = '#777777';
					cell.style.backgroundColor = (havetext=='both') ? '#CCFFCC' : (havetext=='own') ? '#FFFFCC' : (havetext=='have rated') ? '#CCCCFF' : (havetext=='have wishlisted') ? '#FFCCCC' : '';
					cell.style.textAlign = (i!=1) ? 'center' : 'left';
					row.appendChild(cell);
				}
			}
			
			target.parentNode.parentNode.parentNode.parentNode.parentNode.appendChild(row);
}

function xpath(query) /*Parses xPath queries*/
{
	return document.evaluate(query, document, null, 6, null);
}


function str_replace (search, replace, subject, count) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Gabriel Paderni
    // +   improved by: Philip Peterson
    // +   improved by: Simon Willison (http://simonwillison.net)
    // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   bugfixed by: Anton Ongson
    // +      input by: Onno Marsman
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    tweaked by: Onno Marsman
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   input by: Oleg Eremeev
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Oleg Eremeev
    // %          note 1: The count parameter must be passed as a string in order
    // %          note 1:  to find a global variable in which the result will be given
    // *     example 1: str_replace(' ', '.', 'Kevin van Zonneveld');
    // *     returns 1: 'Kevin.van.Zonneveld'
    // *     example 2: str_replace(['{name}', 'l'], ['hello', 'm'], '{name}, lars');
    // *     returns 2: 'hemmo, mars'

    var i = 0, j = 0, temp = '', repl = '', sl = 0, fl = 0,
            f = [].concat(search),
            r = [].concat(replace),
            s = subject,
            ra = r instanceof Array, sa = s instanceof Array;
    s = [].concat(s);
    if (count) {
        this.window[count] = 0;
    }

    for (i=0, sl=s.length; i < sl; i++) {
        if (s[i] === '') {
            continue;
        }
        for (j=0, fl=f.length; j < fl; j++) {
            temp = s[i]+'';
            repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
            s[i] = (temp).split(f[j]).join(repl);
            if (count && s[i] !== temp) {
                this.window[count] += (temp.length-s[i].length)/f[j].length;}
        }
    }
    return sa ? s : s[0];
}

//messaging
self.on('message', function (msg) {
  // Handle the message
  switch(msg.request) {
      case 'have_list':
          processList(msg.data.list);
          break;
      case 'have_prefs': 
          RYMEnhancer_prefs = msg.data;
          initRYMEnhancer();
          break;
  }
});

self.postMessage({
    request: 'loaded',
    data: {
        username: RYMEnhancer_username
    }
});



