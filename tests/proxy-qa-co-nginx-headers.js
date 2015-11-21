/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:	All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.	The intellectual and technical concepts contained
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

var url, domain;

var domain = 'test-proxy-headers.revsw.net';
var url = 'http://testsjc20-bp01.revsw.net';
var path = '/cgi-bin/envtest.cgi';

function rev_test_header(desc, action, name, value)
{
	var action_list = ['expect', 'never'];
	if (action_list.indexOf(action) < 0) {
		throw new Error('Unknow type of check action: [' + action + ']');
		return;
	} 

	it(desc + ': (' + name + ' against ' + value + ')', function(done) {
		request(url)
		.get(path)
		.set('Host', domain)
		.expect(200)
		.end(function(err, res) {
			if (err) {
				throw new Error('The request did not end with success!');
				done();
			}

			var isHeaderPresent = res.header[name.toLowerCase()] !== undefined;
			if (action == 'expect') {
				isHeaderPresent.should.be.True();
				if (res.header[name.toLowerCase()] !== value) {
					throw new Error('Problem found! The specified value does not match the value from the specified header!');
				}
			} else if (action == 'never') {
				if (isHeaderPresent === true) {
					throw new Error('Boomerang was found where it should not have been found!');
				}
			}
			done();
		});
	});
}

function rev_test_text(desc, action, token)
{
	var action_list = ['expect', 'never'];
	if (action_list.indexOf(action) < 0) {
		throw new Error('Unknow type of check action: [' + action + ']');
		return;
	} 

	it(desc + ': (' + token + ')', function(done) {
		request(url)
		.get(path)
		.set('Host', domain)
		.expect(200)
		.end(function(err, res) {
			if (err) {
				throw err;
			}
			if (action === 'expect') {
				res.text.should.match(token);
			} else if (action === 'never') {
				res.text.should.not.match(token);
			}
			done();
		});
	});
}

// Testing function for BP-92 issue
describe('Headers Manipulation Tests Part One', function() {

	// BP headers:
	rev_test_header('BP: Header of proxy HTTP response should be equal', 'expect', 'END-USER-RES-HDR-1', 'END-USER-RES-VAL-1-NEW');
	rev_test_header('BP: Header of proxy HTTP response should NOT be equal', 'never', 'END-USER-RES-HDR-2', 'END-USER-RES-VAL-2');
	// .

	// CO headers:
	// TODO: (BP-92) proxy_set_header '' does not empty header
	rev_test_text('CO: Header of proxy HTTP response should contain', 'expect', /HTTP_ORG_REQ_HDR_1 = ORG-REQ-VAL-1, ORG-REQ-HDR-1-NEW<br>/);
	rev_test_text('CO: Header of proxy HTTP response should contain', 'expect', /HTTP_ORG_REQ_HDR_2 = ORG-REQ-VAL-2<br>/);
	rev_test_text('CO: Header of proxy HTTP response should NOT contain', 'never', /HTTP_ORG_REQ_HDR_3/);
	// .

});

function second_test_batch(generic_object)
{
	var operators = {
		'<': function(a, b) { return a < b },
		'>=': function(a, b) { return a >= b }
	};
	var final_description = 'Header Test - BP header ' + generic_object['action'] + ' function works - ' + generic_object['description'];
	var base_header_key = generic_object['header_base_key'].toLowerCase();
	var base_header_value = generic_object['header_base_value'];

	it(final_description, function(done) {
		request(url)
			.get(generic_object['get_obj'])
			.set('Host', domain_header)
			.expect('Content-Type', generic_object['content_type'])
			.expect(base_header_key, base_header_value)
			.end(function(err, res) {
				if (err) {
					throw err;
				}
				res.should.have.status(200);
				if (generic_object['action'] === 'ADD') {
					// add extra checks on add feature here
				} else if (generic_object['action'] === 'REPLACE') {
					// add extra checks on replace feature here
					if (generic_object['content_replace_key']) {
						res.text.should.match(generic_object['content_replace_key']);
					 	res.text.should.match(generic_object['content_replace_value']);
					}
				} else if (generic_object['action'] === 'DELETE') {
					// add extra checks on delete feature here
					var response_json = JSON.stringify(res.header);
					var i = response_json.search(generic_object['header_delete_key']);
					var delete_problem = operators[generic_object['delete_op']](i, 1);
					if (delete_problem) {
						throw new Error('Delete Broken');
					}
				} else {
					throw new Error('Unknow type of check action for second test: [' + generic_object['action'] + ']');
				}
				done();
			});
	});
}


describe('Headers Manipulation Tests Part Two', function() {
	url = 'http://testsjc20-bp01.revsw.net';
	domain_header = 'test-proxy-headers.revsw.net';
	test_object_js_1 = '/test_object_purge_api01.js';
	test_object_cgi_1 = '/cgi-bin/envtest.cgi';

	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'ADD',
		'description': 'This-Is-A-Test',
		'header_base_key': 'This-Is-A-Test',
		'header_base_value': /Value-One/
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'ADD',
		'description': 'This-Is-B-Test',
		'header_base_key': 'This-Is-B-Test',
		'header_base_value': /Value-Two/
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'REPLACE',
		'description': 'X-Rev-obj-ttl: We-Are-Fast-As-A-Test',
		'header_base_key': 'X-Rev-obj-ttl',
		'header_base_value': /We-Are-Fast-As-A-Test/
	});
	second_test_batch({
		'get_obj': test_object_cgi_1,
		'content_type': /text/,
		'action': 'REPLACE',
		'description': 'X-REV-OBJ-TTL',
		'header_base_key': 'X-Rev-obj-ttl',
		'header_base_value': /We-Are-Fast-As-A-Test/,
		'content_replace_key': /HTTP_X_REV_OBJ_TTL/,
		'content_replace_value': /SuperFlyFast/
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'DELETE',
		'description': 'X-Rev-Host',
		'header_base_key': 'X-Rev-obj-ttl',
		'header_base_value': /We-Are-Fast-As-A-Test/,
		'header_delete_value': 'X-REV-HOST',
		'delete_op': '>='
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'DELETE',
		'description': 'X-Rev-BE-1st-Byte-Time',
		'header_base_key': 'X-Rev-obj-ttl',
		'header_base_value': /We-Are-Fast-As-A-Test/,
		'header_delete_value': 'X-Rev-BE-1st-Byte-Time',
		'delete_op': '>='
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'DELETE',
		'description': 'X-Rev-Cache-BE-1st-Byte-Time',
		'header_base_key': 'X-Rev-obj-ttl',
		'header_base_value': /We-Are-Fast-As-A-Test/,
		'header_delete_key': 'X-Rev-Cache-BE-1st-Byte-Time',
		'delete_op': '>='
	});
	second_test_batch({
		'get_obj': test_object_cgi_1,
		'content_type': /text/,
		'action': 'DELETE',
		'description': 'X-REV-ID',
		'header_base_key': 'X-Rev-obj-ttl',
		'header_base_value': /We-Are-Fast-As-A-Test/,
		'header_delete_key': 'X-REV-ID',
		'delete_op': '>='
	});
	
	// END END END
});
