function dict_items(dict){
    var items = []
    for (var key in dict){
        if (dict.hasOwnProperty(key)){
            items.push({key:key, value:dict[key]})
        }
    }
    return items
}

String.prototype.words = function(){
    return this.trim().split(new RegExp("\\s+"))
}

String.prototype.trim = function(){
    return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '')    
}

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

function filter_fields(obj, keys, want){
    results = {}
    _.each(obj, function(value, key, list) {
        var includes = _.include(keys, key)
        if ((want && includes) || (!want && !includes)) results[key] = value
    });
    return results
}

// Uses an invisible div to calculate the size of a textarea
function grow_field(field, temp_field){
  var field = $(field)
  var temp_field = $(temp_field)
  temp_field.width(field.width())
  setTimeout(function(){
    temp_field.text(field.val() + " MM")
    field.css('height', temp_field.height())
  })
}

function harvest_form(form_name){
    var result = {}
    _.each(document[form_name].elements, function(element){
        result[element.name] = element.value
    })
    return result
}

