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

var proxy = 'http://testsjc20-bp01.revsw.net';
var hostname = 'http://qa-api-test-proxy-bp-varnish-ttl-grace.revsw.net';

function custom_sleep(time) {
	var stop = new Date().getTime();

	while(new Date().getTime() < stop + time) { 
		; 
	}
}

function test_cache_time(sleep_time, generic_object)
{
	var debug = generic_object['debug'];
	var operators = {
		'<': function(a, b) { return a < b },
		'>=': function(a, b) { return a >= b }
	};
	var final_description = 'Caching Time - ' + generic_object['desc'];
	var req_head = generic_object['request_headers'];
	var res_head = generic_object['response_headers'];

	it(final_description, function(done) {
		var options = {
			url: hostname + generic_object['obj'],
			proxy: proxy,
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

			done();
		});
	});
}

describe('Headers Manipulation Test - check specific timing related headers and the normal flow (no backend problems)', function() {
	var fr = '/fictive_resource.html';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_normalflow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false, 
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 1 - check that resource is not in cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 2 - check that the resource is served from cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 2, 'max': 3
		} 
	});
	test_cache_time(1000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 3 - check 1 second later that the resource is still served from cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 1, 'max': 2
		}
	});
	
	test_cache_time(2000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 4 - check first request when TTL<0 & GRACE>0 - check if object is served from cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /3/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': -1, 'max': 0
		}
	});

	test_cache_time(1000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 5 - check that the object was fetched from the backend after the first request that had TTL<0 & GRACE>0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 1, 'max': 2
		}
	});
	
	test_cache_time(1000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 6 - check TTL>0 and is in the expected range', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 0, 'max': 1
		}
	});

	test_cache_time(16000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 7 - check that the resource with TTL<0 & GRACE<0 is not served from cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		]
	});

});

describe('Headers Manipulation Test - check specific timing related headers and the backend responds just with 404 status codes', function() {
	var fr = '/fictive_resource.html';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_404flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '404',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'action': 'TTL', 
		'status_code': 404,
		'desc': 'Test 1 - check that resource is not in cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=2/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '404',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'action': 'TTL', 
		'status_code': 404,
		'desc': 'Test 2 - check again resource is not in cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=2/ }
		]
	});
	test_cache_time(2000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '404',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'action': 'TTL', 
		'status_code': 404,
		'desc': 'Test 3 - check with delay that resource is not in cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=2/ }
		]
	});
});

describe('Headers Manipulation Test - check specific timing related headers and the backend responds just with 500 status codes', function() {
	var fr = '/fictive_resource.html';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_500flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
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
		'obj': test_obj_1, 
		'request_headers': {
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
		'obj': test_obj_1, 
		'request_headers': {
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

describe('Headers Manipulation Test - check specific timing related headers on intermitent responses with 404 status codes', function() {
	var fr = '/fictive_resource.html';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_404half_flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false, 
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 1 - check that resource is not in cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 2 - check that resource is served from cache',
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 2, 'max': 3
		} 
	});
	test_cache_time(2000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 3 - check that resource is served from cache for the first request before TTL<0 & GRACE>0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 0, 'max': 1
		}
	});
	test_cache_time(4000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '404',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 4 - check that 200 response is returned when object has TTL<0 & GRACE>0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /3/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': -4, 'max': -3
		}
	});
 	test_cache_time(7000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '404',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 404,
 		'desc': 'Test 5 - check that 404 response is returned when object has TTL<0 & GRACE>0 and the resource was previously fetched from backend', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
 			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=2/ }
 		]
 	});
 	test_cache_time(1000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 200,
 		'desc': 'Test 6 - check that 200 response is returned when object has TTL<0 & GRACE<0 and the resource could not be fetched previously because the backend was sick and now the backend works', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
 			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
 		]
 	});
 	test_cache_time(1000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 200,
 		'desc': 'Test 7 - check that 200 response is returned when object has TTL>0 & GRACE>0', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
 			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
 			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
 		],
		'ttl_interval': {
			'min': 1, 'max': 2
		}
 	});
	test_cache_time(4000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '404',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 8 - check that 200 response is returned when object has TTL<0 & GRACE>0 - this request triggers a backed refresh', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': -3, 'max': -2
		}
	});
 	test_cache_time(7000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '404',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 404,
 		'desc': 'Test 9 - check that 404 response is returned when object has TTL<0 & GRACE>0 - an object refresh was previously triggered', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
 			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=2/ }
 		]
 	});
 	test_cache_time(6000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '404',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 404,
 		'desc': 'Test 10 - check that 404 response is returned when object is not in cache after a while', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
 			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=2/ }
 		]
 	});
	test_cache_time(0, {
		'debug': false, 
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 11 - first test that the resource is cacheable if available', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		]
	});
	test_cache_time(1000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 12 - second test that the resource is served from cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 1, 'max': 2
		} 
	});
});

