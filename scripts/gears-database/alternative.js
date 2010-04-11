function save_alternative(id1, id2){
    // see if either ID is already participating in an alternates pool
    var groups = db.selectAll('select item_id, group_id from alternative where item_id = ? or item_id = ?', [id1, id2])
    
    if (groups.length == 0) { // Neither is in a group.  Create a new group
        var group_id = Math.uuid()
        db.insert('alternative', {'item_id':id1, 'group_id':group_id})
        db.insert('alternative', {'item_id':id2, 'group_id':group_id})
    } else if (groups.length == 1) { // one group exists.  Add the other item to it.
        var group = groups[0]
        var new_item_id = (group.item_id == id1) ? id2 : id1
        db.insert('alternative', {'item_id':new_item_id, 'group_id':group.group_id})
    } else if (groups.length == 2) { // both are in groups.  Merge second group into first group
        db.execute('update alternative where group_id = ? set group_id = ?', _.pluck(groups, 'group_Id'))
        // This is not very undoable, is it
    }
}

