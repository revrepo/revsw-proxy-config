process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');
var Promise = require('bluebird');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var domains = [];
tools.debugMode(false);

describe('Proxy cleaner', function () {
  this.timeout(240000);

  it('should find don\'t use domains', function (done) {
    api.getDomainConfigs().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      //console.log(response_json);
      for (var attributename in response_json) {
        var domain = response_json[attributename].domain_name;
        if (
            domain.substring(0, 10) == "delete-me-" ||
            domain.substring(0, 14) == "first-domain-1" ||
            domain.substring(0, 15) == "second-domain-1" ||
            domain.substring(0, 10) == "mydomain-1" ||
            domain.substring(0, 14) == "negativetest-1"
        ) {
          //console.log(domain);
          domains.push(response_json[attributename].id);
        }
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should remove don\'t use domains', function (done) {
    return new Promise(function () {
      if (domains.length) {
        var finish = 0;
        for (var i = 0; i < domains.length; i++) {
          api.deleteDomainConfigsById(domains[i]).then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            var responseJson = JSON.parse(res.text);
            //console.log(response_json);
            responseJson.statusCode.should.be.equal(202);
            responseJson.message.should.be.equal('The domain has been scheduled for removal');
            finish++;
            if (finish === domains.length) {
              done();
            }
          }).catch(function (err) {
            done(util.getError(err));
          });
        }
      } else {
        done();
      }
    });
    done();
  });

});
