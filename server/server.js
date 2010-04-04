var PORT = 8000
var sys = require('sys'),
    path = require('path'),
    http = require('http'),
    paperboy = require('node-paperboy/lib/paperboy')
// 
// 
// // see if I can skimp on any of this
// var mongo = require('node-mongodb-native/lib/mongodb')
// var mongo_host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
// var mongo_port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;
// 
// var server = new mongo.Server(mongo_host, mongo_port, {})
// var db = new mongo.Db('test', server, {})
// var Collection = mongo.Collection

var WEBROOT = path.join(path.dirname(__filename), '..');

http.createServer(function(req, res) {
    if (req.method == 'POST') {
        collect_post_data(req, handle_request)
    } else {
        serve_static_or_get(req, res, handle_request)
    }
}).listen(PORT);

function collect_post_data(req, callback){
    var data = ''
    req.addListener('data', function(chunk){
        // sys.p("Data recieved!")
        // sys.p(chunk)
        data += chunk
    })
    req.addListener('end', function(){
        // sys.p("All done.  Result was:")
        // sys.p(data)
        callback(req, res, data)
    })
}

function serve_static_or_get(req, res, callback){
    paperboy
        .deliver(WEBROOT, req, res)
        // .before(function() {
        //     sys.puts('About to deliver: '+req.url);
        // })
        // .after(function() {
        //     sys.puts('Delivered: '+req.url);
        // })
        // .error(function() {
        //     sys.puts('Error delivering: '+req.url);
        // })
        .otherwise(function() {
            callback(req, res)
        });
}


function handle_request(request, response, data){
    sys.p(request)
    
    
    return http404(response)

    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write(data);
    response.close();    
}





function http404(res){
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Nothing to see here!');
    res.close();    
}



// http.createServer(function (req, res) {
//     res.writeHead(200, {'Content-Type': 'text/plain'});
//     res.write("Hello")
//     res.close()
//     // res.writeHead(200, {'Content-Type': 'text/plain'});
//     // db.open(function(db){
//     //     var things = new Collection(db, 'test', db.pkFactory)
//     //     things.find(function(err, cursor){
//     //         cursor.toArray(function(err, items){
//     //             res.write(JSON.stringify(items));
//     //             res.close();
//     //         })
//     //     })
//     // })
// }).listen(port)



/* Ok lets see what I need to do:

Might need to serve the static files from here to ensure ajax works.  Not sure.
    Try connecting without it first -- test connection
    Nope, didn't work.  I do need to serve static files.
    Only alternative is to proxy pass through apache, but that could kill performance.
    
    

*/

sys.puts('Server running at http://127.0.0.1:'+PORT);