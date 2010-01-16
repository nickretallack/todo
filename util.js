function as_dict(result_set){
    results = {}
    for (var index = result_set.fieldCount()-1; index >= 0; index--){
        results[result_set.fieldName(index)] = result_set.field(index)
    }
    return results
}

function query_iterate(query, params, callback){
    var result_set = db.execute(query, params)
    for (; result_set.isValidRow(); result_set.next()) {
        var row = as_dict(result_set)
        callback(row)
    }
    result_set.close()
}

function generate_stems(text){
    var words = text.trim().split(new RegExp("\\s+"));
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
