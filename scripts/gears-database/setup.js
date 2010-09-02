// Requires: gears_init.js Math.uuid.js Date.js underscore.js

var db = google.gears.factory.create('beta.database', '1.0ext');
// TODO: check if this function exists, instead of breaking the script
// It wont exist if gears is not installed, or is too old.

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
            // Time of day
            db.transaction(function(db){
                db.run('alter table item add column start_time text')
                db.run('alter table item add column end_time text')
                db.set_version(2)
            })
        case 2:
            // Add messages for synchronization
            db.transaction(function(db){
                db.run('create table message \
                    (key text, value text, method text, entity text, \
                        sent_date text, applied_date text, \
                        created_date text, server_date text, received_date text)')
                        // NOTE: the client id is really unimportant, so I'll leave it out
                        // also somewhat useless are method and entity.  They are included for indexing purposes only.
                        // All the data is in value.
                db.set_version(3)
            })
        case 3:
            db.transaction(function(db){
                db.run('alter table item add column last_vote_date date')
	       	db.run('alter table item add column vote_count integer')
                db.set_version(4)
            	// Vote date is included so we can disallow voting again until some time has passed since the last vote
            })
	case 4:
            db.transaction(function(db){
                db.run('alter table item add column laundry_list boolean default 0')
	       	db.run('alter table item add column hot_list boolean default 0')
                db.set_version(5)
            })
        case 5:
            db.transaction(function(db){
                db.run('alter table item add column hot_list_position integer')
                hot_item_ids = db.selectColumn('select id from item where hot_list')
                for (var x = 0; x < hot_item_ids.length; x++) {
                    db.run('update item set hot_list_position = ? where id = ?', [x, hot_item_ids[x]])
                }
                db.set_version(6)
            })
        case 6:
    }
    // NOTE: next time I want to alter stuff, just add an "if version < X" clause here.
    // NOTE: haha, maybe this would be a fun way to use switch statement fallthrough
}

var item_text_keys = ['text', 'note'] // useful for reflection
function split_item_fields(item) {
    return {details:filter_fields(item, item_text_keys, false),
            texts:  filter_fields(item, item_text_keys, true)}
}
