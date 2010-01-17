

// function dict_keys(dict){
//     var keys = []
//     for (var key in dict){
//         if (dict.hasOwnProperty(key)){
//             keys.push(key)
//         }
//     }
//     return items    
// }


function dict_items(dict){
    var items = []
    for (var key in dict){
        if (dict.hasOwnProperty(key)){
            items.push({key:key, value:dict[key]})
        }
    }
    return items
}


// Search for every non-stop-word.  Only include stemming on the last word.
// Score results by how many searches they came up in
function smarter_search(string){
    var words = cull_stopwords(to_words(string))
    if (words.length == 0) return [] // Don't bother searching if there's no input

    // Stem search on the last word, since it's probably the one you're currently typing
    // But don't bother until you've input a few letters.  Otherwise the result set is too big.
    if (words[words.length-1].length > 2) {
        words[words.length-1] += "*"        
    }

    // NOTE: change this to match the whole item once I remove the stemming column
    var results = {}
    $(words).each(function(){
        var word = this
        query_iterate( db, 'select text from item where text match ?', [word], function(row){
            var text = row.text
            if (typeof results[text] == 'undefined') results[text] = 0
            results[text] += 1
        }, "unsafe_mode")
    })
    
    // TODO: consider normalizing the value to use as 
    var sorted = dict_items(results).sort(compare_by_value)
    var values = []
    // TODO: yeah I really need a good 'map'.  Consider underscore?
    $(sorted).each(function(){
        values.push(this.key)
    })
    
    return values
}

function test_smarter_search(){
    var db = google.gears.factory.create('beta.database');
    db.open('test_smarter_search');
    db.execute('create virtual table item using fts2(text, note)')
    var inputs = ['first second third', 'first second', 'first second fourth', 'first third fourth']
    $(inputs).each(function(){
        db.execute('insert into item (text) values (?)', [this])
    })

    // TODO: Test smarter search
    // smarter_search


    db.remove()
}



function cull_stopwords(list){
    // TODO: implement this.  Get the stopwords list from google.
    return list
}


// TODO: add to result set prototype
function as_dict(result_set){
    results = {}
    for (var index = result_set.fieldCount()-1; index >= 0; index--){
        results[result_set.fieldName(index)] = result_set.field(index)
    }
    return results
}

function query_iterate(database, query, params, callback, unsafe_mode){
    if (unsafe_mode){
        // Gears database layer is acting really crummy and not substituting in
        // my parameters properly, so I'll substitute them myself.  Grr.  TODO: file bug somehow
        query = query.replace(/\?/, JSON.stringify(params.pop()))
    }
    
    
    var result_set = database.execute(query, params)
    for (; result_set.isValidRow(); result_set.next()) {
        var row = as_dict(result_set)
        callback(row)
    }
    result_set.close()
}

function query_list(database, query, params){
    var list = []
    query_iterate(database, query, params, function(row){
        list.push(row)
    })
    return list
}

function to_words(string){
    return string.trim().split(new RegExp("\\s+"))
}


function generate_stems(text){
    var words = to_words(text)
    var stems = {}
    $(words).each(function(){
        var word = this
        for(var index = 1; index < word.length; index++){
            var stem = word.slice(0, index)
            stems[stem] = true
        }
    })
    return set_to_list(stems).join(' ')
}

function assertEqualsJSON(){
    assertEquals(JSON.stringify(arguments[0]), JSON.stringify(arguments[1]))
}

function test_generate_stems(){
    // assertEqualsJSON( generate_stems("joy"), ['j','jo'] )
    // assertEqualsJSON( generate_stems("    hola      hiya  "), ['h','ho','hol','hi','hiy'])
    assertEqualsJSON( generate_stems("joy"), 'j jo' )
    assertEqualsJSON( generate_stems("    hola      hiya  "), 'h ho hol hi hiy')
}

String.prototype.trim = function(){
    return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '')    
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

var keys = {enter:13, tab:9, up:38, down:40, left:37, right:39, del:8, space:32}
var codes = key_value_swap(keys)



function moveto(button, destination){
    var item = $(button).parent('li')
    $(destination).append(item)
}

function add_to_list(list, text, id){
    return list.prepend(tmpl("todo_item_template", {text:text, rowid:id}));
}

function add_to_database(text){
    // find first.  No duplicates allowed
    var existing_row_id = null
    query_iterate( db, 'select rowid, text from item where text match ?', [text], function(row){
        existing_row_id = row.rowid
    })
    if (existing_row_id != null) {
        return {rowid:existing_row_id, created:false}
    }
    
    db.execute('insert into item (text) values (?)', [text])
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

        var search_results = smarter_search(text)
        
        var autocomplete = input.parent().find('.autocomplete')
        autocomplete.html(tmpl("list_items_template", {list:search_results}))

        //     
        //     // output.append(tmpl("todo_item_template", {text:this, rowid:0}));
        // })
        
        // query_iterate( db, 'select text, rowid from item where item match ?',[text],function(row){
        //     output.append(tmpl("todo_item_template", {text:row.text, rowid:row.id}));
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
        console.debug("yeah")
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
    add_prerequisite(before_id, focused_item_id)

    if (result.created){
        add_to_list($('#main-list'), text, before_id)
    }
    add_to_list($('#before-list'), text, before_id)
}

function after_enter(input){
    var text = consume_value(input)
    
    var result = add_to_database(text)
    var item_id = result.rowid
    add_prerequisite(focused_item_id, item_id)

    if (result.created){
        add_to_list($('#main-list'), text, item_id)
    }
    add_to_list($('#after-list'), text, item_id)
}

function add_prerequisite(before_id, after_id){
    db.execute('insert into prerequisite (before_id, after_id) values (?,?)',[before_id, after_id])
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
    query_iterate( db, 'select item.rowid, text from prerequisite join item on before_id = item.rowid \
                    where after_id = ?',[focused_item_id],function(row){
        before.push(row)
    })

    query_iterate( db, 'select item.rowid, text from prerequisite join item on after_id = item.rowid \
                    where before_id = ?',[focused_item_id],function(row){
        after.push(row)
    })

    $('#details_panel').html(tmpl("item_details_template", {text:text, before:before, after:after}))
}

function autocomplete_click(item, enter){
    var text = item.text()
    var input = item.parents('.list').find('.input')
    input.val(text)
    input.focus()
    console.debug("entering", input.get(), text)
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