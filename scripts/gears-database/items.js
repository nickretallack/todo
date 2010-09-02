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
    
    // if it's in the hot list, remove it
    var item = db.get('item', {id:id})
    if (item.hot_list){
        remove_from_hotlist(id)
    }
}

function revive_item(id){
    db_patch_update('item', {id:id}, {done_date:null, done_reason:null})
}

function get_item_details(id){
    return db.get('item', {id:id})
}

function add_to_hotlist(id){
    // Wouldn't be necessary if numbers were done the opposite way
    db.run('update item set hot_list_position = hot_list_position + 1 where hot_list')

    db_patch_update('item', {id:id}, {hot_list:1, hot_list_position:1})
}

function remove_from_hotlist(id){
    var item = db.get('item', {id:id})

    // Shuffle everything below it up
    var position = item.hot_list_position
    db.run('update item set hot_list_position = hot_list_position - 1 where hot_list \
            and hot_list_position > ?', [position])

    db_patch_update('item', {id:id}, {hot_list:0, hot_list_position:null})
}

function move_item_in_hotlist(id, new_position){
    var item = db.get('item', {id:id})
    old_position = item.hot_list_position
    if (old_position < new_position) {
        db.run('update item set hot_list_position = hot_list_position - 1 \
                where hot_list_position > ? and hot_list_position <= ? \
                and hot_list', [old_position, new_position])
    } else {
        db.run('update item set hot_list_position = hot_list_position + 1 \
                where hot_list_position < ? and hot_list_position >= ? \
                and hot_list', [old_position, new_position])
    }
    db.run('update item set hot_list_position = ? where id = ?', [new_position, id])
}
