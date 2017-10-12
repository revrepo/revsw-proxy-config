/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any. The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 *
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var request = require('request');

var proxy = 'testsjc20-bp01.revsw.net';

var hostname_internal = '0efbbd35-a131-4419-b330-00de5eb3696a.revsdk.net';
var x_rev_hostname_internal = 'test-proxy-nodejs-server-status-frontend-control.revsw.net';

var hostname_external = '0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net';
var x_rev_hostname_external = 'httpbin_org.revsw.net';

function custom_sleep(time) {
	var stop = new Date().getTime();

	while(new Date().getTime() < stop + time) {
		;
	}
}

function test_cache_time(sleep_time, generic_object)
{
	var debug = generic_object['debug'];
	var protocol = "https";
	var operators = {
		'<': function(a, b) { return a < b },
		'>=': function(a, b) { return a >= b }
	};
	var final_description = 'Caching Time - ' + generic_object['desc'];
	var req_head = generic_object['request_headers'];
	var res_head = generic_object['response_headers'];
	var res_body = generic_object['response_body'];

	if (generic_object['get_proto']) {
		protocol = generic_object['get_proto'];
	}


	it(final_description, function(done) {
		var options = {
			url: "http://" + generic_object['hostname'] + generic_object['obj'],
			proxy: protocol + "://" + proxy,
			headers: req_head
		};

		if (debug) {
			console.log(options);
		}

		custom_sleep(sleep_time);

		request.get(options, function (err, res, body) {

			if (debug) {
				console.log("Status code: ", res.statusCode);
				console.log("Headers: ", res.headers);
				console.log("Response content:", res.body);
			}

			if (res.statusCode !== generic_object['status_code']) {
				throw new Error("Unexpected status " + res.statusCode + " code found instead of expected " + generic_object['status_code'] + "!");
				done();
			}

			if (err) {
				throw err;
				done();
			}

			// check if headers match the specified values
			for (var i in res_head) {
				var key = res_head[i]["k"].toLowerCase();
				var val = res_head[i]["v"];

				if (!res.headers[key]) {
					throw new Error("Error! Header " + key + " does not exist!");
					done();
				}
				if (!res.headers[key].match(val)) {
					throw new Error("Error! Header " + key + " value doesn't match the specified value!");
					done();
				}
			}

			// check if ttl header is in the specified range
			if (generic_object['ttl_interval']) {
				var interval = generic_object['ttl_interval'];

				if (res.headers['x-rev-obj-ttl']) {
					var ttl_interval = parseInt(res.headers['x-rev-obj-ttl']);
					if (!(ttl_interval >= interval["min"] && ttl_interval <= interval["max"])) {
						throw Error("TTL not in the specified interval!");
						done();
					}
				} else {
					throw Error("No x-rev-obj-ttl header found!");
					done();
				}
			}

			// check content of body
			if (res_body) {
				for (var i in res_body) {
					var val = res_body[i];

					if (!res.body.match(val)) {
						throw new Error("Error! Response body should match: " + val);
						done();
					}
				}
			}

			done();
		});
	});
}

describe('SDK external test - basic header and ttl & grace', function() {
  this.timeout(500000);
	var fr = '/cache/30';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_basic=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'status_code': 200,
		'desc': 'Test 1 - check that resource is not in cache',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /30.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=30/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'status_code': 200,
		'desc': 'Test 2 - check that the resource is served from cache',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /30.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=30/ }
		],
		'ttl_interval': {
			'min': 29, 'max': 30
		}
	});
	test_cache_time(1000, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'status_code': 200,
		'desc': 'Test 3 - check 1 second later that the resource is still served from cache',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /30.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=30/ }
		],
		'ttl_interval': {
			'min': 27, 'max': 29
		}
	});

});

describe('SKD external test - check response for 404 revsdk requests', function() {
  this.timeout(500000);
	var fr = '/status/404';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_404flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'action': 'TTL',
		'status_code': 404,
		'desc': 'Test 1 - check that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'action': 'TTL',
		'status_code': 404,
		'desc': 'Test 2 - check again resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(2000, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'action': 'TTL',
		'status_code': 404,
		'desc': 'Test 3 - check with delay that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
});

describe('SDK external test - check headers for 500 status code for the revsdk component', function() {
  this.timeout(500000);
	var fr = '/status/500';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_500flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'action': 'TTL',
		'status_code': 503, // default varnish response code
		'desc': 'Test 1 - check that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'action': 'TTL',
		'status_code': 503, // default varnish response code
		'desc': 'Test 2 - check again that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(3000, {
		'debug': false,
		'hostname': hostname_external,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external
		},
		'action': 'TTL',
		'status_code': 503, // default varnish response code
		'desc': 'Test 3 - check with delay that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
});

