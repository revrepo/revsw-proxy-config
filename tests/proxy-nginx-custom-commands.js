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

var express = require('express');
var fs = require('fs');
var https = require('https');


describe('Nginx custom commands', function() { // test ?
  this.timeout(240000);
    var url = 'http://testsjc20-bp01.revsw.net';
    var testDomain = 'qa-api-test-proxy-nginx-custom-commands.revsw.net'
    var urls = 'https://testsjc20-bp01.revsw.net';
    var api_url = 'https://TESTSJC20-API01.revsw.net';
    var apiDomainURL = '/v1/domains/56188c7e144de0433c4e68f8';
    var apiDomainDetailsURL = '/v1/domains/56188c7e144de0433c4e68f8/details';
    var domainJson;
    var domainJsonDetails;
    var qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com';
    var qaUserWithAdminPermPassword = 'password1';

  xit('should read basic configuration for domain ' + testDomain, function(done) {
    request(api_url).get(apiDomainURL).auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword).expect(200).end(function(err, res) {
      if (err) {
        throw err;
      }
      var json = JSON.parse(res.text);
      json.name.should.be.equal(testDomain);
      domainJson = json;
      done();
    });
  });

  xit('should write back the basic configuration for domain ' + testDomain, function(done) {
    request(api_url).put(apiDomainURL).auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .send(domainJson)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully updated the domain');
        done();
    });
  });

  xit('should read detailed configuration for domain ' + testDomain, function(done) {
    request(api_url).get(apiDomainDetailsURL).auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword).expect(200).end(function(err, res) {
      if (err) {
        throw err;
      }
      var json = JSON.parse(res.text);
      json.should.not.be.empty();
      domainJsonDetails = json;
      done();
    });
  });

  xit('should write back the detailed configuration for domain ' + testDomain, function(done) {
    request(api_url).put(apiDomainDetailsURL).auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .send(domainJsonDetails)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully updated the domain');
        done();
    });
  });


  it('should receive via HTTP custom Nginx headers set on BP and CO proxies', function(done) {
    request(url)
      .get('/test-cache.js')
      .set('Host', testDomain)
      .expect(200)
      .expect('X-Rev-Cache', 'MISS')
      .expect('X-Rev-QA-1', 'Custom Nginx Command in BP back-end')
      .expect('X-Rev-QA-2', 'Custom Nginx Command in BP front-end')
      .expect('X-Rev-QA-3', 'Custom Nginx Command in CO')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should receive via HTTPS custom Nginx headers set on BP and CO proxies', function(done) {
    request(urls)
      .get('/test-cache.js')
      .set('Host', testDomain)
      .expect(200)
      .expect('X-Rev-Cache', 'MISS')
      .expect('X-Rev-QA-1', 'Custom Nginx Command in BP back-end')
      .expect('X-Rev-QA-2', 'Custom Nginx Command in BP front-end')
      .expect('X-Rev-QA-3', 'Custom Nginx Command in CO')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

});
