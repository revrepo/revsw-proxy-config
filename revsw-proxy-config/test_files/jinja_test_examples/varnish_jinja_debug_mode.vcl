







# Number of cached sites: 1









vcl 4.0;

import std;
import cookie;
import directors;
import timers;
import revvar;
import header;
import chromelogger;
import querystring;
import wurfl;
import var;

# BEGIN: (BP-259) including custom.vcl file
include "/etc/varnish/custom.vcl";
# END: (BP-259)

# Location of BP.
# BEGIN SITE 'test_server_1'
backend behttp_test___server___1 {
    .host = "127.0.0.1";
    .port = "9080";
    .probe = {
        .request =
        "test-request"
        "Connection: close"
        "Host: test_server_1";
        .expected_response = 1;
        .interval = 1s;
        .timeout = 1s;
        .window = 4; # If 2 out of the last 4 polls succeeded the backend is considered healthy, otherwise it will be marked as sick
        .threshold = 2;
    }

}
backend behttps_test___server___1 {
    .host = "127.0.0.1";
    .port = "9443";
    .probe = {
        .request =
        "test-request"
        "Connection: close"
        "Host: test_server_1";
        .expected_response = 1;
        .interval = 1s;
        .timeout = 1s;
        .window = 4; # If 2 out of the last 4 polls succeeded the backend is considered healthy, otherwise it will be marked as sick
        .threshold = 2;
    }

}
# END SITE 'test_server_1'

# Transparent forward proxy for redirects (30x)
backend befwproxy {
    .host = "127.0.0.1";
    .port = "9081";
}

# revsdk support
backend behttp_all_revsdk_net {
	.host = "127.0.0.1";
	.port = "9080";
}
backend behttps_all_revsdk_net {
	.host = "127.0.0.1";
	.port = "9443";
}

# all domains support
backend behttp_all {
	.host = "127.0.0.1";
	.port = "9080";
}
backend behttps_all {
	.host = "127.0.0.1";
	.port = "9443";
}

# Begin custom VCL backends
# BEGIN SITE 'test_server_1'
backend becustom_test___server___1_test_bakend {
	.host = "test-backends-url.com";
	.port = "80";
	.preresolve_dns = 0;
	  test
}
# END SITE 'test_server_1'
# End custom VCL backends

