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
var request = require('supertest');

////// treat the follwing cases
//// ADD
// test if header exists - if not exists fail
// test if header has the provided value - if not correct value fail
//// REPLACE
// test if header exists - if not exists fail
// test if header has the provided value - if not correct value fail
//// DELETE 
// test if header exists - if exists fail
//////
function check_varnish_headers(generic_object)
{
	var operators = {
		"<": function(a, b) { return a < b },
		">": function(a, b) { return a > b },
		"<=": function(a, b) { return a <= b },
		">=": function(a, b) { return a >= b },
		"==": function(a, b) { return a == b },
		"===": function(a, b) { return a === b }
	};
	var expected_header = generic_object["expected_header"];
	var expected_header_value = generic_object["expected_header_value"];
	var final_description = 'Varnish Header Test - Varnish header ' + generic_object['action'] + ' function works - ' + generic_object['expected_header'];

	it(final_description, function(done) {
		request(url)
			.get(generic_object['get_obj'])
			.set('Host', domain_header)
			.expect('Content-Type', generic_object['content_type'])
			.expect(generic_object['base_header'], generic_object['base_header_value'])
			.end(function(err, res) {
				if (err) {
					throw err;
				}
				res.should.have.status(200);
				var response_json = JSON.stringify(res.header);
				var header_occurences = response_json.search(expected_header);
				if (generic_object['action'] in [ "ADD", "REPLACE" ]) {
					// check if header exists
					// check if header has the expected value
					console.log(res.header); /// print the format to be sure that the format is correct AND DELETE THIS LINE AFTER this is done
					var header_found = operators["==="](header_occurences, 1);
					if (header_found === false) {
						throw new Error(generic_object['action'] + " test failed - expected header value was not found!");
						done();
					}
					var match_header_value = response_json.search(expected_header_value); ///////////// RESEARCH THE HEADER FORMAT TO GET THE EXACT VALUE AND COMPARE IT
					if (match_header_value === false) {
						throw new Error(generic_object['action'] + " test failed - expected header value was found, but the content doesn't match the specified value!");
					}

				} else if (generic_object['action'] === "DELETE") {
					// fail if header exists
					var no_header_found = operators["==="](header_occurences, 0);
					if (no_header_found === false) {
						throw new Error(generic_object['action'] + " test failed - unexpected header value was found!");
					}
				} else {
					throw new Error('Unknow type of check action provided for test: [' + generic_object['action'] + ']');
				}
				done();
			});
	});
}

// add a new domain and continue

describe('Headers Manipulation Test - Varnish specific resource - specific headers', function() {
	var url = 'http://testsjc20-bp01.revsw.net';
	var envdump = '/cgi-bin/envtest.cgi';
	var resource_path_1 = '/resource_path_1';
	var resource_path_2 = '/resource_path_2';
	var resource_path_3 = '/resource_path_3';
	var domain_header = 'test-proxy-headers.revsw.net';
	var test_object_js_1 = '/test_object_purge_api01.js';

	// TEST ADD functionality
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "ADD",
		"content_type": /text/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "ADD_HEADER_WAS_DONE_WITH_SUCCESS_for_text",
		"expected_header_value": "ADD_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_text"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "ADD",
		"content_type": /javascript/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "ADD_HEADER_WAS_DONE_WITH_SUCCESS_for_js",
		"expected_header_value": "ADD_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_js"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "ADD",
		"content_type": /image/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "ADD_HEADER_WAS_DONE_WITH_SUCCESS_for_image",
		"expected_header_value": "ADD_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_image"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "ADD",
		"content_type": /flash/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "ADD_HEADER_WAS_DONE_WITH_SUCCESS_for_flash",
		"expected_header_value": "ADD_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_flash"
	});

	// TEST REPLACE functionality
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "REPLACE",
		"content_type": /text/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "REPLACE_HEADER_WAS_DONE_WITH_SUCCESS_for_text",
		"expected_header_value": "REPLACE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_text"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "REPLACE",
		"content_type": /javascript/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "REPLACE_HEADER_WAS_DONE_WITH_SUCCESS_for_js",
		"expected_header_value": "REPLACE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_js"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "REPLACE",
		"content_type": /image/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "REPLACE_HEADER_WAS_DONE_WITH_SUCCESS_for_image",
		"expected_header_value": "REPLACE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_image"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "REPLACE",
		"content_type": /flash/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "REPLACE_HEADER_WAS_DONE_WITH_SUCCESS_for_flash",
		"expected_header_value": "REPLACE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_flash"
	});

	// TEST DELETE functionality
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "DELETE",
		"content_type": /text/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "DELETE_HEADER_WAS_DONE_WITH_SUCCESS_for_text",
		"expected_header_value": "DELETE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_text"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "DELETE",
		"content_type": /javascript/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "DELETE_HEADER_WAS_DONE_WITH_SUCCESS_for_js",
		"expected_header_value": "DELETE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_js"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "DELETE",
		"content_type": /image/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "DELETE_HEADER_WAS_DONE_WITH_SUCCESS_for_image",
		"expected_header_value": "DELETE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_image"
	});
	check_varnish_headers({
		"get_obj": test_object_js_1, ///////////////// replace with good value
		"action": "DELETE",
		"content_type": /flash/,
		"base_header": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"expected_header": "DELETE_HEADER_WAS_DONE_WITH_SUCCESS_for_flash",
		"expected_header_value": "DELETE_HEADER_VALUE_WAS_DONE_WITH_SUCCESS_for_flash"
	});

	// END END END
});
