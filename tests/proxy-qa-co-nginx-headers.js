/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
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
    if (action == 'expect')
    {
	it(desc + ': (' + name + ' against ' + value + ')', function(done) {
	    request(url)
		.get(path)
		.set('Host', domain)
		.expect(200)
		.expect(name, value)
		.end(function(err, res) {
		    if (err) {
			throw err;
		    }
		    done();
		});
	});
    }
    else if (action == 'never')
    {
	it(desc + ': (' + name + ' against ' + value + ')', function(done) {
	    request(url)
		.get(path)
		.set('Host', domain)
		.expect(name, value)
		.end(function(err, res) {		
		    if (err) {
			res.should.have.status(200);
			done();
		    } else {
			throw new Error("Boomerang was found where it should not have been found!");
		    }
		});
	});
    }
    else
	throw new Error('Unknow type of check action: [' + action + ']');
}

function rev_test_text(desc, action, token)
{
    if (action == 'expect')
    {
	it(desc + ': (' + token + ')', function(done) {
	    request(url)
		.get(path)
		.set('Host', domain)
		.expect(200)
		.end(function(err, res) {
		    if (err) {
			throw err;
		    }
		    res.text.should.match(token);
		    done();
		});
	});
    }
    else if (action == 'never')
    {
	it(desc + ': (' + token + ')', function(done) {
	    request(url)
		.get(path)
		.set('Host', domain)
		.end(function(err, res) {		
		    if (err) {
			throw err;
		    } else {
			res.should.have.status(200);
			res.text.should.not.match(token);
			done();
		    }
		});
	});
    }
    else
	throw new Error('Unknow type of check action: [' + action + ']');
}

// Testing function for BP-92 issue
describe('Headers Manipulation Tests', function() {

    // BP headers:
    rev_test_header('BP: Header of proxy HTTP response should be equal', 'expect', 'END-USER-RES-HDR-1', 'END-USER-RES-VAL-1-NEW');
    rev_test_header('BP: Header of proxy HTTP response should NOT be equal', 'never', 'END-USER-RES-HDR-2', 'END-USER-RES-VAL-2');
    // .

    // CO headers:
    // TODO: (BP-92) proxy_set_header "" does not empty header
    rev_test_text('CO: Header of proxy HTTP response should contain', 'expect', /HTTP_ORG_REQ_HDR_1 = ORG-REQ-VAL-1, ORG-REQ-HDR-1-NEW<br>/);
    rev_test_text('CO: Header of proxy HTTP response should contain', 'expect', /HTTP_ORG_REQ_HDR_2 = ORG-REQ-VAL-2<br>/);
    rev_test_text('CO: Header of proxy HTTP response should NOT contain', 'never', /HTTP_ORG_REQ_HDR_3/);
    // .

});


