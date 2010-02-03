var keys = {enter:13, tab:9, up:38, down:40, left:37, right:39, del:8, space:32}
var codes = key_value_swap(keys)


function dict_items(dict){
    var items = []
    for (var key in dict){
        if (dict.hasOwnProperty(key)){
            items.push({key:key, value:dict[key]})
        }
    }
    return items
}


function generate_stems(text){
    var words = text.words()
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


function test_generate_stems(){
    // assertEqualsJSON( generate_stems("joy"), ['j','jo'] )
    // assertEqualsJSON( generate_stems("    hola      hiya  "), ['h','ho','hol','hi','hiy'])
    assertEqualsJSON( generate_stems("joy"), 'j jo' )
    assertEqualsJSON( generate_stems("    hola      hiya  "), 'h ho hol hi hiy')
}


function query_one_column(database, query, params){
    var list = []
    db2.dict_cursor(query, params, function(row){
        list.push(_.values(row)[0])
    })
    return list    
}


function query_one_dict(database, query, params){
    var result
    db2.dict_cursor(query, params, function(row){
        result = row
    })
    return result
}

function query_one_item(database, query, params){
    var result
    db2.dict_cursor(query, params, function(row){
        result = _.values(row)[0]
    })
    return result
}


function query_list(database, query, params){
    var list = []
    db2.dict_cursor(query, params, function(row){
        list.push(row)
    })
    return list
}
