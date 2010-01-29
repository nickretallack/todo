// Globals.  How can I make them not so global...
var current_database = 'todos'
var max_autocomplete_results = 10
var focused_item_id
var available_mode = false

function setup_stuff(){
    setup_database(current_database)
    make_templated_elements()
    make_event_handlers()
    show_available_items()
}




function make_event_handlers(){
    $('.focus').live('click', function(){
        var item = $(this).parent('li')
        var id = item.attr('data-id')
        focus_item(id)
    })    

    //////////////////////////////////////////////////
    // Reduce Repetition
    $('#main-input').keydown(function(event){
        if (event.which == keys.enter) {
            entered_item($(this))
        }

        auto_search($(this))
    })


    $('#before-input').live('keydown', function(event){
        if (event.which == keys.enter) {
            before_enter($(this))
        }
        auto_search($(this))
    })

    $('#after-input').live('keydown', function(event){
        if (event.which == keys.enter) {
            after_enter($(this))
        }
        auto_search($(this))
    })


    // TODO: reduce to a loop
    $('#before .autocomplete li').live('click', function(){
        autocomplete_click($(this), before_enter)
    })

    $('#main .autocomplete li').live('click', function(){
        autocomplete_click($(this), entered_item)
    })

    $('#after .autocomplete li').live('click', function(){
        autocomplete_click($(this), after_enter)
    })


    $('#filter #all').click(function(event){
        show_all_items()
    })

    $('#filter #available').click(function(event){
        show_available_items()
    })

    $('#filter #unfinished').click(function(event){
        show_unfinished_items()
    })

    $('#filter #finished').click(function(event){
        show_finished_items()
    })


    ///////////////////////////////////////////////////

    $('.done').live('click', function(){
        var item_node = $(this).parents('.item')
        var item_id = item_node.attr('data-id')
        mark_item_done(item_id)
        if (mode != 'finished') {
            $('.list [data-id='+item_id+']').remove() // remove from all lists
        }
        
        // TODO: display congratulatory panel
        
    })

    // // Use this later
    // $('.do').live('click', function(){
    //     moveto(this, '#doing')
    // })


}

function make_templated_elements(){
    $('#insert-main-list').html(tmpl('editable_list_template', 
        {name:"main", flavor_text:"I should...", items:[]}))    
}




// rename to something like item details
// NOTE: text is included here just for convenience.  Of course this function would be better
// if it didn't need that parameter, but I couldn't bring myself to dig it out a second time.
// TODO: get rid of this parameter, and start using get_item_details to grab it instead
// We'll need the extended details anyway
function focus_item(id, text){
    focused_item_id = id
    console.debug("WHAT")
    var item_details = get_item_details(id)
    var before = get_prerequisites(id)
    var after = get_postrequisites(id)
    console.debug(item_details)
    // console.debug(id, before, after)

    $('#details_panel').html(tmpl("item_details_template", {id:id, text:item_details.text, before:before, after:after}))
}



function show_all_items(){
    mode = "all"
    var items = get_items()
    $('#main-list').html(tmpl('item_list_template', {items:items}))
}

function show_available_items(){
    mode = "available"
    var items = get_available_items()
    $('#main-list').html(tmpl('item_list_template', {items:items}))
}

function show_unfinished_items(){
    mode = "unfinished"
    var items = get_unfinished_items()
    $('#main-list').html(tmpl('item_list_template', {items:items}))    
}

function show_finished_items(){
    mode = "finished"
    var items = get_finished_items()
    $('#main-list').html(tmpl('item_list_template', {items:items}))    
}


var keys = {enter:13, tab:9, up:38, down:40, left:37, right:39, del:8, space:32}
var codes = key_value_swap(keys)



function moveto(button, destination){
    var item = $(button).parent('li')
    $(destination).append(item)
}

function add_to_list(list, text, id){
    return list.prepend(tmpl("item_template", {text:text, id:id}));
}

// function now_GMT(){
//     return Date.now().setTimezone("GMT")
// }


function auto_search(input){
    setTimeout(function(){
        // AUTOMATIC SEARCH
        // Using setTimeout so I can grab the value of the text field after it's updated.
        var text = input.val()
        var old_text = input.data('old-text')
        if (text == old_text) return
        input.data('old-text', text)

        var search_results = search_items(text).slice(0,max_autocomplete_results)
        
        var autocomplete = input.parent().find('.autocomplete')
        autocomplete.html(tmpl("list_items_template", {list:search_results}))

        //     
        //     // output.append(tmpl("item_template", {text:this, id:0}));
        // })
        
        // db2.dict_cursor('select text, rowid from item where item match ?',[text],function(row){
        //     output.append(tmpl("item_template", {text:row.text, id:row.id}));
        // })
    },1)
}

function generic_enter(input, main_list, this_list){
    var text = consume_value(input)
    var result = save_item(text)
    if (result.created){
        add_to_list(main_list, text, result.item_id) // TODO: make 'list' the first argument of this function            
    } else {
        
    }
    
    if (this_list) {
        // console.debug("yeah")
    }
}


function entered_item(input){
    // generic_enter(input, $('#main-list'))
    var text = consume_value(input)
    
    var result = save_item(text)
    var item_id = result.item_id
    if (result.created){
        add_to_list($('#main-list'), text, item_id)            
    } else {
        focus_item(item_id, text)
    }
}

function before_enter(input){
    // TODO: input is never used, just the text.  Should make text the parameter instead
    var text = consume_value(input)
    
    var result = save_item(text)
    var before_item_id = result.id
    var added = save_prerequisite(focused_item_id, before_item_id).created

    if (mode == 'available')
        hide_from_list(focused_item_id)

    // as a before_item, this can't possibly be hidden yet...
    if (result.created)
        add_to_list($('#main-list'), text, before_item_id)

    if (added)
        add_to_list($('#before-list'), text, before_item_id)
    // TODO: special highlight effect in the else case
}

function hide_from_list(id){
    var item = $("#main-list [data-id="+id+"]")
    item.remove()
}

function after_enter(input){
    var text = consume_value(input)
    
    var result = save_item(text)
    var item_id = result.id
    var added = save_prerequisite(item_id, focused_item_id).created

    if (result.created)
        add_to_list($('#main-list'), text, item_id)

    // If this is always a post-requisite, there's no way it could show in available mode
    if (mode == 'available')
        hide_from_list(item_id)

    if (added) {
        add_to_list($('#after-list'), text, item_id)
    }
    // TODO: special highlight effect in the else case
}



function autocomplete_click(item, enter){
    var text = item.text()
    var input = item.parents('.list').find('.input')
    input.val(text)
    input.focus()
    enter(input)
    
    var autocomplete = item.parents('.autocomplete').html('')
}


// TRIVIAL