# Block 2: Define a key based on the User-Agent which can be used for hashing.
# Also set the PS-CapabilityList header for PageSpeed server to respect.
sub generate_user_agent_based_key {
    # Define placeholder PS-CapabilityList header values for large and small
    # screens with no UA dependent optimizations. Note that these placeholder
    # values should not contain any of ll, ii, dj, jw or ws, since these
    # codes will end up representing optimizations to be supported for the
    # request.
    set req.http.default_ps_capability_list_for_large_screens = "LargeScreen.SkipUADependentOptimizations:";
    set req.http.default_ps_capability_list_for_small_screens = "TinyScreen.SkipUADependentOptimizations:";

    # As a fallback, the PS-CapabilityList header that is sent to the upstream
    # PageSpeed server should be for a large screen device with no browser
    # specific optimizations.
    set req.http.PS-CapabilityList = req.http.default_ps_capability_list_for_large_screens;

    # Cache-fragment 1: Desktop User-Agents that support lazyload_images (ll),
    # inline_images (ii) and defer_javascript (dj).
    # Note: Wget is added for testing purposes only.
    if (req.http.User-Agent ~ "(?i)Chrome/|Firefox/|MSIE |Safari|Wget") {
        set req.http.PS-CapabilityList = "ll,ii,dj:";
    }
    # Cache-fragment 2: Desktop User-Agents that support lazyload_images (ll),
    # inline_images (ii), defer_javascript (dj), webp (jw) and lossless_webp
    # (ws).
    if (req.http.User-Agent ~
        "(?i)Chrome/[2][3-9]+\.|Chrome/[[3-9][0-9]+\.|Chrome/[0-9]{3,}\.") {
    set req.http.PS-CapabilityList = "ll,ii,dj,jw,ws:";
    }
    # Cache-fragment 3: This fragment contains (a) Desktop User-Agents that
    # match fragments 1 or 2 but should not because they represent older
    # versions of certain browsers or bots and (b) Tablet User-Agents that
    # on all browsers and use image compression qualities applicable to large
    # screens. Note that even Tablets that are capable of supporting inline or
    # webp images, e.g. Android 4.1.2, will not get these advanced
    # optimizations.
    if (req.http.User-Agent ~ "(?i)Firefox/[1-2]\.|MSIE [5-8]\.|bot|Yahoo!|Ruby|RPT-HTTPClient|(Google \(\+https\:\/\/developers\.google\.com\/\+\/web\/snippet\/\))|Android|iPad|TouchPad|Silk-Accelerated|Kindle Fire") {
        set req.http.PS-CapabilityList = req.http.default_ps_capability_list_for_large_screens;
    }
    # Cache-fragment 4: Mobiles and small screen Tablets will use image compression
    # qualities applicable to small screens, but all other optimizations will be
    # those that work on all browsers.
    if (req.http.User-Agent ~ "(?i)Mozilla.*Android.*Mobile*|iPhone|BlackBerry|Opera Mobi|Opera Mini|SymbianOS|UP.Browser|J-PHONE|Profile/MIDP|portalmmm|DoCoMo|Obigo|Galaxy Nexus|GT-I9300|GT-N7100|HTC One|Nexus [4|7|S]|Xoom|XT907") {
        set req.http.PS-CapabilityList = req.http.default_ps_capability_list_for_small_screens;
    }
    # Remove placeholder header values.
    unset req.http.default_ps_capability_list_for_large_screens;
    unset req.http.default_ps_capability_list_for_large_screens;
}

sub start_cookies_recv {
    # Start with empty per-request cookie rules.
    # We'll change these vars in each rule that matches the URL.
    revvar.unset(true, 5);
    revvar.unset(true, 6);
    revvar.unset(true, 7);
    revvar.unset(true, 1);
    revvar.unset(true, 9);
    revvar.unset(true, 2);
}

sub end_cookies_recv {
    # We will hash the cookies in X-Rev-Cookie-Hash in vcl_hash.
    # By default, ignore all cookies.
    unset req.http.X-Rev-Cookie-Hash;
    if (!revvar.get_bool(true, 5)) {
        if (revvar.get_string(true, 7)) {
            # Ignore all cookies EXCEPT these.
            cookie.filter_except(revvar.get_string(true, 7));
            set req.http.X-Rev-Cookie-Hash = cookie.get_string();
        }
        elsif (revvar.get_string(true, 6)) {
            # Ignore all these cookies and keep all the rest.
            cookie.filter_only(revvar.get_string(true, 6));
            set req.http.X-Rev-Cookie-Hash = cookie.get_string();
        }

        # Restore the recv ROUTEID cookie
        if (revvar.get_string(true, 10) && !cookie.isset("ROUTEID")) {
            cookie.set("ROUTEID", revvar.get_string(true, 10));
        }
    }

    # If we need to remove ignored cookies from the request, overwrite the Cookie header.
    # Otherwise, pass it unchanged.
    if (revvar.get_bool(true, 1)) {
        set req.http.Cookie = cookie.get_string();
    }
}

sub start_cookies_backend_response {
    # Start with a clean state.
    revvar.unset(false, 0);
    revvar.unset(false, 15);

    # Remove some or all Set-Cookie headers, if so decided in vcl_recv.
    if (revvar.get_bool(false, 2)) {
        # Save returned ROUTEID cookie; will restore it in vcl_deliver()
        revvar.set_string_allow_null(false, 3, header.get(beresp.http.Set-Cookie, "^ROUTEID="));

        if (revvar.get_bool(false, 5)) {
            # Remove all cookies.
            unset beresp.http.Set-Cookie;
        }
        else if (revvar.get_string(false, 9)) {
            # Remove only cookies that match the regex set in vcl_recv.
            header.remove(beresp.http.Set-Cookie, revvar.get_string(false, 9));
            header.remove(beresp.http.Set-Cookie, "^ROUTEID=");
        }
    }
}

