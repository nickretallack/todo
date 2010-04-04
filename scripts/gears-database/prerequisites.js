function save_prerequisite(after_item_id, before_item_id){
    // Don't save any bad relationships
    // TODO: what if there are cycles?
    if (after_item_id == before_item_id) return {created:false}
    if (!after_item_id || !before_item_id) return {created:false}
    if (db.selectSingle('select count(*) from prerequisite where after_item_id = ? and before_item_id = ?',
        [after_item_id, before_item_id])) return {created:false}

    // sync details
    var id = [before_item_id, after_item_id].join(',')
    var message = {type:'prerequisite', id:id, action:'created', date:iso_date_now()}

    db_patch_create('prerequisite', {before_item_id:before_item_id, after_item_id:after_item_id})
    return {created:true}
}

function remove_prerequisite(after_item_id, before_item_id){
    db_patch_delete('prerequisite', {before_item_id:before_item_id, after_item_id:after_item_id})
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
