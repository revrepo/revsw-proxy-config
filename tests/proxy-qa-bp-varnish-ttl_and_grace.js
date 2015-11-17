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


/// REWRITE FUNCTION - THIS WILL treat the follwing casese


//// TEST GRACE VALUE AND TTL VALUE
//// TEST THE RESPONSE OF THE BACKEND SERVERS after the resource enters in grace period and exists from the grace period


function second_test_batch(generic_object)
{
	var operators = {
		"<": function(a, b) { return a < b },
		">=": function(a, b) { return a >= b }
	};
	var final_description = 'Header Test - BP header ' + generic_object['action'] + ' function works - ' + generic_object['description'];

	it(final_description, function(done) {
		request(url)
			.get(generic_object['get_obj'])
			.set('Host', domain_header)
			.expect('Content-Type', generic_object['content_type'])
			.expect(generic_object['base_header_key'], generic_object['base_header_value'])
			.end(function(err, res) {
				if (err) {
					throw err;
				}
				res.should.have.status(200);
				if (generic_object['action'] === "ADD") {
					// nothing special needs to be done for add
				} else if (generic_object['action'] === "REPLACE") {
					// nothing special needs to be done for replace
				} else if (generic_object['action'] === "DELETE") {
					// add here extra code
					var response_json = JSON.stringify(res.header);
					var i = response_json.search(generic_object['base_delete_header_value']);
					var delete_problem = operators[generic_object["delete_op"]](i, 1);
					if (delete_problem) {
						throw new Error("Delete Broken");
					}
				} else {
					throw new Error('Unknow type of check action for second test: [' + generic_object['action'] + ']');
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

	second_test_batch({
		"get_obj": test_object_js_1,
		"content_type": /javascript/,
		"action": "ADD",
		"description": "This-Is-A-Test"
		"base_header_key": "This-Is-A-Test",
		"base_header_value": /Value-One/
	});
	second_test_batch({
		"get_obj": test_object_js_1,
		"content_type": /javascript/,
		"action": "ADD",
		"description": "This-Is-B-Test"
		"base_header_key": "This-Is-B-Test",
		"base_header_value": /Value-Two/
	});
	second_test_batch({
		"get_obj": test_object_js_1,
		"content_type": /javascript/,
		"action": "REPLACE",
		"description": "X-Rev-obj-ttl: We-Are-Fast-As-A-Test"
		"base_header_key": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/
	});
	second_test_batch({
		"get_obj": test_object_js_1,
		"content_type": /javascript/,
		"action": "DELETE",
		"description": "X-Rev-Host"
		"base_header_key": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"base_delete_header_value": "X-REV-HOST",
		"delete_op": ">="
	});
	second_test_batch({
		"get_obj": test_object_js_1,
		"content_type": /javascript/,
		"action": "DELETE",
		"description": "X-Rev-BE-1st-Byte-Time"
		"base_header_key": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"base_delete_header_value": "X-Rev-BE-1st-Byte-Time",
		"delete_op": ">="
	});
	second_test_batch({
		"get_obj": test_object_js_1,
		"content_type": /javascript/,
		"action": "DELETE",
		"description": "X-Rev-Cache-BE-1st-Byte-Time"
		"base_header_key": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"base_delete_header_value": "X-Rev-Cache-BE-1st-Byte-Time",
		"delete_op": ">="
	});
	second_test_batch({
		"get_obj": envdump,
		"content_type": /I DONT KNOW THIS TYPE PLEASE MAKE A TEST IN ORDER TO ADD IT/,
		"action": "DELETE",
		"description": "X-REV-OBJ-TTL"
		"base_header_key": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"base_delete_header_value": "SuperFlyFast",
		"delete_op": "<"
	});
	second_test_batch({
		"get_obj": envdump,
		"content_type": /I DONT KNOW THIS TYPE PLEASE MAKE A TEST IN ORDER TO ADD IT/,
		"action": "DELETE",
		"description": "X-REV-ID"
		"base_header_key": "X-Rev-obj-ttl",
		"base_header_value": /We-Are-Fast-As-A-Test/,
		"base_delete_header_value": "X-REV-ID",
		"delete_op": ">="
	});
	
	// END END END
});
