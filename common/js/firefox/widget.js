this.addEventListener('click', function(event) {
  if(event.button == 0 && event.shiftKey == false)
    self.postMessage('left-click');
 
  if(event.button == 2 || (event.button == 0 && event.shiftKey == true))
    self.postMessage('right-click');
    event.preventDefault();
}, true);