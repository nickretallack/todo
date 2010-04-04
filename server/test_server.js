var port = 8000
var sys = require('sys')
var http = require('http')
http.createServer(function (req, res) {
    var data = []
    req.addListener('data', function(chunk){
        sys.p("Data recieved!")
        sys.p(chunk)
        data += chunk
    })
    req.addListener('end', function(){
        sys.p("All done.  Result was:")
        sys.p(data)
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(data);
        res.close();
    })

    // res.writeHead(200, {'Content-Type': 'text/plain',
    //                     'Access-Control-Allow-Origin': '*'});
    // res.write("Hello")
    // res.close()
}).listen(port)
sys.puts('Server running at http://127.0.0.1:'+port);