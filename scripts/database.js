// Requires: gears_init.js Math.uuid.js

// TODO: seriously consider using the standard html5 database stuff
// Maybe write a compatibility layer?  *shrug*  Then downloading gears could be optional
// as a performance booster!  Depends if html5 supports full text search

// There is no reason to have more than one database connection, so I've opted to define this one globally.
// Now I can easily modify its prototype and add in lots of cool functions.
// Unfortunately, I can't do that because db is a RuntimeObject and it just discards any unknown properties.
var db = google.gears.factory.create('beta.database');
// TODO: check if this function exists, instead of breaking the script
// It wont exist if gears is not installed, or is too old.

// So I'll use this object for database helpers for now.
dbh = {}
dbh.schema_version = function(){
    var rowset = db.execute('select version from schema_version order by version desc')
    // TODO: write a helper for this use case where only one column is selected.
    // and one for the case where only the first result is needed as well.
    var version = rowset.field(0)
    return version
}
dbh.current_schema_version = 1

// Create the database or bring the schema up to date
var setup_database = function(name, reset){
    if (reset) {
        db.open(name);
        db.remove()
    }
    
    db.open(name);

    db.execute('create table if not exists schema_version (version integer)')
    var version = dbh.schema_version()
    
    // Makes use of fallthrough to get the database up to date
    switch(version){
        default:
            // All IDs shall be guids.  Numeric IDs wont cut it when you have to merge multiple databases
            // that are being edited by other users.
            // Row IDs will still be used for the purpose of synchronizing normal tables with their virtual
            // full-text-search-enabled counterparts.
            db.execute('create virtual table item using fts2(text, note)')
            db.execute('create table item_details (guid text, \
                created_date text, start_date text, due_date text, done_date text, done_reason text)')
            // done_reason should be one of (manual, dropped, prerequisite, alternative)
            // More words if it was caused by a tree action. e.g. 
    
            console.debug("urghhh")
            db.execute('create table prerequisite (before_item_guid text, after_item_guid text)')
            // Prerequisites are like a directed graph, though both directions are used.
            
            db.execute('create table simultaneous (item_guid text, related_item_guid text)')
            // Simultaneous items are like an undirected graph.  I'm implementing them as directed edges for simplicity
            // Every time I create one edge, I should create its complement edge as well.  Same goes for deleting.
            
            db.execute('create table alternative (item_guid text, group_guid text)')
            // Alternative actions are like an abstract group.  If you associate with one, you associate with all of them.
                    
            db.execute('create virtual table equipment using fts2(name)')
            db.execute('create table equipment_needed (item_guid text, equipment_guid text)')
            
            db.execute('insert into schema_version (version) values (1)')
            console.debug("urghhh")
        case 1:
            // Votes may be included in a later version of the schema
            // Vote date is included so we can disallow voting again until some time has passed since the last vote
    }
    console.debug("urghhh")
    // NOTE: next time I want to alter stuff, just add an "if version < X" clause here.
    // NOTE: haha, maybe this would be a fun way to use switch statement fallthrough
}

// TODO: Consider renaming this 'smart_search' because 'smarter' feels silly to type
// Search for every non-stop-word.  Only include stemming on the last word.
// Score results by how many searches they came up in
function smarter_search(string){
    var words = cull_stopwords(string.words())
    if (words.length == 0) return [] // Don't bother searching if there's no input

    // Stem search on the last word, since it's probably the one you're currently typing
    // But don't bother until you've input a few letters.  Otherwise the result set is too big.
    // if (words[words.length-1].length > 2) {
    words[words.length-1] += "*"      
    // }

    // NOTE: change this to match the whole item once I remove the stemming column
    var results = {}
    $(words).each(function(){
        var word = this
        dbh.dict_cursor('select text from item where text match ?', [word], function(row){
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

// Avoid getting useless search results
function cull_stopwords(list){
    var stopwords = ['the']
    list = _.reject(list, function(word){ return word.length <= 1 })
    list = _.without(list, stopwords)
    // TODO: implement this.  Get the stopwords list from google.
    return list
}






