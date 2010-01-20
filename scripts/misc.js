function dict_items(dict){
    var items = []
    for (var key in dict){
        if (dict.hasOwnProperty(key)){
            items.push({key:key, value:dict[key]})
        }
    }
    return items
}