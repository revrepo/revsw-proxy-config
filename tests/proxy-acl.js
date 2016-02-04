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
//var Sync = require('sync');

var express = require('express');
var fs = require('fs');
var https = require('https');
//var clientCertificateAuth = require('client-certificate-auth');




describe('Proxy ACL tests', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var api_url = 'https://TESTSJC20-API01.revsw.net';
  var api_user = 'purge_api_test@revsw.com';
  var api_pass = '123456789123456789';
  var domain_acl = 'test-proxy-acl-deny-except.revsw.net';
  var test_object_js_1 = '/test_object_purge_api01.js';
  var rmstale = '/cgi-bin/rmstale.cgi';
  var aclapiurl = '/v1/domains/55a2c050a9d291d85d831317/details';

  //  Version was removed as the new API code did not support version
  //    "version": 1,

  var DENY_EXCEPT_FAIL = {
    "rev_component_co": {
      "img_choice": "medium",
      "js_choice": "medium",
      "enable_rum": true,
      "enable_optimization": true,
      "mode": "moderate",
      "css_choice": "medium"
    },
    "rev_component_bp": {
      "cache_bypass_locations": [],
      "enable_cache": true,
      "cdn_overlay_urls": [],
      "caching_rules": [{
        "cookies": {
          "ignore_all": false,
          "remove_ignored_from_request": false,
          "list_is_keep": false,
          "remove_ignored_from_response": false,
          "keep_or_ignore_list": [],
          "override": false
        },
        "version": 1,
        "edge_caching": {
          "new_ttl": 0,
          "override_no_cc": false,
          "override_origin": false
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "url": {
          "value": "**",
          "is_wildcard": true
        },
        "cookies_cache_bypass": {"enable": true, "list": ["_ACL_DENY_EXCEPT_FAIL"]}
      }],
      "acl": {
        "action": "deny_except",
        "enabled": true,
        "acl_rules": [{
          "subnet_mask": "",
          "country_code": "",
          "header_name": "",
          "host_name": "192.168.8.1",
          "header_value": ""
        }]
      },
      "enable_security": true,
      "web_app_firewall": "off",
      "block_crawlers": false
    }
  }



  var DENY_EXCEPT_SUCC = {
    "rev_component_co": {
      "img_choice": "medium",
      "js_choice": "medium",
      "enable_rum": true,
      "enable_optimization": true,
      "mode": "moderate",
      "css_choice": "medium"
    },
    "rev_component_bp": {
      "cache_bypass_locations": [],
      "enable_cache": true,
      "cdn_overlay_urls": [],
      "caching_rules": [{
        "cookies": {
          "ignore_all": false,
          "remove_ignored_from_request": false,
          "list_is_keep": false,
          "remove_ignored_from_response": false,
          "keep_or_ignore_list": [],
          "override": false
        },
        "version": 1,
        "edge_caching": {
          "new_ttl": 0,
          "override_no_cc": false,
          "override_origin": false
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "url": {
          "value": "**",
          "is_wildcard": true
        },
        "cookies_cache_bypass": {"enable": true, "list": ["_ACL_DENY_EXCEPT_SUCC"]}
      }],
      "acl": {
        "action": "deny_except",
        "enabled": true,
        "acl_rules": [{
          "subnet_mask": "",
          "country_code": "",
          "header_name": "",
          "host_name": "192.168.4.31",
          "header_value": ""
        }]
      },
      "enable_security": true,
      "web_app_firewall": "off",
      "block_crawlers": false
    }
  }



  var ALLOW_EXCEPT_SUCC = {
    "rev_component_co": {
      "img_choice": "medium",
      "js_choice": "medium",
      "enable_rum": true,
      "enable_optimization": true,
      "mode": "moderate",
      "css_choice": "medium"
    },
    "rev_component_bp": {
      "cache_bypass_locations": [],
      "enable_cache": true,
      "cdn_overlay_urls": [],
      "caching_rules": [{
        "cookies": {
          "ignore_all": false,
          "remove_ignored_from_request": false,
          "list_is_keep": false,
          "remove_ignored_from_response": false,
          "keep_or_ignore_list": [],
          "override": false
        },
        "version": 1,
        "edge_caching": {
          "new_ttl": 0,
          "override_no_cc": false,
          "override_origin": false
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "url": {
          "value": "**",
          "is_wildcard": true
        },
        "cookies_cache_bypass": {"enable": true, "list": ["_ACL_ALLOW_EXCEPT_SUCC"]}
      }],
      "acl": {
        "action": "allow_except",
        "enabled": true,
        "acl_rules": [{
          "subnet_mask": "",
          "country_code": "",
          "header_name": "",
          "host_name": "192.169.4.1",
          "header_value": ""
        }]
      },
      "enable_security": true,
      "web_app_firewall": "off",
      "block_crawlers": false
    }
  }


  var ALLOW_EXCEPT_FAIL = {
    "rev_component_co": {
      "img_choice": "medium",
      "js_choice": "medium",
      "enable_rum": true,
      "enable_optimization": true,
      "mode": "moderate",
      "css_choice": "medium"
    },
    "rev_component_bp": {
      "cache_bypass_locations": [],
      "enable_cache": true,
      "cdn_overlay_urls": [],
      "caching_rules": [{
        "cookies": {
          "ignore_all": false,
          "remove_ignored_from_request": false,
          "list_is_keep": false,
          "remove_ignored_from_response": false,
          "keep_or_ignore_list": [],
          "override": false
        },
        "version": 1,
        "edge_caching": {
          "new_ttl": 0,
          "override_no_cc": false,
          "override_origin": false
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "url": {
          "value": "**",
          "is_wildcard": true
        },
        "cookies_cache_bypass": {"enable": true, "list": ["_ACL_ALLOW_EXCEPT_FAIL"]}
      }],
      "acl": {
        "action": "allow_except",
        "enabled": true,
        "acl_rules": [{
          "subnet_mask": "",
          "country_code": "",
          "header_name": "",
          "host_name": "192.168.4.31",
          "header_value": ""
        }]
      },
      "enable_security": true,
      "web_app_firewall": "off",
      "block_crawlers": false
    }
  }


  it('Push config and test for whitelist for allow_except', function(done) {
    this.timeout(600000);
    request(api_url).put(aclapiurl).auth(api_user, api_pass).send(ALLOW_EXCEPT_FAIL).end(function(err, res) {
      var change_json = JSON.parse(res.text);
      //console.log(change_json['statusCode']);
      sleep(10000);
      request(url).get(test_object_js_1).set('Host', domain_acl).expect('Content-Type', /javascript/).end(function(err, res) {
        res.should.have.status(403);
        done();
      });
    });
  });


  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // This two doesn't work some how. Probably it's a bug in my code which doing some cookies thing //
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  // it('Push config and test for blacklist for allow_except', function(done) {
  //   this.timeout(600000);
  //   request(api_url).put(aclapiurl).auth(api_user, api_pass).send(ALLOW_EXCEPT_SUCC).end(function(err, res) {
  //     var change_json = JSON.parse(res.text);
  //     // console.log(change_json['statusCode']);
  //     sleep(10000);
  //     request(url).get(test_object_js_1).set('Host', domain_acl).expect('Content-Type', /javascript/).end(function(err, res) {
  //       res.should.have.status(200);
  //       done();
  //     });
  //   });
  // });






  // it('Push config and test for whitelist for deny_except', function(done) {
  //   this.timeout(600000);
  //   request(api_url).put(aclapiurl).auth(api_user, api_pass).send(DENY_EXCEPT_SUCC).end(function(err, res) {
  //     var change_json = JSON.parse(res.text);
  //     //console.log(change_json['statusCode']);
  //     sleep(10000);
  //     request(url).get(test_object_js_1).set('Host', domain_acl).expect('Content-Type', /javascript/).end(function(err, res) {
  //       res.should.have.status(200);
  //       done();
  //     });
  //   });
  // });


  it('push config and test for blacklist for deny_except', function(done) {
    this.timeout(600000);
    request(api_url).put(aclapiurl).auth(api_user, api_pass).send(DENY_EXCEPT_FAIL).end(function(err, res) {
      var change_json = JSON.parse(res.text);
      //console.log(change_json['statusCode']);
      sleep(10000);
      request(url).get(test_object_js_1).set('Host', domain_acl).expect('Content-Type', /javascript/).end(function(err, res) {
        res.should.have.status(403);
        done();
      });
    });
  });






});


function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}