sub vcl_init {
    timers.unit("microseconds");

    # Custom VCL backends
    # BEGIN SITE 'test_server_1'
    new dircustom_test___server___1_test_bakend = directors.rev_dns();
    if (dircustom_test___server___1_test_bakend.set_backend(becustom_test___server___1_test_bakend)) {}
    # END SITE 'test_server_1'
    # End custom VCL backends
}

sub vcl_hash {

    # add support for the *.revsdk.net
    # use the following to hash the data
    # 1. Host
    # 2. X-Rev-Host
    # 3. Url
    if (req.http.host ~ "(?i)\.revsdk\.net$") {
        hash_data(std.tolower(req.http.host + ":" + req.http.X-Rev-Host + ":" + req.http.url));
    }

        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-hash
    }
    # END SITE 'test_server_1'


    # Include User-Agent in hash if set

    # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
        hash_data(req.http.PS-CapabilityList);
    }
    # END SITE 'test_server_1'

    # Hash selected optimization profile
    hash_data(req.http.X-RevSw-Profile);

    # Hash per-domain caching rules
    hash_data(req.http.X-Rev-Rules-Hash);

    # Hash cookies if allowed.
    if (req.http.X-Rev-Cookie-Hash) {
        hash_data(req.http.X-Rev-Cookie-Hash);
    }

}

# Block 3a: Define ACL for purge requests
# BEGIN SITE 'test_server_1'
acl purgehttp_test_server_1 {
    # Purge requests are only allowed from localhost.
    "localhost";
    "127.0.0.1";
      "http://test-optimizer-http-url.com";
}
acl purgehttps_test_server_1 {
    # Purge requests are only allowed from localhost.
    "localhost";
    "127.0.0.1";
      "https://test-optimizer-https-url.com";
}
# END SITE 'test_server_1'

# Implement local purging support for *.revsdk.net
acl purgehttp_all_revsdk_net {
	"localhost";
	"127.0.0.1";
}
acl purgehttps_all_revsdk_net {
	"localhost";
	"127.0.0.1";
}

# Implement local purging support for *.revsw.net
acl purgehttp_all {
	"localhost";
	"127.0.0.1";
}
acl purgehttps_all {
	"localhost";
	"127.0.0.1";
}

# Block 3b: Issue purge when there is a cache hit for the purge request.
sub vcl_hit {
        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-hit
    }
    # END SITE 'test_server_1'


    set req.http.X-Rev-obj-ttl = obj.ttl;
    #set req.http.X-Rev-obj-grace = obj.grace;

    revvar.set_bool(true, 14, true);


    if (obj.ttl >= 0s) {
        # A pure unadultered hit, deliver it
        return (deliver);
    }

    # We have no fresh fish. Lets look at the stale ones.
    if (std.healthy(req.backend_hint)) {
        # Backend is healthy. Limit age to value set by caching rules.
        if (obj.ttl + revvar.get_duration(true, 17) > 0s) {
            return (deliver);
        } else {
            # No candidate for grace. Fetch a fresh object.
            return(fetch);
        }
    } else {
        # backend is sick - use full grace
        if (obj.ttl + obj.grace > 0s) {
            return (deliver);
        } else {
            # no graced object.
            return (fetch);
        }
    }

    # Not reachable
    return (fetch);
}

# Block 3c: Issue a no-op purge when there is a cache miss for the purge
# request.
sub vcl_miss {
        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-miss
    }
    # END SITE 'test_server_1'


}

