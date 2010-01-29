var tasks = ["Eat a banana", "Go to school", "Buy a boat", "Fly to france"]

function with_standard_database(callback){
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
        equals('1.0', db.version)
    } finally {
        db.remove()
    }
})


test("save items with unique ids, no duplicates", 5, function(){
    with_standard_database(function(){
        var first_result = save_item(tasks[0])
        equals(first_result.created, true)
        
        var second_result = save_item(tasks[0])
        equals(second_result.created, false)
        equals(first_result.id, second_result.id)
        
        var third_result = save_item(tasks[1])
        equals(third_result.created, true)
        ok(third_result.id != first_result.id)
    })
})

test("get items", function(){
    with_standard_database(function(){
        var tasks = ["Eat a banana", "Go to school", "Buy a boat", "Fly to France"]
        _.map(tasks, save_item)
        
        var items = get_items()
        var texts = _.map(items, function(item){return item.text})
        same(tasks, texts, "Should fetch all items")
        
        var available_items = get_available_items()
        console.debug(available_items)
        same(items, available_items, "Available and All should be the same with no prereqs enabled")
        
        
    })
})


test("search for words", function(){
    with_standard_database(function(){
        var tasks = ["Eat a banana", "Go to school", "Buy a boat", "Fly to France"]
        _.map(tasks, save_item)
        
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
    with_standard_database(function(){
        var task_id = save_item(tasks[0]).id
        var prerequisite1_id = save_item(tasks[1]).id
        var prerequisite2_id = save_item(tasks[2]).id
        var unrelated_id = save_item(tasks[3]).id
        
        save_prerequisite(task_id, prerequisite1_id)
        save_prerequisite(task_id, prerequisite2_id)

        var prerequisites = get_prerequisites(task_id)
        equals(prerequisites.length, 2)

        // This is one is shaky, since they aren't guaranteed to have a stable ordering
        equals(prerequisites[0].id, prerequisite1_id)
        equals(prerequisites[1].id, prerequisite2_id)
        
        var postrequisites = get_postrequisites(prerequisite1_id)
        equals(postrequisites[0].id, task_id)
        
        
        // shouldn't be able to save a prerequisite of itself
        save_prerequisite(unrelated_id, unrelated_id)
        equals(get_prerequisites(unrelated_id).length, 0)
        equals(get_postrequisites(unrelated_id).length, 0)
        
        // should be able to remove prerequisites
        remove_prerequisite(task_id, prerequisite2_id)
        var new_prerequisites = get_prerequisites(task_id)
        console.debug(new_prerequisites)
        equals(new_prerequisites.length, 1)
        equals(new_prerequisites[0].id, prerequisite1_id)
    })
})


