// Requires: gears_init.js Math.uuid.js Date.js underscore.js

var db = google.gears.factory.create('beta.database', '1.0ext');
// TODO: check if this function exists, instead of breaking the script
// It wont exist if gears is not installed, or is too old.

// Create the database or bring the schema up to date
var setup_database = function(name, reset){
    if (reset) {
        db.open(name);
        db.remove()
    }
    
    db.open(name);

    db.do('create table if not exists schema_version (version integer)')
    var version = db.get_version()
        
    // Makes use of fallthrough to get the database up to date
    switch(version){
        default:
            // All IDs shall be guids.  Numeric IDs wont cut it when you have to merge multiple databases
            // that are being edited by other users.
            // Row IDs will still be used for the purpose of synchronizing normal tables with their virtual
            // full-text-search-enabled counterparts.
            db.do('create table item (id text, \
                created_date text, start_date text, due_date text, done_date text, done_reason text)')
            db.do('create virtual table item_text using fts2(text, note)')
            // done_reason should be one of (manual, dropped, prerequisite, alternative)
            // More words if it was caused by a tree action. e.g. 
    
            db.do('create table prerequisite (before_item_id text, after_item_id text)')
            // Prerequisites are like a directed graph, though both directions are used.
            
            db.do('create table simultaneous (item_id text, related_item_id text)')
            // Simultaneous items are like an undirected graph.  I'm implementing them as directed edges for simplicity
            // Every time I create one edge, I should create its complement edge as well.  Same goes for deleting.
            
            db.do('create table alternative (item_id text, group_id text)')
            // Alternative actions are like an abstract group.  If you associate with one, you associate with all of them.
                    
            db.do('create virtual table equipment using fts2(name)')
            db.do('create table equipment_needed (item_id text, equipment_id text)')

            db.set_version(1)
            // db.do('insert into schema_version (version) values (1)')
        case 1:
            // Votes may be included in a later version of the schema
            // Vote date is included so we can disallow voting again until some time has passed since the last vote
    }
    // NOTE: next time I want to alter stuff, just add an "if version < X" clause here.
    // NOTE: haha, maybe this would be a fun way to use switch statement fallthrough
}

// Search for every non-stop-word.  Only include stemming on the last word.
// Score results by how many searches they came up in
function search_items(string){
    if (!string) return []
    var words = string.words()
    words[words.length-1] += "*"                // enable stemming on the last word
    var usable_words = cull_stopwords(words)    // don't search for things that are too short / common
    if (usable_words.length == 0) return []     // Don't bother searching for nothing

    var results = {}
    _.each(words, function(word){
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
    var stopwords = ['the']
    list = _.reject(list, function(word){ return word.length <= 2 })
    list = _.without(list, stopwords)
    // TODO: implement this.  Get the stopwords list from google.
    return list
}

function iso_date_now(){
    return Date.now().toISOString()
}

function save_item(text){
    // find first.  No duplicates allowed
    var id = db.selectColumn('select item.id from item join item_text \
        on item.rowid = item_text.rowid where item_text.text match ?', [text])[0]
    if (id) return {id:id, created:false}

    // Create a new one with a unique ID.
    id = Math.uuid()
    // TODO: should I check to see if it has collided?  Hopefully that never happens.
    var date = iso_date_now()
    db.transaction(function(db){
        // Follows the virtual table synchronization pattern explained here:
        // http://code.google.com/apis/gears/api_database.html
        db.do("insert into item (id, created_date) values (?, date(?))", [id, date])
        db.do('insert into item_text (rowid, text) values (last_insert_rowid(), ?)', [text]);
    })
    return {id:id, created:true}
}

function mark_item_done(id){
    db.do('update item set done_date = date(?) where id = ?', 
        [iso_date_now(), id])
}

function save_prerequisite(after_item_id, before_item_id){
    // Don't save any bad relationships
    // TODO: what if there are cycles?
    if (after_item_id == before_item_id) return {created:false}
    if (!after_item_id || !before_item_id) return {created:false}
    if (db.selectSingle('select count(*) from prerequisite where after_item_id = ? and before_item_id = ?',
        [after_item_id, before_item_id])) return {created:false}
    db.do('insert into prerequisite (after_item_id, before_item_id) values (?,?)', 
        [after_item_id, before_item_id])
    return {created:true}
}

function remove_prerequisite(after_item_id, before_item_id){
    db.do('delete from prerequisite where after_item_id = ? and before_item_id = ?',
        [after_item_id, before_item_id])
}


function get_prerequisites(id){
    return db.selectAll('select item.id, item_text.text \
        from item join prerequisite on prerequisite.before_item_id = item.id \
        join item_text on item.rowid = item_text.rowid \
        where after_item_id = ?', [id])
        
        // Implicit version for kicks
        'select item.id, item_text.text from item, item_text, prerequisite \
        where item_text.rowid = item.rowid and and prerequisite.before_item_id = item.id and after_id = ?'
}

function get_postrequisites(id){
    return db.selectAll('select item.id, item_text.text \
        from item join prerequisite on prerequisite.after_item_id = item.id \
        join item_text on item.rowid = item_text.rowid \
        where before_item_id = ?', [id])
}

function get_item_details(id){
    return db.selectRow("select item_text.text, item_text.note, item.* \
        from item join item_text on item.rowid = item_text.rowid \
        where item.id = ?", [id])
}

// TODO: does this query work without the []?
function get_items(){
    return db.selectAll('select item.id, item_text.text \
    from item join item_text on item.rowid = item_text.rowid')
}

function get_available_items(){
    return db.selectAll("select item.id, item_text.text \
        from item join item_text on item.rowid = item_text.rowid \
        left outer join prerequisite on prerequisite.after_item_id = item.id \
        where prerequisite.before_item_id is null \
        and done_date is null")
}

function get_unfinished_items(){
    return db.selectAll('select item.id, item_text.text \
    from item join item_text on item.rowid = item_text.rowid \
    where item.done_date is null')
}

function get_finished_items(){
    return db.selectAll('select item.id, item_text.text \
    from item join item_text on item.rowid = item_text.rowid \
    where item.done_date is not null')
}