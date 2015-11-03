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
var agent = require("supertest-as-promised");
//var Sync = require('sync');

var express = require('express');
var fs = require('fs');
var https = require('https');
//var clientCertificateAuth = require('client-certificate-auth');



describe('Basic stale tests', function() {
    var url = 'http://testsjc20-bp01.revsw.net';
    var urls = 'https://testsjc20-bp01.revsw.net';
    var api_url = 'https://TESTSJC20-API01.revsw.net';
    var api_checkstatus_url = '/v1/purge/';
    var api_user = 'purge_api_test@revsw.com';
    var api_pass = '123456789123456789';
    var domain_cache = 'test-proxy-cache-config.revsw.net';
    var domain_cache_two = 'test-proxy-cache-config-02.revsw.net';
    var domain_dsa = 'test-proxy-dsa-config.revsw.net';
    var domain_rma = 'test-proxy-rma-config.revsw.net';
    var test_object_js_1 = '/test_object_purge_api01.js';
    var test_object_js_2 = '/test_object_purge_api02.js';
    var test_object_css_1 = '/b.find.1.0.55.css';
    var test_object_jpg_1 = '/news-title.jpg';
    var bypass_test_object_jpg_1 = '/bypass/test-64k-file.jpg';
    var rum_page_test = '/rum-test.html';
    var third_party_test = '/parse.html';
    var third_party_object_1 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/1.jpg';
    var third_party_object_2 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/2.jpg';
    var third_party_object_3 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/3.jpg';
    var third_party_object_4 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/4.jpg';
    var third_party_object_5 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/5.jpg';
    var ssl_ciphers_test_one = 'DHE-RSA-AES128-SHA256';
    var etagobject = '/etag/item.dat';
    var etagfgen = '/cgi-bin/etag.cgi';
    var expirehead = '/test-cache.js';
    var mkstale = '/cgi-bin/mkstale.cgi';
    var rmstale = '/cgi-bin/rmstale.cgi';
    var stalefile = '/stale/stalecontent.js';
    var mkstale_perm = '/cgi-bin/mkstale-perm.cgi';
    var rmstale_perm = '/cgi-bin/rmstale-perm.cgi';
    var stalefile_perm = '/stale-perm/stalecontent.dat';


    // Removed to operate with new API gateway
    // "version": 1,

    var JSON1 = {
        "domainName": "test-proxy-cache-config.revsw.net",
        "purges": [{
            "url": {
                "is_wildcard": true,
                "expression": "/**/*"
            }
        }]
    }
    var JSON2 = {
        "domainName": "test-proxy-cache-config-02.revsw.net",
        "purges": [{
            "url": {
                "is_wildcard": true,
                "expression": "/**/*"
            }
        }]
    }
    var JSON3 = {
        "domainName": "test-proxy-cache-config.revsw.net",
        "purges": [{
            "url": {
                "is_wildcard": true,
                "expression": "/test_object_purge_api02.js"
            }
        }]
    }
    var JSON4 = {
        "domainName": "test-proxy-cache-config.revsw.net",
        "purges": [{
            "url": {
                "is_wildcard": true,
                "expression": "/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/*"
            }
        }]
    }

    // Purge


    it('Flush the cache cache config one', function(done) {
        this.timeout(900000);
        request(api_url)
            .post('/v1/purge')
            .auth(api_user, api_pass)
            .send(JSON1)
            .end(function(err, res) {
                sleep(4000);
                if (err) {
                    throw err;
                }
                var purge_json = JSON.parse(res.text);
                //console.log(purge_json);
                if (!purge_json['statusCode'] == '202') {
                    throw err;
                }
                var nurl = api_checkstatus_url.concat(purge_json['request_id']);
                request(api_url)
                    .get(nurl)
                    .auth(api_user, api_pass)
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.should.have.status(200);
                        var status_json = JSON.parse(res.text);
                        var sta = status_json['message'];
                        if (sta == 'pending' || sta == 'InProgress') {
                            //console.log("Purge Failed");
                            throw err;
                        }
                    });
                done();
            });
    });



    it('Flush the cache for cache config two', function(done) {
        this.timeout(900000);
        request(api_url)
            .post('/v1/purge')
            .auth(api_user, api_pass)
            .send(JSON2)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                var purge_json = JSON.parse(res.text);
                if (!purge_json['statusCode'] == '202') {
                    throw err;
                }
                sleep(4000);
                var nurl = api_checkstatus_url.concat(purge_json['request_id']);
                request(api_url)
                    .get(nurl)
                    .auth(api_user, api_pass)
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.should.have.status(200);
                        var status_json = JSON.parse(res.text);
                        var sta = status_json['message'];
                        if (sta == 'pending' || sta == 'InProgress') {
                            console.log("Purge Failed");
                            throw err;
                        }
                    });
                done();
            });
    });


    //
    //
    //  Stale Content
    //
    //



    it('Create, test, remove and test a file for stale cache HTTP', function(done) {
        this.timeout(900000);
        request(url)
            .get(mkstale)
            .set('Host', domain_cache)
            .end(function(err, res) {
                if (err) {
		    console.log(err);
                    throw err;
                }
                res.should.have.status(200);
                request(url)
                    .get(stalefile)
                    .set('Host', domain_cache_two)
                    .expect('Content-Type', /javascript/)
                    .expect('X-Rev-Cache', 'MISS')
                    .expect('Cache-Control', 'max-age=4, public')
                    .end(function(err, res) {
                        if (err) {
		    console.log(err);
                            throw err;
                        }
                        res.should.have.status(200);
                        request(url)
                            .get(stalefile)
                            .set('Host', domain_cache_two)
                            .expect('X-Rev-Cache', 'HIT')
                            .expect('Content-Type', /javascript/)
                            .expect('Cache-Control', 'max-age=4, public')
                            .end(function(err, res) {
                                if (err) {
		    console.log(err);
                                    throw err;
                                }
                                res.should.have.status(200);
                                request(url)
                                    .get(rmstale)
                                    .set('Host', domain_cache)
                                    .end(function(err, res) {
                                        if (err) {
		                            console.log(err);
                                            throw err;
                                        }
                                        res.should.have.status(200);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        request(url)
                                            .get(stalefile)
                                            .set('Host', domain_cache_two)
                                            .end(function(err, res) {
                                                //console.log(res.header);
                                                res.should.have.status(404);
                                                done();
                                            });
                                    });

                            });
                    });
            });
    });

    it('Create, test, remove and test a file for stale cache HTTPS', function(done) {
        this.timeout(900000);
        request(urls)
            .get(mkstale)
            .set('Host', domain_cache)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                request(urls)
                    .get(stalefile)
                    .set('Host', domain_cache_two)
                    .expect('Content-Type', /javascript/)
                    .expect('Cache-Control', 'max-age=4, public')
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.should.have.status(200);
                        request(urls)
                            .get(stalefile)
                            .set('Host', domain_cache_two)
                            .expect('X-Rev-Cache', 'HIT')
                            .expect('Content-Type', /javascript/)
                            .expect('Cache-Control', 'max-age=4, public')
                            .end(function(err, res) {
                                if (err) {
                                    throw err;
                                }
                                res.should.have.status(200);
                                request(urls)
                                    .get(rmstale)
                                    .set('Host', domain_cache)
                                    .end(function(err, res) {
                                        if (err) {
                                            throw err;
                                        }
                                        res.should.have.status(200);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        sleep(10000);
                                        request(urls)
                                            .get(stalefile)
                                            .set('Host', domain_cache_two)
                                            .end(function(err, res) {
                                        //        console.log(res.header);
                                                res.should.have.status(404);
                                                done();
                                            });
                                    });

                            });
                    });
            });
    });