describe('Headers Manipulation Test - check specific timing related headers on intermitent responses with 500 status codes', function() {
	var fr = '/fictive_resource.html';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_500half_flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false, 
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 1 - check that resource is not in cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		]
	});
	test_cache_time(0, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 2 - check that resource is served from cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 2, 'max': 3
		} 
	});
	test_cache_time(2000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 3 - check that resource is served from cache for first request before TTL<0 & GRACE>0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 0, 'max': 1
		}
	});
	test_cache_time(1000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '503',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 4 - check that 200 response is returned when object has TTL<0 & GRACE>0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /3/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': -1, 'max': 0
		}
	});
 	test_cache_time(4000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '503',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 200,
 		'desc': 'Test 5 - check that 200 response is returned when object has TTL<0 & GRACE>0 and the resource was previously fetched from backend', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /4/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
 		],
		'ttl_interval': {
			'min': -5, 'max': -4
		}
 	});
 	test_cache_time(1000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 200,
 		'desc': 'Test 6 - check again that 200 response is returned when object has TTL<0 & GRACE>0 and the resource was previously fetched from backend', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /5/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
 		]
 	});
 	test_cache_time(1000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 200,
 		'desc': 'Test 7 - check that 200 response is returned when object has TTL>0 & GRACE>0', 
 		'response_headers': [
 			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
 			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
 			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
 			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
 		],
		'ttl_interval': {
			'min': 1, 'max': 2
		}
 	});
	test_cache_time(4000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '500',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 8 - check that 200 response is returned when object has TTL<0 & GRACE>0 - check headers have the expected values', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': -3, 'max': -2
		}
	});
	test_cache_time(11000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '500',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 9 - check that 200 response is returned and TTL and GRACE updates according to settings',
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /3/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': -14, 'max': -13
		}
	});
	test_cache_time(1000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '500',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 10 - check that 200 response is returned and TTL and GRACE updates according to settings - last response served from cache when TTL<0 & GRACE>0',
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /4/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': -15, 'max': -14
		}
	});
	test_cache_time(1000, { 
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
			'CUSTOM-RESPONSE-CODE': '500',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 503,
		'desc': 'Test 11 - check that 503 response is returned when object has TTL<0 & GRACE<0',
		'response_headers': [
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
		]
	});
 	test_cache_time(4000, { 
 		'debug': false,
 		'obj': test_obj_1, 
 		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '500',
 			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
 			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
 		},
 		'status_code': 503,
 		'desc': 'Test 12 - check that 503 response is returned after a while when object has TTL<0 & GRACE<0 and the backend is still sick', 
 		'response_headers': [
 			{ 'k': 'X-Rev-Cache', 'v': /MISS/ }
 		]
 	});
	test_cache_time(0, {
		'debug': false, 
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 13 - first test that the resource is cacheable', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		]
	});
	test_cache_time(1000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=2',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 14 - second test that the resource is served from cache', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /3.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /15.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=4/ }
		],
		'ttl_interval': {
			'min': 1, 'max': 2
		} 
	});
});

describe('Headers Manipulation Test - check grace value in normal values in normal circumstances for test resource', function() {
	var fr = '/fictive_resource_for_grace.html';
	var random_number = Math.floor(Math.random() * 100000 + 1000);
	var test_obj_1 = fr + "?rand_version_grace_normal_flow=" + random_number.toString();

	test_cache_time(0, {
		'debug': false, 
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=7',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 1 - check that the resource is accessible', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /5.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /23.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=9/ }
		]
	});
	test_cache_time(1000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=7',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 2 - check that the resource has been cached', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /5.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /23.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=9/ }
		],
		'ttl_interval': {
			'min': 3, 'max': 4
		} 
	});
	test_cache_time(3000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=7',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 3 - check object TTL before TTL<0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /5.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /23.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /2/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=9/ }
		],
		'ttl_interval': {
			'min': 0, 'max': 1
		}
	});
	test_cache_time(23000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=7',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 4 - check object TTL and that the resource is still served from cache when GRACE is almost 0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /5.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /23.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /3/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=9/ }
		],
		'ttl_interval': {
			'min': -23, 'max': -22
		}
	});
	test_cache_time(4000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=7',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 5 - check that the object was refreshed after the first request with TTL<0 & GRACE>0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /5.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /23.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /HIT/ },
			{ 'k': 'X-Rev-Cache-Hits', 'v': /1/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=9/ }
		],
		'ttl_interval': {
			'min': 0, 'max': 1
		}
	});
	test_cache_time(24000, {
		'debug': false,
		'obj': test_obj_1, 
		'request_headers': {
 			'CUSTOM-RESPONSE-CODE': '200',
			'ADD-RESPONSE-HEADER-Cache-Control': 'public, max-age=7',
			'ADD-RESPONSE-HEADER-ttl-grace': 'working_add_header'
		},
		'status_code': 200,
		'desc': 'Test 6 - check object is not fetched from cache when TTL<0 & GRACE<0', 
		'response_headers': [
			{ 'k': 'ttl-grace', 'v': 'working_add_header' },
			{ 'k': 'x-rev-beresp-ttl', 'v': /5.000/ },
			{ 'k': 'x-rev-beresp-grace', 'v': /23.000/ },
			{ 'k': 'X-Rev-Cache', 'v': /MISS/ },
			{ 'k': 'Cache-Control', 'v': /public, max-age=9/ }
		]
	});
});