describe('Headers Manipulation Tests Part Two', function() {
  url = 'http://testsjc20-bp01.revsw.net';
  urls = 'https://testsjc20-bp01.revsw.net';
  api_url = 'https://TESTSJC20-API01.revsw.net';
  api_checkstatus_url = '/checkStatus';
  api_user = 'purge_api_test@revsw.com';
  api_pass = '123456789123456789';
  domain_cache = 'test-proxy-cache-config.revsw.net';
  domain_cache_two = 'test-proxy-cache-config-02.revsw.net';
  domain_dsa = 'test-proxy-dsa-config.revsw.net';
  domain_rma = 'test-proxy-rma-config.revsw.net';
  domain_acl = 'test-proxy-acl-deny-except.revsw.net';
  test_object_js_1 = '/test_object_purge_api01.js';
  test_object_js_2 = '/test_object_purge_api02.js';
  test_object_css_1 = '/b.find.1.0.55.css';
  test_object_jpg_1 = '/news-title.jpg';
  bypass_test_object_jpg_1 = '/bypass/test-64k-file.jpg';
  rum_page_test = '/rum-test.html';
  third_party_test = '/parse.html';
  third_party_object_1 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/1.jpg';
  third_party_object_2 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/2.jpg';
  third_party_object_3 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/3.jpg';
  third_party_object_4 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/4.jpg';
  third_party_object_5 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/5.jpg';
  etagobject = '/etag/item.dat';
  etagfgen = '/cgi-bin/etag.cgi';
  expirehead = '/test-cache.js';
  mkstgale = '/cgi-bin/mkstale.cgi';
  rmstale = '/cgi-bin/rmstale.cgi';
  envdump = '/cgi-bin/envtest.cgi';
  stalefile = '/stale/stalecontent.js';
  aclapiurl = '/v1/domains/55a2c050a9d291d85d831317/details';
  domain_header = 'test-proxy-headers.revsw.net';
  test_object_js_1 = '/test_object_purge_api01.js';

    //

  it('Header Test - BP header Add function works - This-Is-A-Test', function(done) {
        request(url)
            .get(test_object_js_1)
            .set('Host', domain_header)
            .expect('Content-Type', /javascript/)
            .expect('This-Is-A-Test', /Value-One/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                done();

            });
    });


  it('Header Test - BP header Add function works - This-Is-B-Test', function(done) {
        request(url)
            .get(test_object_js_1)
            .set('Host', domain_header)
            .expect('Content-Type', /javascript/)
            .expect('This-Is-B-Test', /Value-Two/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                done();

            });
    });


  it('Header Test - BP header replace function works - X-Rev-obj-ttl: We-Are-Fast-As-A-Test', function(done) {
        request(url)
            .get(test_object_js_1)
            .set('Host', domain_header)
            .expect('Content-Type', /javascript/)
            .expect('X-Rev-obj-ttl', /We-Are-Fast-As-A-Test/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                done();

            });
    });



  it('Header Test - BP header delete function works - X-Rev-Host', function(done) {
        request(url)
            .get(test_object_js_1)
            .set('Host', domain_header)
            .expect('Content-Type', /javascript/)
            .expect('X-Rev-obj-ttl', /We-Are-Fast-As-A-Test/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                var response_json = JSON.stringify(res.header);
                var i = response_json.search("X-REV-HOST");
                if (i > 1) {
                  throw new Error("Delete Broken");
                }
                done();

            });
    });


  it('Header Test - BP header delete function works - X-Rev-BE-1st-Byte-Time', function(done) {
        request(url)
            .get(test_object_js_1)
            .set('Host', domain_header)
            .expect('Content-Type', /javascript/)
            .expect('X-Rev-obj-ttl', /We-Are-Fast-As-A-Test/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                var response_json = JSON.stringify(res.header);
                var i = response_json.search("X-Rev-BE-1st-Byte-Time");
                if (i > 1) {
                  throw new Error("Delete Broken");
                }
                done();

            });
    });




  it('Header Test - BP header delete function works - X-Rev-Cache-BE-1st-Byte-Time', function(done) {
        request(url)
            .get(test_object_js_1)
            .set('Host', domain_header)
            .expect('Content-Type', /javascript/)
            .expect('X-Rev-obj-ttl', /We-Are-Fast-As-A-Test/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                var response_json = JSON.stringify(res.header);
                var i = response_json.search("X-Rev-Cache-BE-1st-Byte-Time");
                if (i > 1) {
                  throw new Error("Delete Broken");
                }
                done();

            });
    });

  it('Header Test - CO header replace test - X-REV-OBJ-TTL', function(done) {
        request(url)
            .get(envdump)
            .set('Host', domain_header)
            .expect('X-Rev-obj-ttl', /We-Are-Fast-As-A-Test/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                var response_json = JSON.stringify(res.text);
                var i = response_json.search("SuperFlyFast");
		//console.log(i);
                if (i < 1) {
                  throw new Error("Delete Broken");
                }
                done();
            });
    });

  it('Header Test - CO header remove test - X-REV-ID', function(done) {
        request(url)
            .get(envdump)
            .set('Host', domain_header)
            .expect('X-Rev-obj-ttl', /We-Are-Fast-As-A-Test/)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                var response_json = JSON.stringify(res.text);
                var i = response_json.search("X-REV-ID");
		//console.log(i);
                if (i > 1) {
                  throw new Error("Delete Broken");
                }
                done();
            });
    });






    // ENDENDEND
});
