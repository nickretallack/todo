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
            db.raw_insert('item', item_details)
            db.run('insert into item_text (rowid, text, note) values (last_insert_rowid(), ?, ?)', [item.text, item.note]);
        })

        // insert prerequisites
        _.each(data.prerequisites, function(prerequisite){
            db.raw_insert('prerequisite', prerequisite)
        })
    })
}
