if (!window.revSetSrc) {
    window.revCurShard = -1;

    window._revChangeUrl = function(src) {
        src = src || "";
        host = window.location.host || "localhost";
        if (!window._rev_host_re) {
            window._rev_absurl_re = /^(?:https?:)?\/\//;
            window._rev_host_repl_re = /^((https?):)?\/\/([^\/]+)(.*)$/;
            if (revJSSubst.nshards)
                window._rev_host_re = new RegExp("^(https?:)?//(s\\d+-)?" + host);
            else
                window._rev_host_re = new RegExp("^(https?:)?//" + host);
            window._rev_url_map = {};
        }
        // Does it refer to the BP domain?
        if (!window._rev_absurl_re.test(src) || window._rev_host_re.test(src))
            return src;
        else {
            // We have to extract the protocol and domain from the URL
            m = src.match(window._rev_host_repl_re);
            wproto = window.location.protocol.slice(0,-1);
            proto = m[2] || wproto;

            base_url = proto + "://" + m[3];
            // If we don't know this third party domain on the BP and CO, don't change it
            if (!(base_url in revJSSubst.domains) && !(m[3] in revJSSubst.domains))
                return src;

            // If we must keep the protocol of the 3rd party and it's different from the current page's,
            // we must use absolute links containing the original 3rd party protocol
            absurl = revJSSubst.keep_https && proto == "https" && wproto != proto;

            // Sharding ?
            if (revJSSubst.nshards) {
                revCurShard = (revCurShard+1) % revJSSubst.nshards;
                prefix = absurl ? proto + ":" : "";
                return src.replace(window._rev_host_repl_re, prefix + "//s" + revCurShard + "-" + host + "/rev-third-party-" + proto + "/\$3\$4");
            }
            else {
                prefix = absurl ? proto + "://" + host : "";
                return src.replace(window._rev_host_repl_re, prefix + "/rev-third-party-" + proto + "/\$3\$4");
            }
        }
    }

    window.revSetSrc = function(obj,src) {
        obj.src = _revChangeUrl(src);
        if (obj.src != src)
            window._rev_url_map[obj.src] = src;
    }

    window.revGetSrc = function(obj) {
        return (window._rev_url_map && window._rev_url_map[obj.src]) || obj.src;
    }

    window.revSetHref = function(obj,href) {
        obj.href = _revChangeUrl(href);
        if (obj.href != href)
            window._rev_url_map[obj.href] = href;
    }

    window.revGetHref = function(obj) {
        return (window._rev_url_map && window._rev_url_map[obj.href]) || obj.href;
    }

    window._revChangeURLsInHTML = function(html) {
        var b = document.implementation.createHTMLDocument("").body;
        b.innerHTML = html;
        //console.log("Original innerHTML:", b.innerHTML);
        var i;
        var as = b.getElementsByTagName("a");
        for (i=0; i<as.length; ++i)
            as[i].href = _revChangeUrl(as[i].href);
        var links = b.getElementsByTagName("link");
        for (i=0; i<links.length; ++i)
            links[i].href = _revChangeUrl(links[i].href);
        var images = b.getElementsByTagName("img");
        for (i=0; i<images.length; ++i) {
            if (!window._rev_src_re)
                window._rev_src_re = /src\s*=\s*[\"\']([^\"\']+)[\"\']/;

            // Chrome bug: images[i].src is empty if image URL is relative
            var m = images[i].outerHTML.match(window._rev_src_re);
            if (m)
                images[i].src = _revChangeUrl(m[1]);
        }
        var scripts = b.getElementsByTagName("script");
        for (i=0; i<scripts.length; ++i)
            scripts[i].src = _revChangeUrl(scripts[i].src);

        //console.log("Final innerHTML:", b.innerHTML);
        return b.innerHTML;
    }

    window.revSetInnerHTML = function(obj,html) {
        obj.innerHTML = _revChangeURLsInHTML(html);
    }

    window.revDocumentWrite = function(obj,txt) {
        if (typeof txt === 'undefined')
            obj.write();
        else
            obj.write((obj instanceof Document) ? _revChangeURLsInHTML(txt) : txt);
    }
}