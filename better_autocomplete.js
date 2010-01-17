var KEY = {
	UP: 38,
	DOWN: 40,
	DEL: 46,
	TAB: 9,
	RETURN: 13,
	ESC: 27,
	COMMA: 188,
	PAGEUP: 33,
	PAGEDOWN: 34,
	BACKSPACE: 8
};


function autocomplete_mover(event){
    var selected = $('.autocomplete_selected')
    
    if key in [UP,DOWN]
    
    switch(event.keyCode) {
     case KEY.UP:
        if (select.length == 0)
         
     
         if ( select.visible() ) {
             select.prev();
         } else {
             onChange(0, true);
         }
         break;
         
    //  case KEY.DOWN:
    //      event.preventDefault();
    //      if ( select.visible() ) {
    //          select.next();
    //      } else {
    //          onChange(0, true);
    //      }
    //      break;
    //      
    //  case KEY.PAGEUP:
    //      event.preventDefault();
    //      if ( select.visible() ) {
    //          select.pageUp();
    //      } else {
    //          onChange(0, true);
    //      }
    //      break;
    //      
    //  case KEY.PAGEDOWN:
    //      event.preventDefault();
    //      if ( select.visible() ) {
    //          select.pageDown();
    //      } else {
    //          onChange(0, true);
    //      }
    //      break;
    //  
    //  // matches also semicolon
    //  case options.multiple && $.trim(options.multipleSeparator) == "," && KEY.COMMA:
    //  case KEY.TAB:
    //  case KEY.RETURN:
    //      if( selectCurrent() ) {
    //          // stop default to prevent a form submit, Opera needs special handling
    //          event.preventDefault();
    //          blockSubmit = true;
    //          return false;
    //      }
    //      break;
    //      
    //  case KEY.ESC:
    //      select.hide();
    //      break;
    //      
    //  default:
    //      clearTimeout(timeout);
    //      timeout = setTimeout(onChange, options.delay);
    //      break;
    // }
}