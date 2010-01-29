// test("set up database", function(){
//     // shouldn't throw any errors or attempt to define the database twice
//     setup_database('test-db2')
//     equals('1.0', db.version)
// })




// test("gears ext select single", function(){
//     with_new_database(function(){
//         db.execute("create table a (b text)")
//         db.execute("insert into a (b) values ('hello')")
//         var x = db.selectAll("select * from b", [])
//         equals(x, 'hello')
//     })
// })
// 
// 
// // // Test Helpers
// function with_new_database(callback){
//     try{
//         db.open('test-db')
//         callback()
//     } finally {
//         db.remove()
//     }
// }
// 
// // Tests
// 
// function test_setup_database(){
//     // shouldn't throw any errors or attempt to define the database twice
//     setup_database('test-db')
//     db.close()
//     setup_database('test-db')
// 
//     var schema_version = db2.schema_version()
//     assertEquals(schema_version, db2.current_schema_version)
// 
//     db.remove()
// }
// 
// 
// function test_rs_dict(){
//     with_new_database(function(){
//         db.execute('create table example (text text, integer integer, float float)')
//         var data = {text:"test words", integer:5, float:12.3}
//         db.execute('insert into example (text, integer, float) values (?,?,?)', [data.text, data.integer, data.float])
//         var rowset = db.execute('select * from example')
//         assertEqualsJSON(data, rs.dict(rowset))
//     })
// }
// 
// function test_rs_dict_virtual_table(){
//     with_new_database(function(){
//         var data = {text1:"test words", text2:"stuff", rowid:1}
//         db.execute('create virtual table example using fts2(text1, text2)')
//         db.execute('insert into example (text1, text2) values (?,?)', [data.text1, data.text2])
//         var rowset = db.execute('select text1, text2, rowid from example')
//         assertEqualsJSON(data, rs.dict(rowset))
//     })
// }
// 
// function test_rs_dict_join(){
//     with_new_database(function(){
//         var data = {first:'hello', second:'goodbye'}
//         db.execute('create table first (text text)')
//         db.execute('create table second (text text, second_id integer)')
//         db.execute('insert into first (text) values (?)', [data.first])
//         db.execute('insert into second (text, second_id) values (?, last_insert_rowid())', [data.second])
//         var rowset = db.execute('select first.text as first, second.text as second from first join second on first.rowid = second_id')
//         assertEqualsJSON(data, rs.dict(rowset))
//     })
// }
// 
// function test_db2_helpers(){
//     with_new_database(function(){
//         var query = 'select * from example'
//         var data = [{text:'one', number:1}, {text:'two', number:2}, {text:'three', number:3}]
// 
//         db.execute('create table example (text text, number number)')
//         _.map(data, function(item){ db2.insert('example', item) })
// 
//         var index = 0
//         db2.cursor(query, [], function(row){
//             assertEqualsJSON(rs.dict(row), data[index])
//             index += 1
//         })
// 
//         index = 0
//         db2.dict_cursor(query, [], function(row){
//             assertEqualsJSON(row, data[index])
//             index += 1
//         })
//         
//         assertEqualsJSON(db2.dicts(query, []), data)
//         assertEqualsJSON(db2.first(query, []), data[0])
//         assertEqualsJSON(db2.single(query, []), data[0].text)
//         assertEqualsJSON(db2.singles(query, []), _.map(data, function(row){return row.text}))
//     })
// }
// 
// function test_smarter_search(){
//     try {
//         var inputs = ['first', 'second'] //, 'first second third', 'first third fourth']
//         setup_database('standard-db')
//         _.map(inputs, function(item){ console.debug(item); db2.insert('item', {text:item})} )
//         // $(inputs).each(function(){
//         //     db.execute('insert into item (text) values (?)', [this])
//         // })
// 
//         // var results = con
//         assertEquals(smarter_search('first'), ['first'])
//         // assertEquals(smarter_search('first'), ['first'])
//     } finally {
//         db.remove()
//     }
// }