# Block 4: In vcl_recv, on receiving a request, call the method responsible for
# generating the User-Agent based key for hashing into the cache.
sub vcl_recv {
    # Initialize the variable store.
    revvar.init_var_count(19);
    revvar.set_duration(true, 17, 10s);

    # Varnish has added the Apache address to X-Forwarded-For. Revert this.
    set req.http.X-Forwarded-For = regsub(req.http.X-Forwarded-For, "^([^,]+),?.*$", "\1");

    # Remove shards from hostname
    set req.http.Host = regsub(req.http.Host, "^s\d+-", "");

        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-recv
    }
    # END SITE 'test_server_1'


    call generate_user_agent_based_key;

    # Parse Cookie header into individual cookies.
    cookie.parse(req.http.Cookie);

    # Save the ROUTEID cookie; we need it for CO load balancing
    revvar.set_string_allow_null(true, 10, cookie.get("ROUTEID"));

    # Domain-specific configuration
    # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
    
    if (std.port(server.ip) == 8080) {
        set req.backend_hint = behttp_test___server___1;
    }
    else {
        set req.backend_hint = behttps_test___server___1;
    }

    # Adapt the default VCL logic: allow caching with cookies, don't add X-Forwarded-For.
    if (req.method != "GET" &&
    req.method != "HEAD" &&
    req.method != "PUT" &&
    req.method != "TRACE" &&
    req.method != "OPTIONS" &&
    req.method != "DELETE") {
        # Non-RFC2616 or CONNECT which is weird.
        # Also, POST times out when doing large uploads - see https://www.varnish-cache.org/trac/ticket/849
        return (pipe);
    }
    if (req.method != "GET" && req.method != "HEAD") {
        # We only deal with GET and HEAD by default
        return (pass);
    }

    # Block 3d: Verify the ACL for an incoming purge request and handle it.
    if (req.method == "PURGE") {
        if ((std.port(server.ip) == 8080 && client.ip !~ purgehttp_test_server_1) ||
            (std.port(server.ip) == 8443 && client.ip !~ purgehttps_test_server_1)) {
            return (synth(405, "Not allowed."));
        }
        return (purge);
    }

    call start_cookies_recv;

    #################### Cookies and query string plus per-domain rules hash handling ####################
    if (req.http.X-Orig-Host == "test-url.com" || req.http.X-Orig-Host ~ "^12313$") {

          
        # BEGIN: (BP-344) Check for bypass cookies
              if (req.http.cookie ~ "test=") {
                  return (pass);
              }
        # END: (BP-344) Check for bypass cookies
  
        if (req.url ~ "^test$") {
  
            set req.http.test-header = "fsdfdf";
  
            revvar.set_duration(true, 17, 1s);
  
            set req.http.X-Rev-Rules-Hash = req.http.X-Rev-Rules-Hash + ":OR1OO1-1-1test-keep-or-removeOE-1-1C1111test-ignore";
  
            # Should we remove ignored cookies from request/response ?
            revvar.set_bool(true, 1, true);
            revvar.set_bool(true, 2, true);
            # Ignore ALL cookies.
            revvar.set_bool(true, 5, true);
            revvar.unset(true, 6);
            revvar.unset(true, 7);
            revvar.unset(true, 9);
  
            # Ignore all query string parameters EXCEPT these.
            revvar.set_string_literal(true, 12, "test-keep-or-remove");
            revvar.unset(true, 13);
      }

    }
    ################## End cookies and query string plus per-domain rules hash handling ##################

    call end_cookies_recv;
    }
    # END SITE 'test_server_1'

    # Add in vcl_recv support for *.revsdk.net
    # a problem will appear in case no domains are defined
    elsif (req.http.host ~ "(?i)\.revsdk\.net$") {
        if (std.port(server.ip) == 8080) {
            set req.backend_hint = behttp_all_revsdk_net;
        } else {
            set req.backend_hint = behttps_all_revsdk_net;
        }

        if (req.method == "PURGE") {
            if ((std.port(server.ip) == 8080 && client.ip !~ purgehttp_all_revsdk_net) ||
                (std.port(server.ip) == 8443 && client.ip !~ purgehttps_all_revsdk_net)) {
                  return (synth(405, "Not allowed."));
            }
            return (purge);
        }

        if (req.method != "GET" && req.method != "HEAD") {
            # We only deal with GET and HEAD by default
            return (pass);
        }
    }

    # Add in vcl_recv support for *.revsw.net
    else {
        if (std.port(server.ip) == 8080) {
            set req.backend_hint = behttp_all;
        } else {
            set req.backend_hint = behttps_all;
        }

        if (req.method == "PURGE") {
            if ((std.port(server.ip) == 8080 && client.ip !~ purgehttp_all) ||
            (std.port(server.ip) == 8443 && client.ip !~ purgehttps_all)) {
                return (synth(405, "Not allowed."));
            }
            return (purge);
        }

        if (req.method != "GET" && req.method != "HEAD") {
            # We only deal with GET and HEAD by default
            return (pass);
        }
    }

    if (revvar.get_string(true, 12)) {
        set req.url = querystring.filter_except_csv(req.url, revvar.get_string(true, 12));
    }
    else if (revvar.get_string(true, 13)) {
        set req.url = querystring.filter_csv(req.url, revvar.get_string(true, 13));
    }

    return (hash);
}

