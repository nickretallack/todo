// Result-set helpers
var rs = {}
rs.dict = function(result_set){
    results = {}
    var length = result_set.fieldCount()
    for (var index = 0; index < length; index++){
        results[result_set.fieldName(index)] = result_set.field(index)
    }
    return results
}

db2.cursor = function(query, params, callback, unsafe_mode){
    // if (unsafe_mode){
    //     // Gears database layer is acting really crummy and not substituting in
    //     // my parameters properly, so I'll substitute them myself.  Grr.  TODO: file bug somehow
    //     query = query.replace(/\?/, JSON.stringify(params.pop()))
    // }
    // 
    var result_set = db.execute(query, params)
    for (; result_set.isValidRow(); result_set.next()) {
        callback(result_set)
    }
    result_set.close()
}

db2.dict_cursor = function(query, params, callback){
    db2.cursor(query, params, function(row){
        callback(rs.dict(row))
    })
}

db2.dicts = function(query, params){
    var results = []
    db2.dict_cursor(query, params, function(row){
        results.push(row)
    })
    return results
}

db2.first = function(query, params){
    return rs.dict(db.execute(query, params))
}

db2.singles = function(query, params){
    var results = []
    db2.cursor(query, params, function(row){
        results.push(row.field(0))
    })
    return results
}

db2.single = function(query, params){
    return db.execute(query, params).field(0)
}

db2.insert_query = function(table, data){
    var keys = _.keys(data).join(', ')
    var values = _.values(data)
    var qmarks = _.map(values, function(){ return '?' }).join(',')
    return {text:'insert into '+table+' ('+keys+') values ('+qmarks+')', params:values}
}

db2.insert = function(table, data){
    var query = db2.insert_query(table, data)
    db.execute(query.text, query.params)
}
