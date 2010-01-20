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
