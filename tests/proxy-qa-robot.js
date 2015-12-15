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



describe('Basic tests', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var urls = 'https://testsjc20-bp01.revsw.net';
  var api_url = 'https://TESTSJC20-API01.revsw.net';
  var api_checkstatus_url = '/v1/purge/';
  var api_user = 'purge_api_test@revsw.com';
  var api_pass = 'password1';
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
  var ssl_ciphers_test = ["DHE-RSA-AES128-SHA256", "DHE-RSA-AES256-SHA256", "DHE-RSA-AES128-GCM-SHA256", "DHE-RSA-AES256-GCM-SHA384", "ECDHE-RSA-AES128-SHA256", "ECDHE-RSA-AES256-SHA384", "ECDHE-RSA-AES128-GCM-SHA256", "ECDHE-RSA-AES256-GCM-SHA384", "RC4-SHA", "DES-CBC3-SHA", "RC4-SHA", "DES-CBC3-SHA", "DHE-RSA-AES128-SHA", "DHE-RSA-AES256-SHA", "DHE-RSA-CAMELLIA128-SHA", "DHE-RSA-CAMELLIA256-SHA", "DHE-RSA-SEED-SHA", "ECDHE-RSA-RC4-SHA", "ECDHE-RSA-DES-CBC3-SHA", "ECDHE-RSA-AES128-SHA", "ECDHE-RSA-AES256-SHA"]
  var ssl_ciphers_test_one = 'DHE-RSA-AES128-SHA256';
  var etagobject = '/etag/item.dat';
  var etagfgen = '/cgi-bin/etag.cgi';
  var expirehead = '/test-cache.js';
  var mkstale = '/cgi-bin/mkstale.cgi';
  var rmstale = '/cgi-bin/rmstale.cgi';
  var stalefile = '/stale/stalecontent.js';


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
    this.timeout(60000);
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
        if (!purge_json['statusCode'] == '202') {
          throw err;
        }
        var nurl = api_checkstatus_url.concat(purge_json['request_id']);
        //console.log(nurl);
        request(api_url)
          .get(nurl)
          .auth(api_user, api_pass)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            var status_json = JSON.parse(res.text);
            sta = status_json['message'];
            if (sta == 'pending' || sta == 'InProgress') {
              console.log("1 Purge Failed");
              throw err;
            }
          });
        done();
      });
  });



  it('Flush the cache for cache config two', function(done) {
    this.timeout(60000);
    request(api_url)
      .post('/v1/purge')
      .auth(api_user, api_pass)
      .send(JSON2)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var purge_json = JSON.parse(res.text);
        //console.log(purge_json);
        if (!purge_json['statusCode'] == '202') {
          throw err;
        }
        var nurl = api_checkstatus_url.concat(purge_json['request_id']);
        sleep(4000);
        request(api_url)
          .get(nurl)
          .auth(api_user, api_pass)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            var status_json = JSON.parse(res.text);
            sta = status_json['message'];
            if (sta == 'pending' || sta == 'InProgress') {
              console.log("2 Purge Failed");
              throw err;
            }
          });
        done();
      });
  });


  /******************

    it('Flush the cache JGP', function(done) {
      request(api_url)
        .post('/purge')
        .auth(api_user, api_pass)
        .send(JSON3)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          var purge_json = JSON.parse(res.text);
          //console.log(purge_json);
          if (!purge_json['status'] == '202') {
            throw err;
          }
          var purge_json_status = {
            "req_id": purge_json['request_id']
          }
          sleep(1500);
          request(api_url)
            .post(api_checkstatus_url)
            .auth(api_user, api_pass)
            .send(purge_json_status)
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              res.should.have.status(200);
              var status_json = JSON.parse(res.text);
              sta = status_json['message'];
              if (sta == 'pending' || sta == 'InProgress') {
                console.log("Purge Failed");
                throw err;
              }
            });
          done();
        });
    });


    it('Flush the cache for 3rd party data', function(done) {
      request(api_url)
        .post('/purge')
        .auth(api_user, api_pass)
        .send(JSON4)
        .end(function(err, res) {
          if (err) {
            throw err;
          }
          var purge_json = JSON.parse(res.text);
          //console.log(purge_json);
          if (!purge_json['status'] == '202') {
            throw err;
          }
          var purge_json_status = {
            "req_id": purge_json['request_id']
          }
          sleep(1000);
          request(api_url)
            .post(api_checkstatus_url)
            .auth(api_user, api_pass)
            .send(purge_json_status)
            .end(function(err, res) {
              if (err) {
                throw err;
              }
              res.should.have.status(200);
              var status_json = JSON.parse(res.text);
              sta = status_json['message'];
              if (sta == 'pending' || sta == 'InProgress') {
                console.log("Purge Failed");
                throw err;
              }
            });
          done();
        });
    });

  ***********************/


  //
  // GET
  //

  // first




  it('Testing object for cache MISS and max-age of 360000', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Testing object for cache MISS and max-age of 290304000 on base config', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache_two)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'max-age=290304000, public')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('HTTP DSA  GET cache test and checking max-age of 0', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_dsa)
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'max-age=0, public')
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });



  it('HTTPS DSA GET cache test and checking max-age of 0', function(done) {
    this.timeout(900000);
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_dsa)
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'max-age=0, public')
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });




  //
  // Basic GET
  //


  it('Simple HTTP GET test object and max-age of 360000 for JS', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });



  it('Simple HTTP GET test object and max-age of 99999 for CSS', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_css_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /css/)
      .expect('Cache-Control', 'public, max-age=99999')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });



  it('Simple HTTP GET test object and max-age of 37731 for JPG', function(done) {
    request(url)
      .get(test_object_jpg_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /jpeg/)
      .expect('Cache-Control', 'public, max-age=37731')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });




  it('HTTPS GET test object', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('Content-Type', /javascript/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Simple HTTP  GET test dynamic object', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });


  it('Simple HTTPS GET test dynamic object', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });


  //
  //  robots.txt
  //


  it('HTTP Testing to ensure there is NO robots.txt', function(done) {
    request(url)
      .get('/robots.txt')
      .set('Host', domain_cache)
      .expect('Content-Type', /text/)
      .end(function(err, res) {
        res.should.have.status(404);
        done();
      });
  });




  it('HTTPS Testing to ensure there is NO robots.txt', function(done) {
    request(urls)
      .get('/robots.txt')
      .set('Host', domain_cache)
      .expect('Content-Type', /text/)
      .end(function(err, res) {
        res.should.have.status(404);
        done();
      });
  });



  it('HTTP Testing to ensure there is a robots.txt', function(done) {
    request(url)
      .get('/robots.txt')
      .set('Host', domain_cache_two)
      .expect('Content-Type', /text/)
      .expect(/Disallow/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });



  it('HTTPS Testing to ensure there is a robots.txt', function(done) {
    request(urls)
      .get('/robots.txt')
      .set('Host', domain_cache_two)
      .expect('Content-Type', /text/)
      .expect(/Disallow/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  //
  // RUM
  //



  it('HTTP Test to see that boomerang-rev.min.js is injected', function(done) {
    request(url)
      .get(rum_page_test)
      .set('Host', domain_cache)
      .expect('Content-Type', /text/)
      .expect(/BOOMR.addVar/ && /boomerang-rev.min.js/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });

  it('HTTPS Test to see that boomerang-rev.min.js is injected', function(done) {
    request(urls)
      .get(rum_page_test)
      .set('Host', domain_cache)
      .expect('Content-Type', /text/)
      .expect(/BOOMR.addVar/ && /boomerang-rev.min.js/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('HTTP Test to see that boomerang-rev.min.js is NOT injected', function(done) {
    request(url)
      .get(rum_page_test)
      .set('Host', domain_cache_two)
      .expect('Content-Type', /text/)
      .expect(/BOOMR.addVar/ && /boomerang-rev.min.js/)
      .end(function(err, res) {
        if (err) {
          res.should.have.status(200);
          done();
        } else {
          throw new Error("Boomerang was found where it should not have been found!");
        }
      });
  });


  it('HTTPS Test to see that boomerang-rev.min.js is NOT injected', function(done) {
    request(urls)
      .get(rum_page_test)
      .set('Host', domain_cache_two)
      .expect('Content-Type', /text/)
      .expect(/BOOMR.addVar/ && /boomerang-rev.min.js/)
      .end(function(err, res) {
        if (err) {
          res.should.have.status(200);
          done();
        } else {
          throw new Error("Boomerang was found where it should not have been found!");
        }
      });
  });




  i = 1;
  for (; ssl_ciphers_test[i];) {
    cipher = (ssl_ciphers_test[i]);
    //it('SSL Cert Check for ' + ssl_ciphers_test[i], function(done) 
    opensslcall(cipher);
    i++;
  }

  function opensslcall(cipher) {
    it('SSL Cert Check for ' + cipher, function(done) {
      var exec = require('child_process').exec;
      var cmd = 'echo -n | openssl s_client -connect testsjc20-bp01.revsw.net:443 -cipher ' + cipher;
      exec(cmd, function(error, stdout, stderr) {
        var n = stdout.search("California");
        if (n != 56) {
          console.log("broken");
          err = new Error('Error Found in CERT');
          err.parse = true;
          err.original = e;
          throw new TypeError('setting custom form-data part headers is unsupported');
          return cipher.callback(err);

        }
        var n = stdout.search("Rev");
        if (n != 80) {
          console.log("broken");
        }
        var n = stdout.search("Validation");
        if (n != 176) {
          console.log("broken");
          console.log(n);
        }
      });
      done();
    });
  }






  // etag_switch_obj




  it('ETag Test RMA - HTTP', function(done) {
    this.timeout(60000);
    request(url)
      .get(etagobject)
      .set('Host', domain_rma)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(url)
          .get(etagfgen)
          .set('Host', domain_rma)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            sleep(4000);
            request(url)
              .get(etagobject)
              .set('Host', domain_rma)
              .end(function(err, res) {
                if (firstetag == res.header.etag) {
                  throw new Error("etags match!!");
                }
                done();
              });
          });
      });
  });



  it('ETag Test RMA - HTTPS', function(done) {
    this.timeout(60000);
    request(urls)
      .get(etagobject)
      .set('Host', domain_rma)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(urls)
          .get(etagfgen)
          .set('Host', domain_rma)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            sleep(4000);
            request(urls)
              .get(etagobject)
              .set('Host', domain_rma)
              .end(function(err, res) {
                if (firstetag == res.header.etag) {
                  throw new Error("etags match!!");
                }
                done();
              });
          });
      });
  });







  it('ETag Test DSA - HTTP', function(done) {
    this.timeout(60000);
    request(url)
      .get(etagobject)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(url)
          .get(etagfgen)
          .set('Host', domain_dsa)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            sleep(3000);
            request(url)
              .get(etagobject)
              .set('Host', domain_dsa)
              .end(function(err, res) {
                if (firstetag == res.header.etag) {
                  throw new Error("etags match!!");
                }
                done();
              });
          });
      });
  });


  it('ETag Test DSA - HTTPS', function(done) {
    this.timeout(60000);
    request(urls)
      .get(etagobject)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(urls)
          .get(etagfgen)
          .set('Host', domain_dsa)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            sleep(3000);
            request(urls)
              .get(etagobject)
              .set('Host', domain_dsa)
              .end(function(err, res) {
                if (firstetag == res.header.etag) {
                  throw new Error("etags match!!");
                }
                done();
              });
          });
      });
  });



  it('ETag Test cache - HTTP', function(done) {
    this.timeout(60000);
    request(url)
      .get(etagobject)
      .set('Host', domain_cache)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(url)
          .get(etagfgen)
          .set('Host', domain_cache)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            sleep(3000);
            request(url)
              .get(etagobject)
              .set('Host', domain_cache)
              .end(function(err, res) {
                if (firstetag == res.header.etag) {
                  throw new Error("etags match!!");
                }
                done();
              });
          });
      });
  });





  it('ETag Test cache - HTTPS', function(done) {
    this.timeout(60000);
    request(urls)
      .get(etagobject)
      .set('Host', domain_cache)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(urls)
          .get(etagfgen)
          .set('Host', domain_cache)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            sleep(3000);
            request(urls)
              .get(etagobject)
              .set('Host', domain_cache)
              .end(function(err, res) {
                if (firstetag == res.header.etag) {
                  throw new Error("etags match!!");
                }
                done();
              });
          });
      });
  });



  it('ETag consistency checking - caches - HTTP', function(done) {
    this.timeout(60000);
    request(url)
      .get(etagobject)
      .set('Host', domain_cache)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(url)
          .get(etagobject)
          .set('Host', domain_cache)
          .end(function(err, res) {
            if (firstetag != res.header.etag) {
              throw new Error("etags do not match!!");
            }
            done();
          });
      });
  });

  it('ETag consistency checking - DSA - HTTP', function(done) {
    this.timeout(60000);
    request(url)
      .get(etagobject)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(url)
          .get(etagobject)
          .set('Host', domain_dsa)
          .end(function(err, res) {
            if (firstetag != res.header.etag) {
              throw new Error("etags do not match!!");
            }
            done();
          });
      });
  });

  it('ETag consistency checking - cache - HTTP', function(done) {
    this.timeout(60000);
    request(url)
      .get(etagobject)
      .set('Host', domain_rma)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(url)
          .get(etagobject)
          .set('Host', domain_rma)
          .end(function(err, res) {
            if (firstetag != res.header.etag) {
              throw new Error("etags do not match!!");
            }
            done();
          });
      });
  });



  it('ETag consistency checking - caches - HTTPS', function(done) {
    this.timeout(60000);
    request(urls)
      .get(etagobject)
      .set('Host', domain_cache)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(urls)
          .get(etagobject)
          .set('Host', domain_cache)
          .end(function(err, res) {
            if (firstetag != res.header.etag) {
              throw new Error("etags do not match!!");
            }
            done();
          });
      });
  });

  it('ETag consistency checking - DSA - HTTPS', function(done) {
    this.timeout(60000);
    request(urls)
      .get(etagobject)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(urls)
          .get(etagobject)
          .set('Host', domain_dsa)
          .end(function(err, res) {
            if (firstetag != res.header.etag) {
              throw new Error("etags do not match!!");
            }
            done();
          });
      });
  });

  it('ETag consistency checking - cache - HTTPS', function(done) {
    this.timeout(60000);
    request(urls)
      .get(etagobject)
      .set('Host', domain_rma)
      .end(function(err, res) {
        firstetag = res.header.etag;
        request(urls)
          .get(etagobject)
          .set('Host', domain_rma)
          .end(function(err, res) {
            if (firstetag != res.header.etag) {
              throw new Error("etags do not match!!");
            }
            done();
          });
      });
  });









  it('Checking Age on cache config for js', function(done) {
    this.timeout(60000);
    request(url)
      .get(expirehead)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /javascript/)
      .set('Host', domain_cache)
      .end(function(err, res) {
        firstage = res.header.age;
        res.should.have.status(200);
        sleep(1000);
        request(url)
          .get(expirehead)
          .expect('X-Rev-Cache', 'HIT')
          .expect('Content-Type', /javascript/)
          .set('Host', domain_cache)
          .end(function(err, res) {
            diffage = res.header.age - firstage;
            if (diffage < 1) {
              throw new Error("Problem with the age!!");
            }
            done();
          });
      });
  });

  it('Checking Age on cache config for RMA', function(done) {
    this.timeout(60000);
    request(url)
      .get(expirehead)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /javascript/)
      .set('Host', domain_rma)
      .end(function(err, res) {
        firstage = res.header.age;
        res.should.have.status(200);
        sleep(1000);

        request(url)
          .get(expirehead)
          .expect('X-Rev-Cache', 'HIT')
          .expect('Content-Type', /javascript/)
          .set('Host', domain_rma)
          .end(function(err, res) {
            diffage = res.header.age - firstage;
            if (diffage < 1) {
              throw new Error("Problem with the age!!");
            }
            done();
          });
      });
  });

  it('Checking Age on cache config for DSA', function(done) {
    this.timeout(60000);
    request(url)
      .get(expirehead)
      .expect('Content-Type', /javascript/)
      .set('Host', domain_rma)
      .end(function(err, res) {
        firstage = res.header.age;
        res.should.have.status(200);
        sleep(1000);

        request(url)
          .get(expirehead)
          .expect('Content-Type', /javascript/)
          .set('Host', domain_dsa)
          .end(function(err, res) {
            diffage = res.header.age - firstage;
            if (diffage < 1) {
              throw new Error("Problem with the age!!");
            }
            done();
          });
      });
  });


  it('Testing test_object_js_2 for cache MISS and max-age of 360000', function(done) {
    request(url)
      .get(test_object_js_2)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });

  it('Testing test_object_js_2 for cache HIT and max-age of 360000', function(done) {
    request(url)
      .get(test_object_js_2)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Flush the single object test_object_js_2', function(done) {
    this.timeout(900000);
    request(api_url)
      .post('/v1/purge')
      .auth(api_user, api_pass)
      .send(JSON3)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var purge_json = JSON.parse(res.text);
        //console.log(purge_json);
        if (!purge_json['status'] == '202') {
          throw err;
        }
        sleep(2500);
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
            sta = status_json['message'];
            if (sta == 'pending' || sta == 'InProgress') {
              console.log("0 Purge Failed");
              throw err;
            }
          });
        done();
      });
  });



  it('Testing test_object_js_1 for cache HIT and max-age of 360000', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Testing test_object_js_2 for cache MISS and max-age of 360000', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_js_2)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'MISS')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });




  it('Testing test_object_js_2 for cache HIT and max-age of 360000', function(done) {
    this.timeout(900000);
    request(url)
      .get(test_object_js_2)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Create the file to test Last-Modified HTTP', function(done) {
    request(url)
      .get(mkstale)
      .set('Host', domain_cache)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        request(url)
          .get(stalefile)
          .set('Host', domain_cache_two)
          .expect('Content-Type', /javascript/)
          //      .expect('X-Rev-Cache', 'MISS')
          .expect('Cache-Control', 'max-age=4, public')
          .end(function(err, res) {
            if (err) {
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
                  throw err;
                }
                res.should.have.status(200);
                //console.log(res);
                var hd = Date.parse(res.headers.date);
                var lm = Date.parse(res.headers['last-modified']);
                var tdif = hd - lm;
                if (tdif > 1000) {
                  throw new Error("There is a problem with the dates");
                }

                done();
              });
          });
      });
  });


  it('Remove the file to test stale cache HTTP', function(done) {
    this.timeout(60000);
    request(urls)
      .get(rmstale)
      .set('Host', domain_cache)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        sleep(4000);
        done();
      });
  });


  it('Create the file to test Last-Modified HTTPS', function(done) {
    request(url)
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
          //      .expect('X-Rev-Cache', 'MISS')
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
                //console.log(res);
                var hd = Date.parse(res.headers.date);
                var lm = Date.parse(res.headers['last-modified']);
                var tdif = hd - lm;
                //console.log(hd);
                //console.log(lm);
                // console.log(tdif);
                if (tdif > 4000) {
                  throw new Error("There is a problem with the dates");
                }

                done();
              });
          });
      });
  });



  it('Remove the file to test stale cache HTTPS', function(done) {
    this.timeout(60000);
    request(urls)
      .get(rmstale)
      .set('Host', domain_cache)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });




  it('Testing object for X-Rev-Cache-BE-1st-Byte-Time is 0', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });









  ///////////////////////////////////////






  it('Testing cache config object for x-rev-be-1st-byte-time is 0 HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-be-1st-byte-time'] != 0) {

          throw new Error("There is a problem with the x-rev-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });
  it('Testing cache config object for x-rev-be-1st-byte-time is 0 HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-be-1st-byte-time'] != 0) {

          throw new Error("There is a problem with the x-rev-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });





  it('Testing RMA config object for x-rev-be-1st-byte-time is 0 HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        } 
        request(url)
          .get(test_object_js_1)
          .set('Host', domain_rma)
          .expect('Content-Type', /javascript/)
          .expect('Cache-Control', 'public, max-age=360000')
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            if (res.headers['x-rev-be-1st-byte-time'] != 0) {
    
              throw new Error("There is a problem with the x-rev-be-1st-byte-time");
            }
            done();
        });
      });
  });
  it('Testing RMA config object for x-rev-be-1st-byte-time is 0 HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-be-1st-byte-time'] != 0) {

          throw new Error("There is a problem with the x-rev-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });





  it('Testing cache config object for X-Rev-Cache-BE-1st-Byte-Time is 0 HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-cache-be-1st-byte-time'] != 0) {

          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });
  it('Testing cache config object for X-Rev-Cache-BE-1st-Byte-Time is 0 HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-cache-be-1st-byte-time'] != 0) {

          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });




  it('Testing RMA config object for X-Rev-Cache-BE-1st-Byte-Time is 0 HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-cache-be-1st-byte-time'] != 0) {

          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });
  it('Testing RMA config object for X-Rev-Cache-BE-1st-Byte-Time is 0 HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-cache-be-1st-byte-time'] != 0) {

          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });

  it('Testing cache config object X-Rev-beresp-ttl matches max-age HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var revheaderstr = res.headers['x-rev-beresp-ttl'].split(".");
        var ccheader = res.headers['cache-control'].split("=");
        //console.log(revheaderstr[0]);
        //console.log(ccheader[1]);
        if (revheaderstr[0] != ccheader[1]) {
          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });


  it('Testing cache config object X-Rev-beresp-ttl matches max-age HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var revheaderstr = res.headers['x-rev-beresp-ttl'].split(".");
        var ccheader = res.headers['cache-control'].split("=");
        //console.log(revheaderstr[0]);
        //console.log(ccheader[1]);
        if (revheaderstr[0] != ccheader[1]) {
          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });





  it('Testing rma config object X-Rev-beresp-ttl matches max-age HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var revheaderstr = res.headers['x-rev-beresp-ttl'].split(".");
        var ccheader = res.headers['cache-control'].split("=");
        //console.log(revheaderstr[0]);
        //console.log(ccheader[1]);
        if (revheaderstr[0] != ccheader[1]) {
          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });


  it('Testing rma config object X-Rev-beresp-ttl matches max-age HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var revheaderstr = res.headers['x-rev-beresp-ttl'].split(".");
        var ccheader = res.headers['cache-control'].split("=");
        //console.log(revheaderstr[0]);
        //console.log(ccheader[1]);
        if (revheaderstr[0] != ccheader[1]) {
          throw new Error("There is a problem with the x-rev-cache-be-1st-byte-time");
        }
        res.should.have.status(200);

        done();
      });
  });



  /////




  it('Testing cache config object x-rev-cache-hits HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var hitsfirst = res.headers['x-rev-cache-hits'];
        res.should.have.status(200);


        request(urls)
          .get(test_object_js_1)
          .set('Host', domain_cache)
          .expect('X-Rev-Cache', 'HIT')
          .expect('Content-Type', /javascript/)
          .expect('Cache-Control', 'public, max-age=360000')
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            if (hitsfirst == res.headers['x-rev-cache-hits']) {
              throw new Error("There is a problem with the hit counter broken");
            }
            done();
          });
      });
  });



  it('Testing cache config object x-rev-cache-hits HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var hitsfirst = res.headers['x-rev-cache-hits'];
        res.should.have.status(200);


        request(url)
          .get(test_object_js_1)
          .set('Host', domain_cache)
          .expect('X-Rev-Cache', 'HIT')
          .expect('Content-Type', /javascript/)
          .expect('Cache-Control', 'public, max-age=360000')
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            if (hitsfirst == res.headers['x-rev-cache-hits']) {
              throw new Error("There is a problem with the hit counter broken");
            }
            done();
          });
      });
  });
  it('Testing rma config object x-rev-cache-hits HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var hitsfirst = res.headers['x-rev-cache-hits'];
        res.should.have.status(200);


        request(urls)
          .get(test_object_js_1)
          .set('Host', domain_rma)
          .expect('X-Rev-Cache', 'HIT')
          .expect('Content-Type', /javascript/)
          .expect('Cache-Control', 'public, max-age=360000')
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            if (hitsfirst == res.headers['x-rev-cache-hits']) {
              throw new Error("There is a problem with the hit counter broken");
            }
            done();
          });
      });
  });



  it('Testing rma config object x-rev-cache-hits HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var hitsfirst = res.headers['x-rev-cache-hits'];
        res.should.have.status(200);


        request(url)
          .get(test_object_js_1)
          .set('Host', domain_rma)
          .expect('X-Rev-Cache', 'HIT')
          .expect('Content-Type', /javascript/)
          .expect('Cache-Control', 'public, max-age=360000')
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            if (hitsfirst == res.headers['x-rev-cache-hits']) {
              throw new Error("There is a problem with the hit counter broken");
            }
            done();
          });
      });
  });









  it('Testing object cache config X-Rev-beresp-grace is 0 - HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-beresp-grace'] != '0.000' ) {
          throw new Error("There is a problem with the x-rev-beresp-grace");
        }
        res.should.have.status(200);
        done();
      });
  });




  it('Testing object cache config X-Rev-beresp-grace is 0 - HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-beresp-grace'] != '0.000') {
          throw new Error("There is a problem with the x-rev-beresp-grace");
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Testing object rma config X-Rev-beresp-grace is 0 - HTTPS', function(done) {
    request(urls)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-beresp-grace'] != '0.000') {
          throw new Error("There is a problem with the x-rev-beresp-grace; the reported x-rev-beresp-grace value is " + res.headers['x-rev-beresp-grace']);
        }
        res.should.have.status(200);
        done();
      });
  });




  it('Testing object rma config X-Rev-beresp-grace is 0 - HTTP', function(done) {
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_rma)
      .expect('X-Rev-Cache', 'HIT')
      .expect('Content-Type', /javascript/)
      .expect('Cache-Control', 'public, max-age=360000')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        if (res.headers['x-rev-beresp-grace'] != '0.000') {
          throw new Error("There is a problem with the x-rev-beresp-grace");
        }
        res.should.have.status(200);
        done();
      });
  });








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
