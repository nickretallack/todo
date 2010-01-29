// Globals.  How can I make them not so global...
// var current_database = 'todo-list'
var state = []

var max_autocomplete_results = 10
var focused_item_id
var available_mode = false
var db

function setup_stuff(){
    setup_database('todos')
    
    $('#insert-main-list').html(tmpl('editable_list_template', 
        {name:"main", flavor_text:"I should...", list:[]}))
    
    $('.focus').live('click', function(){
        var item = $(this).parent('li')
        var id = item.attr('data-id')
        var text = item.find('.text').text()
        focus_item(id, text)
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



    ///////////////////////////////////////////////////

    $('.done').live('click', function(){
        var itemnode = $(this).parents('.item')
        var item_id = itemnode.attr('data-id')
        // console.debug(item_id)
        // db.execute('')
        // moveto(this, '#done')
    })

    // // Use this later
    // $('.do').live('click', function(){
    //     moveto(this, '#doing')
    // })

    show_available_items()
}


// rename to something like item details
// NOTE: text is included here just for convenience.  Of course this function would be better
// if it didn't need that parameter, but I couldn't bring myself to dig it out a second time.
// TODO: get rid of this parameter, and start using get_item_details to grab it instead
// We'll need the extended details anyway
function focus_item(id, text){
    focused_item_id = id

    var before = get_prerequisites(id)
    var after = get_postrequisites(id)

    // console.debug(id, before, after)

    $('#details_panel').html(tmpl("item_details_template", {id:id, text:text, before:before, after:after}))
}



// TODO: implement these with a template instead of clearing html
function show_all_items(){
    available_mode = false
    $('#main-list').html('')
    var items = get_items()
    _.each(items, function(item){
        add_to_list($('#main-list'), item.text, item.id)
    })
}

function show_available_items(){
    available_mode = true
    $('#main-list').html('')
    var items = get_available_items()
    _.each(items, function(item){
        add_to_list($('#main-list'), item.text, item.id)
    })
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
    var added = save_prerequisite(focused_item_id, before_item_id)

    // Gotta be reactive to new requirements and hide the things involved
    if (available_mode)
        hide_from_list(focused_item_id)

    if (result.created)
        add_to_list($('#main-list'), text, before_item_id)

    if (added)
        add_to_list($('#before-list'), text, before_item_id)
    // TODO: special highlight effect in the else case
}

function hide_from_list(id){
    var item = $("#main-list [data-id="+id+"]")
    item.hide()
}

function after_enter(input){
    var text = consume_value(input)
    
    var result = save_item(text)
    var item_id = result.id
    var added = save_prerequisite(item_id, focused_item_id)

    if (result.created)
        add_to_list($('#main-list'), text, item_id)

    // If this is always a post-requisite, there's no way it could show in available mode
    if (available_mode)
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