sub vcl_pass {
        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-pass
    }
    # END SITE 'test_server_1'

}

sub vcl_pipe {
        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-pipe
    }
    # END SITE 'test_server_1'

}

sub vcl_purge {
        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-purge
    }
    # END SITE 'test_server_1'

}

sub vcl_backend_fetch {
        # BEGIN SITE 'test_server_1'
    if (bereq.http.host == "test_server_1") {
            test-backend_fetch
    }
    # END SITE 'test_server_1'


    /* The backend shouldn't get the GeoIP information from us
    if (bereq.http.X-Rev-CountryCode) {
    unset bereq.http.X-Rev-CountryCode;
    unset bereq.http.X-Rev-CountryName;
    unset bereq.http.X-Rev-CityName;
    unset bereq.http.X-Rev-Latitude;
    unset bereq.http.X-Rev-Longitude;
    }*/
}

# Block 6: Mark HTML uncacheable by caches beyond our control.
sub vcl_backend_response {
        # BEGIN SITE 'test_server_1'
    if (bereq.http.host == "test_server_1") {
            test-backend_response
    }
    # END SITE 'test_server_1'


    # Don't cache requests with status code between 307 and 499
    if (beresp.status > 307 && beresp.status <= 499 && beresp.status == 508) {
        set beresp.ttl = 0s;
        return (deliver);
    }

    # Serve stale object if problem with backend
    if (beresp.status >= 500 && beresp.status != 508) {
        set beresp.ttl = 0s;
        return (retry);
    }

    # This can happen if a backend responds with a redirect and Content Encoding (which Varnish returns a 503 for)
    if (beresp.http.Content-Encoding ~ "gzip" ) {
        if (beresp.http.Content-Length == "0") {
            unset beresp.http.Content-Encoding;
        }
    }

    # Remove headers set by upstream Varnish instances.
    unset beresp.http.X-Cache;
    unset beresp.http.X-Cache-Hits;

    if (beresp.http.Cache-Control || beresp.http.Expires) {
        # We need this var later on
        revvar.set_bool(false, 4, true);

        # The Expires header is confusing and causes wrong misses.
        # Max-Age takes precedence, so eliminate the confusion.
        if (beresp.http.Cache-Control ~ "max-age") {
            unset beresp.http.Expires;
        }
    }

    # Domain-specific configuration
    # BEGIN SITE 'test_server_1'
    if (bereq.http.host == "test_server_1") {
    
    # Don't allow browser to cache PageSpeed-optimized HTML.
    if (beresp.http.X-Mod-Pagespeed) {

        # Don't pass this header to the users; they don't have to know we use PS
        unset beresp.http.X-Mod-Pagespeed;
    }

    # Domain-specific configuration
    call start_cookies_backend_response;

    ############################# Caching override #############################
    revvar.set_bool(false, 0, false);
    revvar.set_duration(false, 18, 0s);

    if (bereq.http.X-Orig-Host == "test-url.com" || bereq.http.X-Orig-Host ~ "^12313$") {

          
        # do_esi if enable_esi is true
        if (bereq.url ~ "^test$") {
            set beresp.do_esi = true;
            set beresp.http.X-Rev-Esi = "esi";
        }
  
        # Does not cache when Set-Cookies are true
  
        if (bereq.url ~ "^test$") {
            # Override caching time (0 means "don't cache").
                set beresp.ttl = 1s;
            revvar.set_bool(false, 15, true);
            # Override browser caching; don't use either edge or origin value.
            revvar.set_bool(false, 0, true); # will always set Age to 0 before returning to browser
            set beresp.http.Cache-Control = "public, max-age=1, must-revalidate";
  
            revvar.set_bool(false, 16, true);
  
            set beresp.http.test = "test";
            revvar.set_duration(false, 18, 1s);
      }

    }
    ############################# End caching override #############################

    if (revvar.get_bool(false, 16) && # follow origin redirects
        (beresp.status == 301 || beresp.status == 302 || beresp.status == 303 || beresp.status == 307)) # redirect
    {
        # The request following a 303 must be GET (RFC2616)
        if (beresp.status == 303) {
            set bereq.method = "GET";
        }

        # Refetch the object from the specified location, using the Apache forward proxy
        set bereq.backend = befwproxy;
        set bereq.url = beresp.http.Location;
        return (retry);
    }
    else if (beresp.status != 200) { # don't follow origin redirects
        set beresp.http.Cache-Control = "max-age=0, no-cache, no-store";
        set beresp.ttl = 0s;
        return (deliver);
    }


    # Taken from default VCL, but without the Set-Cookie part.
    if (beresp.ttl <= 0s ||
    beresp.http.Vary == "*") {
        # Mark as "Hit-For-Pass" for the next 2 minutes
        set beresp.ttl = 120s;
        set beresp.http.X-Rev-Hit-For-Pass = "YES";
        set beresp.uncacheable = true;
        return (deliver);
    }


    }
    # END SITE 'test_server_1'

    # Add in vcl_backend_response support for *.revsdk.net
    # a problem will appear in case no domains are defined
    elseif (bereq.http.host ~ "(?i)\.revsdk\.net$") {
        revvar.set_duration(false, 18, 60s);

        if (beresp.status != 200) {
            set beresp.ttl = 0s;
            return (deliver);
        }

        set beresp.http.X-Rev-SDK = "1";

    }
    else {
        if (beresp.status != 200) {
            set beresp.ttl = 0s;
            return (deliver);
        }

        if (bereq.method != "GET" && bereq.method != "HEAD") {
            set beresp.ttl = 0s;
            return (deliver);
        }

        if (beresp.http.Set-Cookie) {
            set beresp.ttl = 0s;
            return (deliver);
        }

        revvar.set_duration(false, 18, 60s);
        set beresp.http.X-Rev-Default = "1";
    }

    set beresp.http.X-Rev-beresp-ttl = beresp.ttl;
    set beresp.http.X-Rev-beresp-grace = revvar.get_duration(false, 18);

    # Save original host and URL for smart ban.
    set beresp.http.X-Rev-Host = bereq.http.Host;
    set beresp.http.X-Rev-Url = bereq.url;

    # Compress objects stored in the cache, if not already compressed by backend
    if (beresp.http.Content-Type ~ "(image|audio|video|pdf|flash)") {
        set beresp.do_gzip = false;
    } else {
        set beresp.do_gzip = true;
    }

    # We can't use backend revvars in vcl_deliver, so we have to set headers instead
    if (revvar.get_bool(false, 15) && beresp.http.Age) {
        set beresp.http.rev-orig-age = beresp.http.Age;
        set beresp.ttl = beresp.ttl + std.duration(beresp.http.Age + "s", 0s);
    }
    if (revvar.get_bool(false, 0) && beresp.http.Age) {
        set beresp.http.rev-del-age = 1;
    }
    if (revvar.get_string(false, 3)) {
        set beresp.http.rev-FROUTEID = revvar.get_string(false, 3);
    }
    # Grace is set through caching rules
    if (revvar.get_duration(false, 18) > 0s) {
        set beresp.grace = revvar.get_duration(false, 18);
    }

    return (deliver);
}

