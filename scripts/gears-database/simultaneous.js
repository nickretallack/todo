function save_simultaneous(id1, id2) {
    if (!id1 || !id2 || (id1 == id2)) return {created:false}

    var ids = [id1, id2].sort()
    if (db.selectSingle('select count(*) from simultaneous where item_id = ? and related_item_id = ?', ids))
        return {created:false}
    
    db.execute("insert into simultaneous (item_id, related_item_id) values (?,?)", ids)
    return {created:true}
}



function get_simultaneous(id){
    return db.selectAll("select * \
    from person join ( \
        select this_id as connected_id from friendship where that_id = ? \
        union select that_id as connected_id from friendship where this_id = ? \
    ) as connected_edges on id=connected_id", [id])
}



