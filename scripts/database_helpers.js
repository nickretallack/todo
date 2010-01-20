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

dbh.cursor = function(query, params, callback, unsafe_mode){
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

dbh.dict_cursor = function(query, params, callback){
    dbh.cursor(query, params, function(row){
        callback(rs.dict(row))
    })
}

dbh.dicts = function(query, params){
    var results = []
    dbh.dict_cursor(query, params, function(row){
        results.push(row)
    })
    return results
}

dbh.first = function(query, params){
    rs.dict(db.query.execute(query, params))
}

dbh.single_list = function(query, params){
    var results = []
    dbh.cursor(query, params, function(row){
        results.push(row.field(0))
    })
    return results
}

dbh.single = function(query, params){
    db.query.execute(query, params).field(0)
}

dbh.insert_query = function(table, data){
    var keys = _.keys(data).join(', ')
    var values = _.values(data)
    var qmarks = Functional.map('x->"?"', values).join(',')
    return {text:'insert into '+table+' ('+keys+') values ('+qmarks+')', params:values}
}

dbh.insert = function(table, data){
    var query = dbh.insert_query(table, data)
    db.execute(query.text, query.params)
}
