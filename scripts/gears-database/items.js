// Creates (or repurposes)
// Creates a new item, or if the text is a duplicate, finds an existing item to re-use
// hurk, how can this co-exist with messages...  I need to design this on paper.
function save_item(text){
    if (!text)
        return {id:null, created:false}

    // find first.  No duplicates allowed
    var existing_id = db.selectColumn('select item.id from item join item_text \
        on item.rowid = item_text.rowid where item_text.text = ?', [text])[0]
    if (existing_id)
        return {id:existing_id, created:false}
    else {
        // Otherwise, create it
        var id = Math.uuid()
        db_patch_create('item', {id:id}, {created_date:iso_date_now(), text:text})
        return {id:id, created:true}
    }
}

// Only handles updates
function save_item_details(item){
    // Cleans up the data.  Fixes all dates and times using date.js
    item.start_date = parse_date(item.start_date)
    item.due_date   = parse_date(item.due_date)

    item.start_time = parse_time(item.start_time)
    item.end_time   = parse_time(item.end_time)
    
    db_patch_update('item', {id:item.id}, item)
}

function mark_item_done(id, reason){
    if (!reason) reason = "completed"
    db_patch_update('item', {id:id}, {done_reason:reason, done_date:iso_date_now()})
}

function revive_item(id){
    db_patch_update('item', {id:id}, {done_date:null, done_reason:null})
}

function get_item_details(id){
    return db.get('item', {id:id})
}