/**********************
    it('Create, test, remove and test a file for stale perm cache HTTP', function(done) {
        this.timeout(90000);
        request(url)
            .get(mkstale_perm)
            .set('Host', domain_cache)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.should.have.status(200);
                request(url)
                    .get(stalefile_perm)
                    .set('Host', domain_cache_two)
                    .expect('Content-Type', /application/)
                    .expect('X-Rev-Cache', 'MISS')
//                    .expect('Cache-Control', 'max-age=4, public')
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.should.have.status(200);
                        request(url)
                            .get(stalefile_perm)
                            .set('Host', domain_cache_two)
                            .expect('X-Rev-Cache', 'HIT')
                            .expect('Content-Type', /application/)
 //                           .expect('Cache-Control', 'max-age=4, public')
                            .end(function(err, res) {
                                if (err) {
                                    throw err;
                                }
                                res.should.have.status(200);
                                request(urls)
                                    .get(rmstale_perm)
                                    .set('Host', domain_cache)
                                    .end(function(err, res) {
                                        if (err) {
                                            throw err;
                                        }
                                        res.should.have.status(200);
                                        sleep(18000);
                                        request(url)
                                            .get(stalefile_perm)
                                            .set('Host', domain_cache_two)
                                            .end(function(err, res) {
                                                console.log(res.header);

                                                res.should.have.status(200);
                                                done();
                                            });
                                    });

                            });
                    });
            });
    });

*******************/












    // ENDENDEND
});
// ENDENDEND




function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}