describe('SDK external test - check http proto over https', function() {
  this.timeout(500000);
	var fr = '/get';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_proto=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'get_proto': 'https',
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external,
			'X-Rev-Proto': "http"
		},
		'status_code': 200,
		'desc': 'Test 1 - check that resource contains specified values in headers and body',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /0.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ }
		],
		'response_body': [
			'"Host": "' + x_rev_hostname_external + '",',
			'"X-Orig-Host": "0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net",',
			'"X-Rev-Host": "' + x_rev_hostname_external + '",',
			'"url": "http://' + x_rev_hostname_external + '/get'
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'get_proto': 'https',
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external,
			'X-Rev-Proto': "http"
		},
		'status_code': 200,
		'desc': 'Test 2 - check headers and body content again',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /0.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ }
		],
		'response_body': [
			'"Host": "' + x_rev_hostname_external + '",',
			'"X-Orig-Host": "0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net",',
			'"X-Rev-Host": "' + x_rev_hostname_external + '",',
			'"url": "http://' + x_rev_hostname_external + '/get'
		]
	});
	test_cache_time(1000, {
		'debug': false,
		'hostname': hostname_external,
		'get_proto': 'https',
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external,
			'X-Rev-Proto': "http"
		},
		'status_code': 200,
		'desc': 'Test 3 - check 1 second later the response headers and body',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /0.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
		],
		'response_body': [
			'"Host": "' + x_rev_hostname_external + '",',
			'"X-Orig-Host": "0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net",',
			'"X-Rev-Host": "' + x_rev_hostname_external + '",',
			'"url": "http://' + x_rev_hostname_external + '/get'
		]
	});

});

describe('SDK external test - check https proto over https', function() {
  this.timeout(500000);
	var fr = '/get';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_proto=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'get_proto': 'https',
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external,
			'X-Rev-Proto': "https"
		},
		'status_code': 200,
		'desc': 'Test 1 - check that resource contains specified values in headers and body',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /0.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ }
		],
		'response_body': [
			'"Host": "' + x_rev_hostname_external + '",',
			'"X-Orig-Host": "0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net",',
			'"X-Rev-Host": "' + x_rev_hostname_external + '",',
			'"url": "https://' + x_rev_hostname_external + '/get'
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_external,
		'get_proto': 'https',
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external,
			'X-Rev-Proto': "https"
		},
		'status_code': 200,
		'desc': 'Test 2 - check headers and body content again',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /0.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ }
		],
		'response_body': [
			'"Host": "' + x_rev_hostname_external + '",',
			'"X-Orig-Host": "0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net",',
			'"X-Rev-Host": "' + x_rev_hostname_external + '",',
			'"url": "https://' + x_rev_hostname_external + '/get'
		]
	});
	test_cache_time(1000, {
		'debug': false,
		'hostname': hostname_external,
		'get_proto': 'https',
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_external,
			'X-Rev-Proto': "https"
		},
		'status_code': 200,
		'desc': 'Test 3 - check 1 second later the response headers and body',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /0.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
		],
		'response_body': [
			'"Host": "' + x_rev_hostname_external + '",',
			'"X-Orig-Host": "0efbbd35-a131-4419-b330-00de5eb3696b.revsdk.net",',
			'"X-Rev-Host": "' + x_rev_hostname_external + '",',
			'"url": "https://' + x_rev_hostname_external + '/get'
		]
	});

});

// Internal tests
describe('SDK internal test - basic header and ttl & grace', function() {
  this.timeout(500000);
 	var fr = '/fictive_resource.html';
 	var random_number = Math.floor(Math.random() * 100000 + 1000);
 	var test_obj_1 = fr + "?rand_internal_version_basic=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=21',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 1 - check that resource is not in cache',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696a.revsdk.net/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /21.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=21/ },
			{ 'k': 'ttl-grace', 'v': /working_add_header/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=21',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 2 - check that the resource is served from cache',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696a.revsdk.net/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /21.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=21/ },
			{ 'k': 'ttl-grace', 'v': /working_add_header/ }
		],
		'ttl_interval': {
			'min': 19, 'max': 21
		}
	});
	test_cache_time(1000, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=21',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 3 - check 1 second later that the resource is still served from cache',
		'response_headers': [
			{ 'k': 'x-rev-sdk', 'v': /1/ },
			{ 'k': 'x-rev-host', 'v': /0efbbd35-a131-4419-b330-00de5eb3696a.revsdk.net/ },
			{ 'k': 'x-rev-beresp-ttl', 'v': /21.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /60.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=21/ },
			{ 'k': 'ttl-grace', 'v': /working_add_header/ }
		],
		'ttl_interval': {
			'min': 17, 'max': 19
		}
	});

});

describe('SDK internal test - check headers for 404 status code for the revsdk component', function() {
  this.timeout(500000);
 	var fr = '/fictive_resource.html';
 	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_internal_version_404flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
			'CUSTOM-RESPONSE-CODE': '404'
		},
		'action': 'TTL',
		'status_code': 404,
		'desc': 'Test 1 - check that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
			'CUSTOM-RESPONSE-CODE': '404'
		},
		'action': 'TTL',
		'status_code': 404,
		'desc': 'Test 2 - check again that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(3000, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
			'CUSTOM-RESPONSE-CODE': '404'
		},
		'action': 'TTL',
		'status_code': 404,
		'desc': 'Test 3 - check with delay that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
});

describe('SDK internal test - check headers for 500 status code for the revsdk component', function() {
  this.timeout(500000);
 	var fr = '/fictive_resource.html';
 	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_internal_version_500flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
			'CUSTOM-RESPONSE-CODE': '500'
		},
		'action': 'TTL',
		'status_code': 503, // default varnish response code
		'desc': 'Test 1 - check that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
			'CUSTOM-RESPONSE-CODE': '500'
		},
		'action': 'TTL',
		'status_code': 503, // default varnish response code
		'desc': 'Test 2 - check again that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
	test_cache_time(3000, {
		'debug': false,
		'hostname': hostname_internal,
		'obj': test_obj_1,
		'request_headers': {
			'X-Rev-Host': x_rev_hostname_internal,
			'CUSTOM-RESPONSE-CODE': '500'
		},
		'action': 'TTL',
		'status_code': 503, // default varnish response code
		'desc': 'Test 3 - check with delay that resource is not in cache',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
});

