// Globals.  How can I make them not so global...
// var current_database = 'todo-list'
var state = []

var max_autocomplete_results = 10
var focused_item_id
var available_mode = false
var db

function setup_stuff(){
    if (window.openDatabase) {
         setup_database("todo")
    } else {
        $('body').html("Your browser does not support html5 databases")
        return
    }
    
    $('#insert-main-list').html(tmpl('editable_list_template', {name:"main", 
        flavor_text:"I should...", list:[]}))


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

        // auto_search($(this))
    })

    return // auto-search stuff is not ready yet


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




// TODO: implement these with a template instead of clearing html
function show_all_items(){
    available_mode = false
    $('#main-list').html('')
    db.select('select text, rowid from item', [], function(row){
        add_to_list($('#main-list'), row.text, row.rowid)
    })
}

function show_available_items(){
    return
    
    available_mode = true
    $('#main-list').html('')
    db.select("select item.rowid, item.text from item \
            left outer join prerequisite on prerequisite.after_id = item.rowid\
            where prerequisite.before_id is null", [], 
        function(row){
            add_to_list($('#main-list'), row.text, row.rowid)
        }
    )        
}




var keys = {enter:13, tab:9, up:38, down:40, left:37, right:39, del:8, space:32}
var codes = key_value_swap(keys)



function moveto(button, destination){
    var item = $(button).parent('li')
    $(destination).append(item)
}

function add_to_list(list, text, id){
    return list.prepend(tmpl("item_template", {text:text, rowid:id}));
}

function now_GMT(){
    return Date.now().setTimezone("GMT")
}



function add_to_database_GEARS(text){
    // find first.  No duplicates allowed
    var existing_row_id = null
    dbh.dict_cursor('select rowid, text from item where text match ?', [text], function(row){
        existing_row_id = row.rowid
    })
    if (existing_row_id != null) {
        return {rowid:existing_row_id, created:false}
    }

    // Create a details row along with it.  Use a transaction to ensure synchronization
    // db.execute('BEGIN');
    
    // // Might resort to this if I can't do it the safe way
    // db.execute("insert into item_details (created_date) values (" + Date.now() + ")")
    db.execute("insert into item_details (created_date) values (date(?))", [Date.now().toISOString()])
    db.execute('insert into item (rowid, text) values (last_insert_rowid(), ?)', [text]);
    // db.execute('COMMIT');
    
    return {rowid:db.lastInsertRowId, created:true}
}

function auto_search(input){
    setTimeout(function(){
        // AUTOMATIC SEARCH
        // Using setTimeout so I can grab the value of the text field after it's updated.
        var text = input.val()
        var old_text = input.data('old-text')
        if (text == old_text) return
        input.data('old-text', text)

        var search_results = smarter_search(text).slice(0,max_autocomplete_results)
        
        var autocomplete = input.parent().find('.autocomplete')
        autocomplete.html(tmpl("list_items_template", {list:search_results}))

        //     
        //     // output.append(tmpl("item_template", {text:this, rowid:0}));
        // })
        
        // dbh.dict_cursor('select text, rowid from item where item match ?',[text],function(row){
        //     output.append(tmpl("item_template", {text:row.text, rowid:row.id}));
        // })
    },1)
}

function generic_enter(input, main_list, this_list){
    var text = consume_value(input)
    var result = add_to_database(text)
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
    
    var result = add_to_database(text)
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
    
    var result = add_to_database(text)
    var before_id = result.rowid
    var added = add_prerequisite(before_id, focused_item_id)

    // Gotta be reactive to new requirements and hide the things involved
    if (available_mode)
        hide_from_list(focused_item_id)

    if (result.created)
        add_to_list($('#main-list'), text, before_id)

    if (added)
        add_to_list($('#before-list'), text, before_id)
    // TODO: special highlight effect in the else case
}

function hide_from_list(id){
    var item = $("#main-list [data-id="+id+"]")
    item.hide()
}

function after_enter(input){
    var text = consume_value(input)
    
    var result = add_to_database(text)
    var item_id = result.rowid
    var added = add_prerequisite(focused_item_id, item_id)

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

var last_rs
function add_prerequisite(before_id, after_id){
    var rs = db.execute('select count(*) from prerequisite where before_id = ? and after_id = ?', [before_id, after_id])
    if (rs.field(0) != 0) return false// already exists
    db.execute('insert into prerequisite (before_id, after_id) values (?,?)', [before_id, after_id])
    return true
}

function focus_item(id, text){
    // NOTE: text is included here just for convenience.  Of course this function would be better
    // if it didn't need that parameter, but I couldn't bring myself to dig it out a second time.
    focused_item_id = id

    var before = []
    var after = []
    // TODO: could totally stream these straight into html instead of storing them.
    // Just pass along an inserter function.
    // Not that it matters that much.  This is kind of like a view now, which is nice.

    // TODO: write a function that gives me results as a flat list of the first column
    db.transaction(function(tx){
        tx.executeSql('select item.id, text from prerequisite join item on before_id = item.id \
                        where after_id = ?',[focused_item_id], function(result){
            before = result
        })

        tx.executeSql('select item.id, text from prerequisite join item on after_id = item.id \
                        where before_id = ?',[focused_item_id],function(result){
            after = result
        })        
    })

    $('#details_panel').html(tmpl("item_details_template", {rowid:id, text:text, before:before, after:after}))
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

function consume_value(input){
    var text = input.val()
    input.val('')
    return text
}

function compare_by_value(left, right){
    return right.value - left.value
}

// TODO: add these to prototype?
function key_value_swap(dict){
  var result = {}
  for (var key in dict){
    result[dict[key]] = key
  }
  return result
}

function list_to_set(list){
  var set = {}
  $(list).each(function(){
    set[this] = true
  })
  return set
}

function set_to_list(set){
  var list = []
  for (var item in set){
    list.push(item)
  }
  return list
}
