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
var parallel = require('mocha.parallel');

//var domain_header = 'test-proxy-generic-resources-config.revsw.net'; // ch = custom headers
var domain_header = 'qa-api-test-proxy-bp-varnish-cheader.revsw.net'; // ch = custom headers
var url = 'http://testsjc20-bp01.revsw.net';

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
		'<': function(a, b) { return a < b },
		'>': function(a, b) { return a > b },
		'<=': function(a, b) { return a <= b },
		'>=': function(a, b) { return a >= b },
		'==': function(a, b) { return a == b },
		'===': function(a, b) { return a === b }
	};
	var expected_header = generic_object['expected_header'];
	var expected_header_value = generic_object['expected_header_value'];
	var final_description = 'Varnish Header Test - Varnish header ' + generic_object['action'] + ' function works - ' + generic_object['expected_header'];

	var base_header_1 = 'x-rev-id';
	var base_header_value_1 = /\d+/;

	it(final_description, function(done) {
		request(url)
			.get(generic_object['get_obj'])
			.set('Host', domain_header)
			.expect('Content-Type', generic_object['content_type'])
			.expect(base_header_1, base_header_value_1)
			.end(function(err, res) {
				if (err) {
					throw err;
				}
				res.should.have.status(200);

				var is_header_present = res.header[expected_header.toLowerCase()] !== undefined;
				if (['ADD', 'REPLACE'].indexOf(generic_object['action']) > -1) {
					// check if header exists
					if (is_header_present === false) {
						throw new Error(generic_object['action'] + ' test failed - expected header value was not found!');
						done();
					}
					// check if header has the expected value
					var is_correct_header_value = res.header[expected_header.toLowerCase()] === expected_header_value;
					if (is_correct_header_value === false) {
						throw new Error(generic_object['action'] + ' test failed - expected header value was found, but the content does not match the specified value!');
					}
				} else if (generic_object['action'] === 'REMOVE') {
					// fail if header exists
					if (is_header_present === true) {
						throw new Error(generic_object['action'] + ' test failed - unexpected header value was found!');
					}
				} else if (['ORIGIN_ADD', 'ORIGIN_REPLACE'].indexOf(generic_object['action']) > -1) {
					// check if header and header content exist in the body of the origin page
					var search_value = new RegExp(expected_header + " = " + expected_header_value + "<br>", 'i');
					if (res.text.search(search_value) < 0) {
						throw new Error(generic_object['action'] + ' test failed - origin expected header value and header content: ' + search_value + '!');
					}
				} else if (generic_object['action'] === 'ORIGIN_REMOVE') {
					var search_value = new RegExp(expected_header + " = " + expected_header_value, 'i');
					if (res.text.search(search_value) > -1) {
						throw new Error(generic_object['action'] + ' test failed - unexpected header value was found!');
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
  this.timeout(500000);

	var base_path_cgi = '/cgi-bin/envtest.cgi';
	var base_path_text = '/test_generic_txt.txt';
	var base_path_css = '/test_generic_css.css';
	var base_path_js = '/test_generic_js.js';
	var base_path_html = '/test_generic_html.html';
	var base_path_swf = '/test_generic_swf.swf';
	var base_path_jpg = '/test_generic_jpg.jpg';

  parallel("async running", function () {
    // TEST ADD functionality - end_user replacements
    check_varnish_headers({
      'action': 'ADD',
      'content_type': /text/,
      'get_obj': base_path_cgi,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_cgi',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_cgi'
    });
    check_varnish_headers({
      'action': 'ADD',
      'content_type': /text/,
      'get_obj': base_path_text,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_text',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_text'
    });
    check_varnish_headers({
      'action': 'ADD',
      'content_type': /text/,
      'get_obj': base_path_css,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_css',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_css'
    });
    check_varnish_headers({
      'action': 'ADD',
      'content_type': /javascript/,
      'get_obj': base_path_js,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_js',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_js'
    });
    check_varnish_headers({
      'action': 'ADD',
      'content_type': /text/,
      'get_obj': base_path_html,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_html',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_html'
    });
    check_varnish_headers({
      'action': 'ADD',
      'content_type': /flash/,
      'get_obj': base_path_swf,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_swf',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_swf'
    });
    check_varnish_headers({
      'action': 'ADD',
      'content_type': /image/,
      'get_obj': base_path_jpg,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_jpg',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_jpg'
    });

    // TEST REPLACE functionality - end_user replacements
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_cgi,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_cgi',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_cgi'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_text,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_text',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_text'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_css,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_css',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_css'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /javascript/,
      'get_obj': base_path_js,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_js',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_js'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_html,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_html',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_html'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /flash/,
      'get_obj': base_path_swf,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_swf',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_swf'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /image/,
      'get_obj': base_path_jpg,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_jpg',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_jpg'
    });

    // TEST REPLACE functionality - replace content from origin_server
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_cgi,
      'expected_header': 'X-Test-Header-Replace',
      'expected_header_value': 'replaced-in-varnish'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_text,
      'expected_header': 'X-Test-Header-Replace',
      'expected_header_value': 'replaced-in-varnish'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_css,
      'expected_header': 'X-Test-Header-Replace',
      'expected_header_value': 'replaced-in-varnish'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /javascript/,
      'get_obj': base_path_js,
      'expected_header': 'X-Test-Header-Replace',
      'expected_header_value': 'replaced-in-varnish'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /text/,
      'get_obj': base_path_html,
      'expected_header': 'X-Test-Header-Replace',
      'expected_header_value': 'replaced-in-varnish'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /flash/,
      'get_obj': base_path_swf,
      'expected_header': 'X-Test-Header-Replace',
      'expected_header_value': 'replaced-in-varnish'
    });
    check_varnish_headers({
      'action': 'REPLACE',
      'content_type': /image/,
      'get_obj': base_path_jpg,
      'expected_header': 'X-Test-Header-Replace',
      'expected_header_value': 'replaced-in-varnish'
    });

    // TEST DELETE functionality - end_user replacements
    check_varnish_headers({
      'action': 'REMOVE',
      'content_type': /text/,
      'get_obj': base_path_cgi,
      'expected_header': 'X-Test-Header-Remove',
      'expected_header_value': null
    });
    check_varnish_headers({
      'action': 'REMOVE',
      'content_type': /text/,
      'get_obj': base_path_text,
      'expected_header': 'X-Test-Header-Remove',
      'expected_header_value': null
    });
    check_varnish_headers({
      'action': 'REMOVE',
      'content_type': /text/,
      'get_obj': base_path_css,
      'expected_header': 'X-Test-Header-Remove',
      'expected_header_value': null
    });
    check_varnish_headers({
      'action': 'REMOVE',
      'content_type': /javascript/,
      'get_obj': base_path_js,
      'expected_header': 'X-Test-Header-Remove',
      'expected_header_value': null
    });
    check_varnish_headers({
      'action': 'REMOVE',
      'content_type': /text/,
      'get_obj': base_path_html,
      'expected_header': 'X-Test-Header-Remove',
      'expected_header_value': null
    });
    check_varnish_headers({
      'action': 'REMOVE',
      'content_type': /flash/,
      'get_obj': base_path_swf,
      'expected_header': 'X-Test-Header-Remove',
      'expected_header_value': null
    });
    check_varnish_headers({
      'action': 'REMOVE',
      'content_type': /image/,
      'get_obj': base_path_jpg,
      'expected_header': 'X-Test-Header-Remove',
      'expected_header_value': null
    });

    // TEST ADD,REPLACE,REMOVE BACKEND ORIGIN received headers
    check_varnish_headers({
      'action': 'ORIGIN_ADD',
      'content_type': /text/,
      'get_obj': base_path_cgi,
      'expected_header': 'ADD_HEADER_DONE_WITH_SUCCESS_origin_cgi',
      'expected_header_value': 'ADD_HEADER_VALUE_DONE_WITH_SUCCESS_origin_cgi'
    });
    check_varnish_headers({
      'action': 'ORIGIN_REPLACE',
      'content_type': /text/,
      'get_obj': base_path_cgi,
      'expected_header': 'REPLACE_HEADER_DONE_WITH_SUCCESS_origin_cgi',
      'expected_header_value': 'REPLACE_HEADER_VALUE_DONE_WITH_SUCCESS_origin_cgi'
    });
    check_varnish_headers({
      'action': 'ORIGIN_REMOVE',
      'content_type': /text/,
      'get_obj': base_path_cgi,
      'expected_header': 'User_Agent',
      'expected_header_value': ''
    });

    // END END END
  });
});
