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
