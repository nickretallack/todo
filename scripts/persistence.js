function add_to_database(text, callback){
    /* Creates a new item and returns its id if the text is unique.
     * Otherwise, returns the id of an existing item with the same text. */
    
    // var result_id
    db.transaction(function(tx){
        console.debug("starting transaction")
        tx.executeSql('select id from item where text = ?', [text], function(result){
            console.debug("success number one", result)
            callback(result.id)
            // result_id = result.id
            
            if (!result) {
                console.debug("no result")
                var id = Math.uuid()
                tx.executeSql('insert into item (id, text, created_date) values (?, ?, date(?))', 
                    [id, text, Date.now().toISOString()] );
                callback(id)
                // result_id = id
            }
        }, function(error){console.debug(error.code)})
    })
    // return result_id
}

test("add an item to the database twice", function(){
    expect(1)
    var test_item = "test item"
    add_to_database(test_item, function(id){ 
        var insert_id = id
        add_to_database(test_item, function(id){ 
            var second_id = id 
            equals( insert_id, second_id )
        })
    })
})