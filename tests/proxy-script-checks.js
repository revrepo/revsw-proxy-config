var
  should = require('should-http'),
  async = require('async'),
  https = require('https'),
  config = require('config'),
  fs = require("fs"),
  Promise = require('bluebird'),
  api = require('./proxy-qa-libs/api.js'),
  tools = require('./proxy-qa-libs/tools.js'),
  util = require('./proxy-qa-libs/util.js');

var originHostHeader = 'cdn.mbeans2.com',
  originServer = 'cdn.mbeans2.com',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testAPIUrl = config.get('testAPIUrl'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  contentHTTPLength = '',
  contentHTTPSLength = '';

var contents = fs.readFileSync("./scripts/decompression.json");
var jsonContent = JSON.parse(contents);

api.debugMode(false);
tools.debugMode(true);
//console.log(jsonContent);

var merge = function() {
    var destination = {},
        sources = [].slice.call( arguments, 0 );
    sources.forEach(function( source ) {
        var prop;
        for ( prop in source ) {
            if ( prop in destination && Array.isArray( destination[ prop ] ) ) {
                // Concat Arrays
                destination[ prop ] = destination[ prop ].concat( source[ prop ] );

            } else if ( prop in destination && typeof destination[ prop ] === "object" ) {
                // Merge Objects
                destination[ prop ] = merge( destination[ prop ], source[ prop ] );

            } else {
                // Set new values
                destination[ prop ] = source[ prop ];

            }
        }
    });
    return destination;
};

describe(jsonContent.name, function () {
  this.timeout(jsonContent.timeout);

  var tasks = jsonContent.tasks;

  function process(value) {
    // Domain creation for testing
    if (value.command == "create") {
      before(function (done) {
        tools.beforeSetDomain(newDomainName, originServer)
          .then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            domainConfigId = res.id;
            domainConfig = res.config;
          })
          .catch(function (err) {
            done(util.getError(err))
          })
          .then(function () {
            done();
          })
      });
    }
    // Setting domain options
    if (value.command == "update") {
      it(value.description, function (done) {
        domainConfig = merge(domainConfig, value.set);
        tools.afterSetDomain(domainConfigId, domainConfig).then(function (res, rej) {
          done();
        });
      });
    }
    // Domain removing
    if (value.command == "delete") {
      after(function (done) {
        api.deleteDomainConfigsById(domainConfigId).then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          var responseJson = JSON.parse(res.text);
          responseJson.statusCode.should.be.equal(202);
          responseJson.message.should.be.equal('The domain has been scheduled for removal');
          console.log('    \u001b[33m♦\u001b[36m domain deleting\u001B[0m');
          done();
        }).catch(function (err) {
          done(util.getError(err));
        });
      });
    }

    if (value.command == "check") {
      it(value.description, function (done) {

        var url = testHTTPUrl
        if(value.protocol == "HTTPS") { var url = testHTTPSUrl }

        tools.getHostRequest(url, value.check.url, newDomainName)
          .then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          //console.log(res.header);

          for (var key in value.check) {
            if (value.check[key] != '') {
              if (key == 'header') {
                for (var header in value.check[key]) {
                  res.header[header].should.equal(value.check[key][header]);
                }
              }
              if (key == 'content') {
                for (var text in value.check[key]) {
                  res.text.should.containEql(value.check[key][text]);
                }
              }
            }
          }

          done();
        }).catch(function (err) {
          done(util.getError(err));
        });
      });
    }

  };

  for (var task in tasks) {
    process(tasks[task]);
  }
});
