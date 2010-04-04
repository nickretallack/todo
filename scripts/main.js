// Globals.  How can I make them not so global...
var current_database = 'todos'
var max_autocomplete_results = 10
var focused_item_id
var focused_item_history = []
var mode = "available"
var wait_before_autosaving = 500;

if (typeof console == 'undefined') {
    console = {debug:function(){}}
}

var keys = {enter:13, tab:9, up:38, down:40, left:37, right:39, del:8, space:32}
var codes = key_value_swap(keys)

var filters = {
    available:{display:"Available", fetch:get_available_items},
    all:{display:"All", fetch:get_all_items},
    unfinished:{display:"Unfinished", fetch:get_unfinished_items},
    finished:{display:"Finished", fetch:get_finished_items} }

var buttons = {
    done:{display:"Done", mark:function(id){mark_item_done(id, 'completed')}},
    drop:{display:"Drop", mark:function(id){mark_item_done(id, 'dropped')}},
    undone:{display:"Revive", mark:function(id){revive_item(id)}} }

var growing_fields = {
    '.item.title':'#autogrow-item-title',
    '.notes':'#autogrow-item-notes' }


function setup_stuff(){
    setup_database(current_database)
    make_templated_elements()
    make_event_handlers()
    $('#filter #'+mode).click() // Calls refresh_lists eventually
    
    // Click on the first todo item
    $('#main-list input[type=radio]:first').click()
}

function make_templated_elements(){
    $('#insert-main-list').html(tmpl('editable_list_template', 
        {name:"main", flavor_text:"I should...", items:[]}))    
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

function handle_enter(input, handler) {
    var text = consume_value(input).trim()
    if (!text) return // don't bother entering empties
    var result = save_item(text)
    handler(result.id)
    refresh_lists()
}

function handle_enter_after(item_id) {
    save_prerequisite(item_id, focused_item_id)
}

function handle_enter_before(item_id) {
    save_prerequisite(focused_item_id, item_id)
}

function handle_enter_main(item_id) {
    focus_item(item_id)
}

function make_event_handlers(){
    $('.focus').live('click', function(){
        var item = $(this).parent('li')
        var id = item.attr('data-id')
        focus_item(id)
    })

    // My own half-assed auto-complete, since I couldn't get jquery autocomplete to let me
    // feed custom data to it.
    var list_keydowns = {'main':handle_enter_main, 'before':handle_enter_before, 'after':handle_enter_after}
    _.each(list_keydowns, function(handler, name){
        $('#'+name+'-input').live('keydown', function(event){ 
            var input = $(this)
            if (event.which == keys.enter) {
                handle_enter(input, handler)
            }
            auto_search(input)
        })
        $('#'+name+' .autocomplete li').live('click', function(){
            var li = $(this)
            var input = li.parents('.list:first').find('input:first')
            autocomplete_click(li, function(){ handle_enter(input, handler) })
        })    
    })

    // The ID on the filter radio button matches the keys in the filter mode table
    $('#filter input').click(function(event){
        mode = $(this).attr('id')
        refresh_main_list()
    })

    // Buttons from the table above.  Drop, Done, Revive
    $('#' + _.keys(buttons).join(', #')).live('click', function(event){
        var button = $(this)
        // var id = button.parents('.item').attr('data-id')
        var id = focused_item_id
        var action = button.attr('id')
        
        buttons[action].mark(id)

        focus_item(id)
        refresh_lists()        
    })
    
    $('#import-export a').click(function(event){
        $('#import-export form').toggle()
    })
    $('#export').click(function(event){
        event.preventDefault()
        $('#import-export textarea').val( export_data() )
    })
    $('#import').click(function(event){
        event.preventDefault()
        close_details()
        db.remove()
        setup_database(current_database)
        var data = $('#import-export textarea').val()
        import_data(data)
        refresh_lists()
    })
    
    $('#close_details').live('click', close_details)
    
    // TextAreas that grow to fit your text
    _.each(growing_fields, function(helper_selector, field_selector) {
        $(field_selector).live('keydown', function(event){
            grow_field(this, $(helper_selector))
        })
    })
    
    // Automatically Save Details
    var countdown_to_autosave
    $('[name=item_details] input, [name=item_details] textarea').live('keypress', function(event){
        clearTimeout(countdown_to_autosave)
        countdown_to_autosave = setTimeout(save_current_item_details, wait_before_autosaving)
    }).live('blur', save_current_item_details)
}


function finish_item(button, reason){
    var item_node = $(button).parents('.item')
    var id = item_node.attr('data-id')
    mark_item_done(id, "completed")
    focus_item(id)
    refresh_lists()
}


function save_current_item_details(){
    // TODO: remember the current item's fields, and only save ones that have changed
    var details = harvest_form('item_details')
    save_item_details(details)
    refresh_lists()
}

function close_details(){
    save_current_item_details()
    $('#details_panel').empty()
}

// TODO: rename to something like item details
function focus_item(id){
    if (focused_item_id) close_details()

    focused_item_id = id
    focused_item_history.push(id)
    var item = get_item_details(id)
    var before = get_prerequisites(id)
    var after = get_postrequisites(id)

    if (item.done_date) var template = "item_completed_template"
    else var template = "item_details_template"
    $('#details_panel').html(tmpl(template, {item:item, before:before, after:after}))
}

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
        
        var autocomplete = input.parents('.list:first').find('.autocomplete:first')
        autocomplete.html(tmpl("list_items_template", {list:search_results}))
    },1)
}

// TODO: this is a silly way to re-use code.  Hm.
function autocomplete_click(item, enter){
    var text = item.text()
    var input = item.parents('.list:first').find('.input:first')
    input.val(text)
    enter()
    input.focus()
    
    item.parents('.autocomplete').empty()
}



