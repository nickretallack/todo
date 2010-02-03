// Requires: gears_init.js Math.uuid.js Date.js underscore.js

var db = google.gears.factory.create('beta.database', '1.0ext');
// TODO: check if this function exists, instead of breaking the script
// It wont exist if gears is not installed, or is too old.

var item_text_keys = ['text', 'note'] // useful for reflection

// Create the database or bring the schema up to date
var setup_database = function(name){
    db.open(name);

    db.run('create table if not exists schema_version (version integer)')
    var version = db.get_version()
        
    // Makes use of fallthrough to get the database up to date
    switch(version){
        default:
            db.transaction(function(db){
                // All IDs shall be guids.  Numeric IDs wont cut it when you have to merge multiple databases
                // that are being edited by other users.
                // Row IDs will still be used for the purpose of synchronizing normal tables with their virtual
                // full-text-search-enabled counterparts.
                db.run('create table item (id text, \
                    created_date text, start_date text, due_date text, done_date text, done_reason text)')
                db.run('create virtual table item_text using fts2(text, note)')
                // done_reason should be one of (manual, dropped, prerequisite, alternative)
                // More words if it was caused by a tree action. e.g. 

                db.run('create table prerequisite (before_item_id text, after_item_id text)')
                // Prerequisites are like a directed graph, though both directions are used.

                db.run('create table simultaneous (item_id text, related_item_id text)')
                // Simultaneous items are like an undirected graph.  I'm implementing them as directed edges for simplicity
                // Every time I create one edge, I should create its complement edge as well.  Same goes for deleting.

                db.run('create table alternative (item_id text, group_id text)')
                // Alternative actions are like an abstract group.  If you associate with one, you associate with all of them.

                db.run('create virtual table equipment using fts2(name)')
                db.run('create table equipment_needed (item_id text, equipment_id text)')

                db.set_version(1)
            })
        case 1:
            db.transaction(function(db){
                db.run('alter table item add column start_time text')
                db.run('alter table item add column end_time text')
                db.set_version(2)
            })
        case 2:
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
    var stopwords = ['the']
    list = _.reject(list, function(word){ return word.length <= 2 })
    list = _.without(list, stopwords)
    // TODO: implement this.  Get the stopwords list from google.
    return list
}


function save_item(text){
    if (!text) return {id:null, created:false}

    // find first.  No duplicates allowed
    var id = db.selectColumn('select item.id from item join item_text \
        on item.rowid = item_text.rowid where item_text.text = ?', [text])[0]
    if (id) return {id:id, created:false}

    // Create a new one with a unique ID.
    id = Math.uuid()
    // TODO: should I check to see if it has collided?  Hopefully that never happens.
    var date = iso_date_now()
    db.transaction(function(db){
        // Follows the virtual table synchronization pattern explained here:
        // http://code.google.com/apis/gears/api_database.html
        db.run("insert into item (id, created_date) values (?, date(?))", [id, date])
        db.run('insert into item_text (rowid, text) values (last_insert_rowid(), ?)', [text]);
    })
    return {id:id, created:true}
}

function iso_date_now(){
    return parse_date('now')
}

function parse_date(string){
    var date = Date.parse(string)
    if (date) return date.toISOString()
    else return null
}

function parse_time_utc(string){
    var date = Date.parse(string)
    if (date) {
        function f(n) {
            return n < 10 ? '0' + n : n;
        }

        return '' +
            f(date.getUTCHours())     + ':' +
            f(date.getUTCMinutes())   + ':' +
            f(date.getUTCSeconds())   + 'Z';
    } else return null
}

// On second thought, maybe we shouldn't use GMT time of days.  They don't make sense
function parse_time(string){
    var date = Date.parse(string)
    if (date) {
        function f(n) {
            return n < 10 ? '0' + n : n;
        }

        return [f(date.getHours()), f(date.getMinutes()), f(date.getSeconds())].join(':');
    } else return null
}


function save_item_details(item){
    // Clean up the data.  Fix all dates and timesusing date.js
    item.start_date = parse_date(item.start_date)
    item.due_date   = parse_date(item.due_date)

    item.start_time = parse_time(item.start_time)
    item.end_time   = parse_time(item.end_time)

    // Item is synchronized with its full-text search virtual table via rowid
    var rowid = db.selectSingle('select rowid from item where id = ?', [item.id])
    var item_details = filter_fields(item, item_text_keys, false)
    var item_texts = filter_fields(item, item_text_keys, true)

    db.transaction(function(db){
        db.run("update item set "+equals_pairs(item_details)+" where rowid=?", [rowid])
        db.run('update item_text set '+equals_pairs(item_texts)+' where rowid=?', [rowid]);
    })
}

function mark_item_done(id, reason){
    db.run('update item set done_date = date(?), done_reason = ? where id = ?', 
        [iso_date_now(), reason, id])
}

function revive_item(id){
    db.run('update item set done_date = null, done_reason = null where id = ?', [id])
}


function save_prerequisite(after_item_id, before_item_id){
    // Don't save any bad relationships
    // TODO: what if there are cycles?
    if (after_item_id == before_item_id) return {created:false}
    if (!after_item_id || !before_item_id) return {created:false}
    if (db.selectSingle('select count(*) from prerequisite where after_item_id = ? and before_item_id = ?',
        [after_item_id, before_item_id])) return {created:false}
    db.run('insert into prerequisite (after_item_id, before_item_id) values (?,?)', 
        [after_item_id, before_item_id])
    return {created:true}
}

function remove_prerequisite(after_item_id, before_item_id){
    db.run('delete from prerequisite where after_item_id = ? and before_item_id = ?',
        [after_item_id, before_item_id])
}


function get_prerequisites(id){
    return db.selectAll('select item.id, item_text.text, item.done_reason \
        from item join prerequisite on prerequisite.before_item_id = item.id \
        join item_text on item.rowid = item_text.rowid \
        where after_item_id = ?', [id])
        
        // Implicit version for kicks
        'select item.id, item_text.text from item, item_text, prerequisite \
        where item_text.rowid = item.rowid and and prerequisite.before_item_id = item.id and after_id = ?'
}

function get_postrequisites(id){
    return db.selectAll('select item.id, item_text.text, item.done_reason \
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
function get_all_items(){
    return db.selectAll('select item.id, item_text.text, item.done_reason \
    from item join item_text on item.rowid = item_text.rowid')
}

function get_available_items(){
    // An item is available if it is not done, and has no unfinished prerequisites
    // Other factors to incorporate: start date
    // It doesn't matter if a completed task has prerequisites
    return db.selectAll("select item.id, item_text.text, item.done_reason \
        from item join item_text on item.rowid = item_text.rowid \
        where item.done_date is null \
        and 0 = (select count(*) from prerequisite join item as before_item \
        on prerequisite.before_item_id = before_item.id \
        where prerequisite.after_item_id = item.id \
        and before_item.done_date is null) \
        and (item.start_date < date('now') or item.start_date is null) \
        and (item.start_time < time('now', 'localtime') or item.start_time is null) \
        and (item.end_time   > time('now', 'localtime') or item.end_time is null)")
}

function get_unfinished_items(){
    return db.selectAll('select item.id, item_text.text, item.done_reason \
    from item join item_text on item.rowid = item_text.rowid \
    where item.done_date is null')
}

function get_finished_items(){
    return db.selectAll('select item.id, item_text.text, item.done_reason \
    from item join item_text on item.rowid = item_text.rowid \
    where item.done_date is not null')
}

function export_data(){
    // Don't use any helper methods in this library.  This needs to be the raw data, un-prettified
    var items = db.selectAll('select item.*, item_text.text, item_text.note \
    from item join item_text on item.rowid = item_text.rowid')
    var prerequisites = db.selectAll('select * from prerequisite')
    
    var data = {items:items, prerequisites:prerequisites}
    return JSON.stringify(data)
}


function import_data(string_data){
    var data = JSON.parse(string_data)
    db.transaction(function(db){
        
        // insert items
        _.each(data.items, function(item){
            var item_details = filter_fields(item, item_text_keys, false)
            db.insert('item', item_details)
            db.run('insert into item_text (rowid, text, note) values (last_insert_rowid(), ?, ?)', [item.text, item.note]);
        })

        // insert prerequisites
        _.each(data.prerequisites, function(prerequisite){
            db.insert('prerequisite', prerequisite)
        })
    })
}



function equals_pairs(object){
    // var quoted_values = db.quote(_.values(object)) // might optimize by quoting in bulk
    return _.map(object, function(value, key){
        return key + '=' + db.quote(value)
    }).join(', ')
}
