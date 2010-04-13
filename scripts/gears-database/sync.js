function pending_messages(){
    return db.selectAll("select * from message where sent is null")
}

function send_pending_messages(){
    var messages = pending_messages()
    // messages = _.each(messages, function(message) {
    //     messages.data = JSON.parse(messages.data)
    // })
    var payload = JSON.stringify(messages)
    $.ajax({data:messages, contentType:'application/json', type:'post', url:'localhost:8080'} )
}



// 
// var message_handlers = {
//     'item-created': function(row) { save_item(row.patch, row.id, row.date, true) },
//     'item-edited': function(row) { save_item_details(JSON.parse(row.patch), true)},
//     'item-completed':function(row) { mark_item_done(row.id, row.patch, row.date, true)},
//     'item-uncompleted':function(row) { revive_item(row.id, row.date, true)}
// }
// 
// function apply_messages(messages){
//     _.each(messages, function(message){
//         var handle = [message.type, message.action].join('-')
//         message_handlers[handle](message)
//     })
// }
// 



//  How to apply a patch:
// First, dump it in the database and sort in order of timestamp.
// Next, roll up all messages.  For 'replace' fields, just use the latest value.
// For patches, it looks like you can just append them and it'll work.
// TODO: test that.
// 
// 
// ** How to send a patch:
// patches need a flag for sent:bool and applied:bool.  When a patch is created by a client,
// it should be immediately saved and applied.


var dmp = new diff_match_patch();

// db_patch('item', 'create', null, {})

function db_patch_create(entity, keys, data) {
    if (!entity || !keys) throw "Missing parameter"
    return db_patch(entity, 'create', keys, data)
}

function db_patch_update(entity, keys, data) {
    if (!entity || !keys || !data) throw "Missing parameter"
    
    var replace = data, merge = null

    if (entity == 'item') {
        var item = split_item_fields(data)
        merge = item.texts
        replace = item.details
    }

    return db_patch(entity, 'update', keys, replace, merge)
}

function db_patch_delete(entity, keys) {
    if (!entity || !keys) throw "Missing parameter"
    return db_patch(entity, 'delete', keys)
}


function db_patch(entity, method, keys, replace, merge) {
    if (!replace) replace = {}
    if (method == 'create') _.extend(replace, keys)

    var patch = create_patch({entity:entity, keys:keys, replace:replace, merge:merge, method:method})

    var value = JSON.stringify(patch)

    var record_fields = ['entity','method','created_date']
    var record = filter_fields(patch, record_fields, true)
    record.value = value
    record.applied_date = iso_date_now()
    record.key = make_message_key(patch.entity, patch.keys)
    
    var we_are_online = false
    if (we_are_online) {
        $.ajax({url:'/message', data:patch, dataType:'json', type:'POST', 
        success:function(response){
            console.debug("AWESOME", response)
            record.sent = true
            db.update(record)
        }, error:function(response){
            console.debug("Oh no!", response)
        }})
    }
    
    //db.insert('message', record)
    apply_patch(patch)
}

function make_message_key(entity, keys){
    var parts = object_keys_sorted_by_value(keys)
    parts.unshift(entity)
    return parts.join('-')
}

function object_keys_sorted_by_value(obj){
    var result = []
    var keys = _.keys(obj).sort()
    _.each(keys, function(key){
        result.push(obj[key])
    })
    return result
}



// assume patch contains: method, entity, keys, replace, merge
function create_patch(patch){
    patch.created_date = iso_date_now()
    if (patch.method == 'update') {
        var original = db.smart_get(patch.entity, patch.keys);
        _.each(original, function(value, key){

            if (key in patch.replace && key in patch.merge)
                throw "Invalid patch: "+key+" is in both replace and merge."

            // don't bother keeping values that are the same as existing ones
            if (key in patch.replace && value == patch.replace[key])
                delete patch.replace[key]

            if (key in patch.merge)
                 // no need to patch if it's a duplicate
                if (value == patch.merge[key])
                    delete patch.merge[key]

                // create patches for the merge data
                else {
                    if (!value) value = ''
                    var patches = dmp.patch_make(value, patch.merge[key])
                    patch.merge[key] = JSON.stringify(patches)
                }
        })
    }
    return patch
}

function apply_patch(patch){
    if (patch.method == 'create') {
        // TODO: consider applying the 'merge' parameter to some blank strings
        // and adding that into the insertion
        // TODO: iff this table has a 'date_created' field, populate it.
        // OR: do this in 'insert' instead.
        // In fact, I should handle the virtual item table inside the insert function too.
        // TODO: release this and document the database calls required to use it

        db.smart_insert(patch.entity, patch.replace)
    }
    
    else if (patch.method == 'delete') {
        db.smart_delete(patch.entity, patch.keys)
    }
    
    else if (patch.method == 'update') {
        if (!patch.merge || _.isEmpty(patch.merge)) {
            // If there are no merging fields, we can do this with a simple update
            db.smart_update(patch.entity, patch.keys, patch.replace)

        } else {
            var instance = db.smart_get(patch.entity, patch.keys)
            _.each(instance, function(value, key){

                if (key in patch.replace && key in patch.merge)
                    throw "Invalid patch: "+key+" is in both replace and merge."
                
                // Don't bother updating fields that haven't changed
                else if ( !(key in patch.replace || key in patch.merge))
                    delete instance[key]

                // Replace
                else if (key in patch.replace)
                    instance[key] = patch.replace[key]
                
                // Patch
                else if (key in patch.merge) {
                    if (!value) value = ''
                    var patches = JSON.parse(patch.merge[key])
                    var results = dmp.patch_apply(patches, value)
                    var new_value = results[0]
                    var successes = results[1]
                    instance[key] = new_value
                }
            })
            db.smart_update(patch.entity, patch.keys, instance)
        }
    }
}
