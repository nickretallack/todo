var setup_database = function(name){
    db = openDatabase(name, "1.0", "Todo List", 200000, function(db){
        db.changeVersion('', "1.0", function(tx){
            // All IDs shall be like guids.  Numeric IDs wont cut it when you have to merge multiple databases
            // that are being edited by other users.

            // ITEM: A single task or laundry list element
            // TODO: refer to these as tasks instead?
            tx.execute('create table item (id text, text text, note text \
                created_date text, start_date text, due_date text, done_date text, done_reason text)')
            // done_reason should be one of (manual, dropped, prerequisite, alternative)
            // More words if it was caused by a tree action. e.g. 

            // PREREQUISITE: After-items will be hidden until before-items are done
            tx.execute('create table prerequisite (before_item_id text, after_item_id text)')
            // Prerequisites are like a directed graph, though both directions are used.

            // SIMULTANEOUS: Items you could do at the same time
            tx.execute('create table simultaneous (item_id text, related_item_id text)')
            // Simultaneous items are like an undirected graph.  I'm implementing them as directed edges for simplicity
            // Every time I create one edge, I should create its complement edge as well.  Same goes for deleting.

            // ALTERNATIVE: Items you could do instead of any others in the group
            tx.execute('create table alternative (item_id text, group_id text)')
            // Alternative actions are like an abstract group.  If you associate with one, you associate with all of them.

            // EQUIPMENT: Could be required to do a task
            tx.execute('create table equipment (text name)')
            tx.execute('create table equipment_needed (item_id text, equipment_id text)')
        })
    })
}
