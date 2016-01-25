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
 */

var should = require('should-http');
var request = require('supertest');
var agent = require("supertest-as-promised");
var express = require('express');
var fs = require('fs');
var https = require('https');



describe('DNS TTL Test', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var urls = 'https://testsjc20-bp01.revsw.net';
  var api_url = 'https://TESTSJC20-API01.revsw.net';
  var api_checkstatus_url = '/checkStatus';
  var api_user = 'purge_api_test@revsw.com';
  var api_pass = '123456789123456789';
  var domain_cache = 'test-proxy-cache-config.revsw.net';
  var domain_cache_two = 'test-proxy-cache-config-02.revsw.net';
  var domain_dsa = 'test-proxy-dsa-config.revsw.net';
  var domain_rma = 'test-proxy-rma-config.revsw.net';


  var nsone_header = 'X-NSONE-Key';
  var nsone_key = 'WCA2e7hfa5xF4EFWYnpM';
  var nsone_api = 'https://api.nsone.net';
  var nsone_url = '/v1/zones/revqa.net/testsjc20-co-test.revqa.net/A';

  this.timeout(60000);




  var JSON50 = {
    "id": "55d4e4122db1566b3b89fb9a",
    "use_client_subnet": true,
    "meta": {},
    "networks": [
      0
    ],
    "link": null,
    "tier": 1,
    "ttl": 4,
    "filters": [],
    "answers": [{
      "answer": [
        "192.168.4.50"
      ],
      "id": "55d4ee039f782d44f4d2feba"
    }],
    "domain": "testsjc20-co-test.revqa.net",
    "zone": "revqa.net",
    "type": "A",
    "regions": {}
  }


  var JSON51 = {
    "id": "55d4e4122db1566b3b89fb9a",
    "use_client_subnet": true,
    "meta": {},
    "networks": [
      0
    ],
    "link": null,
    "tier": 1,
    "ttl": 4,
    "filters": [],
    "answers": [{
      "answer": [
        "192.168.4.51"
      ],
      "id": "55d4ee039f782d44f4d2feba"
    }],
    "domain": "testsjc20-co-test.revqa.net",
    "zone": "revqa.net",
    "type": "A",
    "regions": {}
  }



  var JSON502 = {
    "id": "55d4e4122db1566b3b89fb9a",
    "use_client_subnet": true,
    "meta": {},
    "networks": [
      0
    ],
    "link": null,
    "tier": 1,
    "ttl": 1,
    "filters": [],
    "answers": [{
      "answer": [
        "192.168.4.50"
      ],
      "id": "55d4ee039f782d44f4d2feba"
    }],
    "domain": "testsjc20-co-test.revqa.net",
    "zone": "revqa.net",
    "type": "A",
    "regions": {}
  }


  var JSON512 = {
    "id": "55d4e4122db1566b3b89fb9a",
    "use_client_subnet": true,
    "meta": {},
    "networks": [
      0
    ],
    "link": null,
    "tier": 1,
    "ttl": 1,
    "filters": [],
    "answers": [{
      "answer": [
        "192.168.4.51"
      ],
      "id": "55d4ee039f782d44f4d2feba"
    }],
    "domain": "testsjc20-co-test.revqa.net",
    "zone": "revqa.net",
    "type": "A",
    "regions": {}
  }



  it('Testing DNS failover - 192.168.4.50 - 5 seconds', function(done) {
    request(nsone_api)
      .post(nsone_url)
      .set(nsone_header, nsone_key)
      .send(JSON50)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        sleep(5);
        request(url)
          .get('/cgi-bin/envtest.cgi')
          .set('Host', domain_cache)
          .end(function(err, res) {
            res.should.have.status(200);
            var response_json = JSON.stringify(res.text);
            var i = response_json.search("192.168.4.50");
            if (i < 15) {
              throw new Error("Proxy did not follow the TTL");
            }
            sleep(5);
            done();
          });


      });

  });


  it('Testing DNS failover - 192.168.4.51 - 5 seconds', function(done) {
    request(nsone_api)
      .post(nsone_url)
      .set(nsone_header, nsone_key)
      .send(JSON51)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        sleep(5);
        request(url)
          .get('/cgi-bin/envtest.cgi')
          .set('Host', domain_cache)
          .end(function(err, res) {
            res.should.have.status(200);
            var response_json = JSON.stringify(res.text);
            var i = response_json.search("192.168.4.51");
            if (i < 15) {
              throw new Error("Proxy did not follow the TTL");
            }
            sleep(5);
            done();
          });


      });

  });




  it('Testing DNS failover - 192.168.4.50 - 5 seconds', function(done) {
    request(nsone_api)
      .post(nsone_url)
      .set(nsone_header, nsone_key)
      .send(JSON50)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        sleep(5);
        request(url)
          .get('/cgi-bin/envtest.cgi')
          .set('Host', domain_cache)
          .end(function(err, res) {
            res.should.have.status(200);
            var response_json = JSON.stringify(res.text);
            var i = response_json.search("192.168.4.50");
            if (i < 15) {
              throw new Error("Proxy did not follow the TTL");
            }
            sleep(5);
            done();
          });


      });

  });



  it('Testing DNS failover - 192.168.4.51 - 2 seconds', function(done) {
    request(nsone_api)
      .post(nsone_url)
      .set(nsone_header, nsone_key)
      .send(JSON512)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        sleep(2);
        request(url)
          .get('/cgi-bin/envtest.cgi')
          .set('Host', domain_cache)
          .end(function(err, res) {
            res.should.have.status(200);
            var response_json = JSON.stringify(res.text);
            var i = response_json.search("192.168.4.51");
            if (i < 15) {
              throw new Error("Proxy did not follow the TTL");
            }
            done();
          });


      });

  });






  it('Testing DNS failover - 192.168.4.50 - 2 seconds', function(done) {
    request(nsone_api)
      .post(nsone_url)
      .set(nsone_header, nsone_key)
      .send(JSON502)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        sleep(2);
        request(url)
          .get('/cgi-bin/envtest.cgi')
          .set('Host', domain_cache)
          .end(function(err, res) {
            res.should.have.status(200);
            var response_json = JSON.stringify(res.text);
            var i = response_json.search("192.168.4.50");
            if (i < 15) {
              throw new Error("Proxy did not follow the TTL");
            }
            done();
          });


      });

  });


  it('Testing DNS failover - 192.168.4.51 - 2 seconds', function(done) {
    request(nsone_api)
      .post(nsone_url)
      .set(nsone_header, nsone_key)
      .send(JSON512)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        sleep(2);
        request(url)
          .get('/cgi-bin/envtest.cgi')
          .set('Host', domain_cache)
          .end(function(err, res) {
            res.should.have.status(200);
            var response_json = JSON.stringify(res.text);
            var i = response_json.search("192.168.4.51");
            if (i < 15) {
              throw new Error("Proxy did not follow the TTL");
            }
            done();
          });


      });

  });



  it('Testing DNS failover - 192.168.4.50 - 2 seconds', function(done) {
    request(nsone_api)
      .post(nsone_url)
      .set(nsone_header, nsone_key)
      .send(JSON502)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        sleep(2);
        request(url)
          .get('/cgi-bin/envtest.cgi')
          .set('Host', domain_cache)
          .end(function(err, res) {
            res.should.have.status(200);
            var response_json = JSON.stringify(res.text);
            var i = response_json.search("192.168.4.50");
            if (i < 15) {
              throw new Error("Proxy did not follow the TTL");
            }
            done();
          });


      });

  });

});




function sleep(s) {
      var e = new Date().getTime() + (s * 1000);
      while (new Date().getTime() <= e) {
        ;
      }
    }

var grep = function(items, callback) {
  var filtered = [],
    len = items.length,
    i = 0;
  for (i; i < len; i++) {
    var item = items[i];
    var cond = callback(item);
    if (cond) {
      filtered.push(item);
    }
  }

  return filtered;
};
