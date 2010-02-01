// Globals.  How can I make them not so global...
var current_database = 'todos'
var max_autocomplete_results = 10
var focused_item_id
var mode = "available"

var filters = {
    available:{display:"Available", fetch:get_available_items},
    all:{display:"All", fetch:get_all_items},
    unfinished:{display:"Unfinished", fetch:get_unfinished_items},
    finished:{display:"Finished", fetch:get_finished_items}}

var buttons = {
    done:{display:"Done", mark:function(id){mark_item_done(id, 'completed')}},
    drop:{display:"Drop", mark:function(id){mark_item_done(id, 'dropped')}},
    undone:{display:"Revive", mark:function(id){revive_item(id)}}
}


function setup_stuff(){
    setup_database(current_database)
    make_templated_elements()
    make_event_handlers()
    $('#filter #'+mode).click() // Calls refresh_lists eventually
}

function refresh_lists(){
    refresh_main_list()
    
    var before = get_prerequisites(focused_item_id)
    var after = get_postrequisites(focused_item_id)
    $('#before-list').html(tmpl('item_list_template', {items:before}))
    $('#after-list').html(tmpl('item_list_template', {items:after}))
}

function refresh_main_list(){
    var items = filters[mode].fetch()
    $('#main-list').html(tmpl('item_list_template', {items:items}))
}

function make_event_handlers(){
    $('.focus').live('click', function(){
        var item = $(this).parent('li')
        var id = item.attr('data-id')
        focus_item(id)
    })

    // My own half-assed auto-complete, since I couldn't get jquery autocomplete to let me
    // feed custom data to it.
    var list_keydowns = {'main':entered_item, 'before':before_enter, 'after':after_enter}
    _.each(list_keydowns, function(enter, name){
        $('#'+name+'-input').live('keydown', function(event){ 
            if (event.which == keys.enter) {
                enter($(this))
            }
            auto_search($(this))
        })
        $('#'+name+' .autocomplete li').live('click', function(){
            autocomplete_click($(this), enter)
        })    
    })

    // The ID on the filter radio button matches the keys in the filter mode table
    $('#filter input').click(function(event){
        mode = $(this).attr('id')
        refresh_main_list()
    })

    ///////////////////////////////////////////////////
    $('#' + _.keys(buttons).join(', #')).live('click', function(event){
        var button = $(this)
        var id = button.parents('.item').attr('data-id')
        var action = button.attr('id')
        
        buttons[action].mark(id)

        focus_item(id)
        refresh_lists()        
    })

    // $('.done').live('click', function(){ finish_item(this, 'completed') })
    // $('.drop').live('click', function(){ finish_item(this, 'dropped') })
    // $('.revive').live('click', function(){ unfinish_item(this) })

    // $('.drop').live('click', function(){
    //     var item_node = $(this).parents('.item')
    //     var item_id = item_node.attr('data-id')
    //     mark_item_done(item_id, "dropped")
    //     focus_item(item_id)
    // })


    // // Use this later
    // $('.do').live('click', function(){
    //     moveto(this, '#doing')
    // })


}

function finish_item(button, reason){
    var item_node = $(button).parents('.item')
    var id = item_node.attr('data-id')
    mark_item_done(id, "completed")
    focus_item(id)
    refresh_lists()
}




function make_templated_elements(){
    $('#insert-main-list').html(tmpl('editable_list_template', 
        {name:"main", flavor_text:"I should...", items:[]}))    
}




// TODO: rename to something like item details
function focus_item(id){
    focused_item_id = id
    var item = get_item_details(id)
    var before = get_prerequisites(id)
    var after = get_postrequisites(id)
    
    if (item.done_date) var template = "item_completed_template"
    else var template = "item_details_template"
    $('#details_panel').html(tmpl(template, {item:item, before:before, after:after}))
}


var keys = {enter:13, tab:9, up:38, down:40, left:37, right:39, del:8, space:32}
var codes = key_value_swap(keys)


// // May be used for "Today's Items" list.
// function moveto(button, destination){
//     var item = $(button).parent('li')
//     $(destination).append(item)
// }

function add_to_list(list, text, id){
    return list.prepend(tmpl("item_template", {text:text, id:id}))
}

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
    },1)
}


// // An attempt at abstracting the 'enter' behavior for all three lists.
// function generic_enter(input, main_list, this_list){
//     var text = consume_value(input)
//     var result = save_item(text)
//     if (result.created){
//         add_to_list(main_list, text, result.item_id) // TODO: make 'list' the first argument of this function            
//     } else {
//         
//     }
//     
//     if (this_list) {
//         // console.debug("yeah")
//     }
// }


function entered_item(input){
    // generic_enter(input, $('#main-list'))
    var text = consume_value(input)
    
    var result = save_item(text)
    var item_id = result.id

    refresh_lists()
    focus_item(item_id)
}

function before_enter(input){
    // TODO: input is never used, just the text.  Should make text the parameter instead
    var text = consume_value(input)
    
    var result = save_item(text)
    var before_item_id = result.id
    var added = save_prerequisite(focused_item_id, before_item_id).created

    refresh_lists()
}

function after_enter(input){
    var text = consume_value(input)
    
    var result = save_item(text)
    var item_id = result.id
    var added = save_prerequisite(item_id, focused_item_id).created

    refresh_lists()
}

function hide_from_list(id){
    var item = $("#main-list [data-id="+id+"]")
    item.remove()
}


// TODO: this is a silly way to re-use code.  Hm.
function autocomplete_click(item, enter){
    var text = item.text()
    var input = item.parents('.list').find('.input')
    input.val(text)
    input.focus()
    enter(input)
    
    var autocomplete = item.parents('.autocomplete').html('')
}

