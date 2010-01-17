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

function compare_by_value(left, right){
    return right.value - left.value
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
        console.debug("searching for ", JSON.stringify(this))
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
    console.debug(results, sorted)
    
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
    
    smarter_search


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
