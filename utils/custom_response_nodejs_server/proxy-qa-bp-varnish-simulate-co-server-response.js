var http = require('http');

const PORT=40080;
const DEBUG=0; 

function handleRequest(request, response) {
	var response_code = 200;
	var response_header_list = {
		"Content-Type": "text/html",
		"NODEJS-CUSTOM-HEADER-v1": "v1 test data",
		"NODEJS-CUSTOM-HEADER-v2": "v2 test data"
	};

	if (DEBUG === 1) {
		console.log("URL:" + request.url);
	}

	for (var header in request.headers) {
		if (header.toUpperCase() === "CUSTOM-RESPONSE-CODE") {
			response_code = request.headers[header];
		}
		if (header.substring(0, 20).toUpperCase() === "ADD-RESPONSE-HEADER-") {
			var tmp_resp_header_name = header.substring(20).toUpperCase();
			var tmp_resp_header_value = request.headers[header];
			response_header_list[tmp_resp_header_name] = tmp_resp_header_value;
		}
		if (DEBUG === 1) {
			console.log("Header: " + header + "; HEAD VAL: " + request.headers[header]);
		}
	}

	response.writeHead(response_code, response_header_list);
	response.write("<html>\n");
	response.write("<head>\n");
	response.write("<title>This is a fake title</title>\n");
	response.write("</head>\n");
	response.write("<body>\n");
	response.write("<h1>Welcome to my programable web server status page!</h1>\n");
	response.write("<p>Your path is <strong>" + request.url + "</strong>.\n");
	response.write("<h3>Usage: </h3>\n");
	response.write("<p>You can specify the status code that the server will provide by setting the <strong>CUSTOM_RESPONSE_CODE</strong> header to the HTTP wanted status code value.</p>\n");
	response.write("<p>You can specify dynamic header values to the reponse of the server by appending the <strong>ADD_RESPONSE_HEADER_</strong> string to any request header name. The value would be copied from the selected header name and you can add whatever you want.</p>\n");
	response.write("</body>\n");
	response.write("</html>\n");

	response.end();
}

var server = http.createServer(handleRequest);
server.listen(PORT, function(){
	console.log("Server listening on: http://localhost:%s", PORT);
});
