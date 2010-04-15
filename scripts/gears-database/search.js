// Search for every non-stop-word.  Only include stemming on the last word.
// Score results by how many searches they came up in
function search_items(string){
    if (!string) return []
    var words = string.words()
    words[words.length-1] += "*"                // enable stemming on the last word
    var usable_words = cull_stopwords(words)    // don't search for things that are too short / common
    if (usable_words.length == 0) return []     // Don't bother searching for nothing

    var results = {}
    _.each(usable_words, function(word){
        var texts = db.selectColumn('select text from item_text where item_text match ?', [word])
        _.each(texts, function(text){
            if (results[text] == undefined)
                results[text] = 0
            results[text] += 1
        })
    })

    var sorted = dict_items(results).sort(compare_by_value)
    var texts = _.map(sorted, function(item){ return item.key })
    return texts
}

// Avoid getting useless search results
function cull_stopwords(list){
    var stopwords = 'the a put get buy use at in do of my for'.split(' ');
    list = _.reject(list, function(word){ return word.length <= 2 })
    list = _.without(list, stopwords)
    // TODO: implement this.  Get the stopwords list from google.
    return list
}
