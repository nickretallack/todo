var tasks = ["Eat a banana", "Go to school", "Buy a boat", "Fly to france"]

function with_db(callback){
    try {
        setup_database('test-full')
        callback()
    } finally {
        db.remove()
    }
}

test("set up database", function(){
    // shouldn't throw any errors or attempt to define the database twice
    try {
        setup_database('test')
        ok(db.version)
    } finally {
        db.remove()
    }
})


test("save items with unique ids, no duplicates", function(){
    with_db(function(){
        var first_result = save_item(tasks[0])
        equals(first_result.created, true)
        
        var second_result = save_item(tasks[0])
        equals(second_result.created, false)
        equals(first_result.id, second_result.id)
        
        var third_result = save_item(tasks[1])
        equals(third_result.created, true)
        ok(third_result.id != first_result.id)
        
        // no blank tasks
        var blank_result = save_item('')
        same(blank_result, {id:null, created:false})
    })
})

test("get items", function(){
    with_db(function(){
        var tasks = ["Eat a banana", "Go to school", "Buy a boat", "Fly to France"]
        _.map(tasks, function(text) {save_item(text)})

        // console.debug(db.selectAll("select start_time, end_time from item where start_time is n"))
        
        var items = get_all_items()
        var texts = _.pluck(items, 'text') //function(item){return item.text})
        _.each(tasks, function(task){
            contains(texts, task, "Should fetch all items")
        })
        
        var available_items = get_available_items()
        same(items, available_items, "Available and All should be the same with no prereqs enabled")

        save_prerequisite(items[0].id, items[1].id)
        available_items = get_available_items()
        same(available_items.length, 3, "One less item is available now")
        
        // "Done items should not be available"
        mark_item_done(items[3].id)
        available_items = get_available_items()
        same(available_items.length, 2, "Done items should not be available")
    })
})


test("search for words", function(){
    with_db(function(){
        var tasks = ["Eat a banana", "Go to school", "Buy a boat", "Fly to France"]
        _.map(tasks, function(text) {save_item(text)})
        
        same(search_items(''), [], "Blank search finds nothing")
        same(search_items('a'), [], "Searching for stopwords should give you nothing")
        same(search_items('ea'), ["Eat a banana"], "Stemming should work case insensitively")
        same(search_items('ea flarp'), [], "Stemming shouldn't work on the second word")
        same(search_items('ea a'), [], "Shouldn't stem at all if the last word is too short")        
        same(search_items('eat france banana'), ["Eat a banana", "Fly to France"], 
            "Results with the same word twice should sort first")
        same(search_items('eat france fl'), ["Fly to France", "Eat a banana"], 
            "... regardless of insertion order and stemming behavior")
        
    })
})


test("create prerequisites", function(){
    with_db(function(){
        var task_id = save_item(tasks[0]).id
        var prerequisite1_id = save_item(tasks[1]).id
        var prerequisite2_id = save_item(tasks[2]).id
        var unrelated_id = save_item(tasks[3]).id
        
        var r1 = save_prerequisite(task_id, prerequisite1_id)
        var r2 = save_prerequisite(task_id, prerequisite2_id)
        equals(r1.created, true)
        equals(r2.created, true)

        var prerequisites = get_prerequisites(task_id)
        equals(prerequisites.length, 2)

        // This is one is shaky, since they aren't guaranteed to have a stable ordering
        equals(prerequisites[0].id, prerequisite1_id)
        equals(prerequisites[1].id, prerequisite2_id)
        
        var postrequisites = get_postrequisites(prerequisite1_id)
        equals(postrequisites[0].id, task_id)
        
        
        // shouldn't be able to save a prerequisite of itself
        var r3 = save_prerequisite(unrelated_id, unrelated_id)
        equals(get_prerequisites(unrelated_id).length, 0)
        equals(get_postrequisites(unrelated_id).length, 0)
        equals(r3.created, false)
        
        // should be able to remove prerequisites
        remove_prerequisite(task_id, prerequisite2_id)
        var new_prerequisites = get_prerequisites(task_id)
        equals(new_prerequisites.length, 1)
        equals(new_prerequisites[0].id, prerequisite1_id)
    })
})