sub vcl_backend_error {
        # BEGIN SITE 'test_server_1'
    if (bereq.http.host == "test_server_1") {
            test-backend_error
    }
    # END SITE 'test_server_1'

}

# WARNING: we can't use backend revvars in vcl_deliver !
sub vcl_deliver {
    # In Varnish 4 we can't rely on obj.hits, instead we must check if X-Rev-Id has more than one id.
    # See 'https://www.varnish-cache.org/trac/ticket/1492' and 'http://foshttpcache.readthedocs.org/en/latest/varnish-configuration.html'.
        if (revvar.get_bool(true, 14)) {
        set resp.http.X-Rev-Cache = "HIT";
        set resp.http.X-Rev-Cache-Hits = obj.hits;
        set resp.http.X-Rev-obj-ttl = req.http.X-Rev-obj-ttl;
        #set resp.http.X-Rev-obj-grace = req.http.X-Rev-obj-grace;

        # Since we can't remove headers from 'obj' after 'vcl_backend_response', we'll just have to
        # remove the cached ones from the response itself, since they are not relevant for this request
        # because they were generated while the resource was fetched following a MISS.
        unset resp.http.rev-FROUTEID;
        unset resp.http.X-Chromelogger-BE;
    } else {
        set resp.http.X-Rev-Cache = "MISS";

        # Restore the fetched ROUTEID cookie
        if (resp.http.rev-FROUTEID) {
            header.append(resp.http.Set-Cookie, resp.http.rev-FROUTEID);
            unset resp.http.rev-FROUTEID;
        }
    }

        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-deliver
    }
    # END SITE 'test_server_1'


    if (resp.http.rev-del-age) {
        # We are overriding the browser Cache-Control in vcl_backend_response.
        # The browser must always cache for 'new_ttl' seconds from now, so make Age 0.
        set resp.http.Age = 0;
        unset resp.http.rev-del-age;
    } else if (resp.http.rev-orig-age) {
        # Assume the object came from the origin with an Age header of 'origin_age' seconds.
        # We can't reset Age to 0 after vcl_backend_response (Varnish limitation), so the age will keep increasing
        # (let's call it 'real_age').
        # We are caching the object for 'new_ttl' seconds from 'origin_age' onward, which means that, from
        # the browser's perspective, Cache-Control='new_ttl' and Age='real_age - origin_age'.
        set resp.http.Age = std.integer(resp.http.Age, 0) - std.integer(resp.http.rev-orig-age, 0);
        unset resp.http.rev-orig-age;
    }

    # All times in microseconds.
    # Time from "request received and sent to a backend" to "first byte of response received from backend".
    set resp.http.X-Rev-Cache-BE-1st-Byte-Time = timers.req_response_time();
    # Backend compatibility (DEPRECATED).
    set resp.http.X-Rev-BE-1st-Byte-Time = resp.http.X-Rev-Cache-BE-1st-Byte-Time;
    # Time from "request received" to now (i.e. total processing time).
    set resp.http.X-Rev-Cache-Total-Time = timers.req_processing_time();

}

sub vcl_synth {
        # BEGIN SITE 'test_server_1'
    if (req.http.host == "test_server_1") {
            test-synth
    }
    # END SITE 'test_server_1'

}