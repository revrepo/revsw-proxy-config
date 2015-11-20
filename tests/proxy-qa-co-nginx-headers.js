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
	if (action_list.indexOf(action) > -1) {
		throw new Error('Unknow type of check action: [' + action + ']');
		return;
	} 

	it(desc + ': (' + name + ' against ' + value + ')', function(done) {
		request(url)
		.get(path)
		.set('Host', domain)
		.expect(200)
		.expect(name, value)
		.end(function(err, res) {
			if (err) {
				if (action == 'expect') {
					throw err;
				} else if (action == 'never') {
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
	if (action_list.indexOf(action) > -1) {
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
			if (action == 'expect') {
				res.text.should.match(token);
			} else if (action == 'never') {
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
				if (generic_object['action'] === 'ADD') {
					// nothing special needs to be done for add
				} else if (generic_object['action'] === 'REPLACE') {
					// nothing special needs to be done for replace
				} else if (generic_object['action'] === 'DELETE') {
					// add here extra code
					var response_json = JSON.stringify(res.header);
					var i = response_json.search(generic_object['base_delete_header_value']);
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
	envdump = '/cgi-bin/envtest.cgi';
	domain_header = 'test-proxy-headers.revsw.net';
	test_object_js_1 = '/test_object_purge_api01.js';

	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'ADD',
		'description': 'This-Is-A-Test',
		'base_header_key': 'This-Is-A-Test',
		'base_header_value': /Value-One/
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'ADD',
		'description': 'This-Is-B-Test',
		'base_header_key': 'This-Is-B-Test',
		'base_header_value': /Value-Two/
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'REPLACE',
		'description': 'X-Rev-obj-ttl: We-Are-Fast-As-A-Test',
		'base_header_key': 'X-Rev-obj-ttl',
		'base_header_value': /We-Are-Fast-As-A-Test/
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'DELETE',
		'description': 'X-Rev-Host',
		'base_header_key': 'X-Rev-obj-ttl',
		'base_header_value': /We-Are-Fast-As-A-Test/,
		'base_delete_header_value': 'X-REV-HOST',
		'delete_op': '>='
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'DELETE',
		'description': 'X-Rev-BE-1st-Byte-Time',
		'base_header_key': 'X-Rev-obj-ttl',
		'base_header_value': /We-Are-Fast-As-A-Test/,
		'base_delete_header_value': 'X-Rev-BE-1st-Byte-Time',
		'delete_op': '>='
	});
	second_test_batch({
		'get_obj': test_object_js_1,
		'content_type': /javascript/,
		'action': 'DELETE',
		'description': 'X-Rev-Cache-BE-1st-Byte-Time',
		'base_header_key': 'X-Rev-obj-ttl',
		'base_header_value': /We-Are-Fast-As-A-Test/,
		'base_delete_header_value': 'X-Rev-Cache-BE-1st-Byte-Time',
		'delete_op': '>='
	});
	second_test_batch({
		'get_obj': envdump,
		'content_type': /I DONT KNOW THIS TYPE PLEASE MAKE A TEST IN ORDER TO ADD IT/,
		'action': 'DELETE',
		'description': 'X-REV-OBJ-TTL',
		'base_header_key': 'X-Rev-obj-ttl',
		'base_header_value': /We-Are-Fast-As-A-Test/,
		'base_delete_header_value': 'SuperFlyFast',
		'delete_op': '<'
	});
	second_test_batch({
		'get_obj': envdump,
		'content_type': /I DONT KNOW THIS TYPE PLEASE MAKE A TEST IN ORDER TO ADD IT/,
		'action': 'DELETE',
		'description': 'X-REV-ID',
		'base_header_key': 'X-Rev-obj-ttl',
		'base_header_value': /We-Are-Fast-As-A-Test/,
		'base_delete_header_value': 'X-REV-ID',
		'delete_op': '>='
	});
	
	// END END END
});