test("get item details", function(){
    with_db(function(){
        var id = save_item("Eat a banana").id
        var details = get_item_details(id)
        equals(details.text, "Eat a banana")
        ok(details.created_date)
        ok(details.id)
    })
})

test("complete and drop items", function(){
    with_db(function(){
        var id = save_item("Eat a banana").id
        equals(get_available_items().length, 1)
        contains( _.pluck(get_available_items(), 'text'), "Eat a banana")
        equals(get_unfinished_items().length, 1)
        equals(get_finished_items().length, 0)

        mark_item_done(id, "completed")
        equals(get_available_items().length, 0)
        equals(get_unfinished_items().length, 0)
        equals(get_finished_items().length, 1)
        contains( _.pluck(get_finished_items(), 'text'), "Eat a banana")
    })    
})

test("completed items should not act as blocking prerequisites", function(){
    with_db(function(){
        var before = {text:"Do Before"}
        var after = {text:"Do After"}
        
        before.id = save_item(before.text).id
        after.id = save_item(after.text).id
        
        save_prerequisite(after.id, before.id)
        same( _.pluck(get_available_items(), 'text'), [before.text], "Only the prerequisite is visible")
        
        mark_item_done(before.id, "completed")
        same( _.pluck(get_available_items(), 'text'), [after.text], "With the completed item gone, its postrequisite is now visible")
    })    
})

test("export and import data without changing it", function(){
    with_db(function(){
        // create arbitrary data
        var tasks = ["Eat a banana", "Go to school", "Buy a boat", "Fly to france"]
        var ids = _.map(tasks, function(text){ return save_item(text).id })
        save_prerequisite(ids[0], ids[1])
        save_prerequisite(ids[1], ids[2])
        save_prerequisite(ids[0], ids[3])
        
        var items = get_all_items()
        var available_items = get_available_items()
        // equals( get_all_items().length, 4 )

        // export it
        var data = export_data()
        
        db.remove()
        setup_database('other-database')

        same( get_all_items(), [] )
        same( get_available_items(), [])

        import_data(data)
        
        same( get_all_items(), items )
        same( get_available_items(), available_items)

    })
})

// test("misc functions", function(){
//     with_db(function(){
//         var data = {key:'value', 'something':5}
//         same(equals_pairs(data), "key='value', something=5")
//     })
// })


test("item details", function(){
    with_db(function(){
        var item = {text:"Go to the mall", note:"Shopping is fun!", start_time:"8am", end_time:"9pm", due_date:"June 21, 2010"}
        item.id = save_item(item.text).id
        save_item_details(item)
        var saved_item = get_item_details(item.id)
        same([saved_item.text, saved_item.note], [item.text, item.note])
        same([saved_item.start_time, saved_item.end_time, saved_item.due_date, saved_item.start_date], 
             ["08:00:00",           "21:00:00",         "2010-06-21T07:00:00.000Z",null])
    })
})

test("Items should become unavailable based on times", function(){
    var text = "Go to the mall"
    with_db(function(){
        var id = save_item(text).id
        save_item_details({id:id, text:text, start_date:"tomorrow"})
        same(get_available_items(), [], "Tomorrow's items should not be visible yet")
    })

    with_db(function(){
        var id = save_item(text).id
        save_item_details({id:id, text:text, start_date:"yesterday"})
        same(get_available_items().length, 1, "Yesterdays items should still be visible")
    })
        
    with_db(function(){
        var id = save_item(text).id
        save_item_details({id:id, text:text, start_time:"+1 minute"})
        same(get_available_items().length, 0, "Hide items that haven't started yet")
    })

    with_db(function(){
        var id = save_item(text).id
        save_item_details({id:id, text:text, end_time:"-1 minute"})
        same(get_available_items().length, 0, "Hide items that are past due")
    })

    with_db(function(){
        var id = save_item(text).id
        save_item_details({id:id, text:text, start_time:"-1 minute", end_time:"+1 minute"})
        same(get_available_items().length, 1, "Standard interval")
    })

    with_db(function(){
        var id = save_item(text).id
        save_item_details({id:id, text:text, start_time:"+2 minutes", end_time:"+1 minute"})
        same(get_available_items().length, 1, "Time ranges can cross midnight")
    })
})

// test("messages", function(){
//     var messages
//     var items
//     var id
//     var item
// 
//     with_db(function(){
//         id = save_item("hello").id
//         save_item_details({id:id, text:"goodbye", note:"This is the note", start_time:'today'})
//         
//         items = get_all_items()
//         item = get_item_details(id)
//         
//         messages = pending_messages()
//         same(messages.length, 2)
//     })
//     
//     with_db(function(){
//         same(get_all_items(), [])
//         apply_messages(messages)
//         same(get_all_items().length, 1)
// 
//         var sync_item = get_item_details(id)
//         same(item, sync_item)
//         
//     })
// })

test("extended database functions", function(){
    with_db(function(){
        same(db.quote_equals({a:'hello', b:5}), "a='hello', b=5")

        var id = Math.uuid()
        var key = {id:id}
        var item_prototype = {id:id, done_reason:'dropped'}

        db.raw_insert('item', item_prototype)
        var created_item = db.raw_get('item', key)
        same(created_item.done_reason, item_prototype.done_reason, "created")

        db.raw_update('item', key, {done_reason:'completed'})
        var updated_item = db.raw_get('item', key)
        same(updated_item.done_reason, 'completed', 'updated')
        
        db.raw_delete('item', key)
        var deleted_item = db.raw_get('item', key)
        same(deleted_item, null, 'deleted')
    })

    with_db(function(){

        var id = Math.uuid()
        var key = {id:id}
        var item_prototype = {id:id, text:'awesome', done_reason:'dropped'}

        db.insert('item', item_prototype)
        var created_item = db.get('item', key)
        same(created_item.done_reason, item_prototype.done_reason, 'created')
        same(created_item.text, item_prototype.text)

        db.update('item', key, {done_reason:'completed', text:'spastic'})
        var updated_item = db.get('item', key)
        same(updated_item.done_reason, 'completed', 'updated')
        same(updated_item.text, 'spastic')
        
        db.delete_('item', key)
        var deleted_item = db.get('item', key)
        same(deleted_item, null, 'deleted')
    })
})

test("patches", function(){
    with_db(function(){
        // Lets see what it looks like when you make an item
        // var patch = create_patch({entity:'item', method:'create', replace:{id:Math.uuid(), text:'Hello', note:'Sup'}})
        // console.debug(patch)
        
        // var patch = db_patch_create('item', {})
        
        
        
    })
})

function db_test(){
    if (arguments.length == 0)
        throw "Test requires a function to run"
    else if (arguments.length == 1){
        var callable = arguments[0]
        test("anonymous test", function(){ with_db(callable)})
    } else if (arguments.length == 2){
        var callable = arguments[1]
        test(arguments[0], function(){ with_db(callable)})
    }
    else if (arguments.length == 3){
        var callable = arguments[2]
        test(arguments[0], arguments[1], function(){ with_db(callable)})
    }
}
    


db_test("voting", 4, function(){
    var id = save_item("testing item").id
    var item = get_item_details(id)
    ok(can_vote_on(item), "Should be able to vote initially")
    ok(vote_on_item(id), "Vote should happen")
    var item = get_item_details(id)
    same(item.vote_count, 1, "Should have one vote")
    ok(!can_vote_on(item), "Should no longer be able to vote")
})
