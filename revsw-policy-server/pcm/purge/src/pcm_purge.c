/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

/* public includes */

/* pcm includes */
#include "libwebsockets.h"
#include "nxjson.h"
#include "pcm_purge.h"

/* globals */
pcm_purge_stats_t purge_stats;

/*
 * pcm_purge_construct_json
 */
static void
pcm_purge_construct_json (char       *rbuf,
                          char       *rid,
                          uint32_t   *ver,
                          const char *status)
{
    time_t time_stamp;
    char   host_name[128];

    (void)gethostname (host_name, (size_t)127);

    /* get the time stamp */
    time_stamp = pcm_util_get_current_time ();

    if (*ver == PCM_PURGE_CUR_VER) {
        *(rbuf + 0) = '\0';
        sprintf (rbuf,
                 "{\"host_name\":\"%s\", \"status\":\"%s\"}",
                 host_name, status);
    }

    if (*ver > PCM_PURGE_CUR_VER) {
        *(rbuf + 0) = '\0';
        sprintf (rbuf, "{\"host_name\":\"%s\", \"time_stamp\":\"%lu\", \"cur_ver\":\"%u\", \"status\":\"%s\"}", host_name, time_stamp, PCM_PURGE_CUR_VER, status);
    }

    if ((rid != NULL) && (*ver == PCM_PURGE_CUR_VER)) {
        *(rbuf + 0) = '\0';
        sprintf (rbuf, "{\"host_name\":\"%s\", \"time_stamp\":\"%lu\", \"cur_ver\":\"%u\", \"status\":\"%s\", \"req_id\":\"%s\"}", host_name, time_stamp, PCM_PURGE_CUR_VER, status, rid);
    }

    return;
}

/*
 * pcm_purge_process_data
 */
static pcm_rc_t
pcm_purge_process_data (struct libwebsocket *wsi,
                        void                *in,
                        time_t              *tsp)
{
    char          *jobj_orig = (char *)in;
    char          *jobj = jobj_orig;
    const nx_json *json;
    const char    *status = "success";
    char          *reqid = NULL;
    char           reply_buf[PCM_PURGE_JSON_BUFLEN];
    struct stat    st;
    struct timeval tv1, tv2;
    time_t         time_stamp;
    time_t         ts1 = *tsp;
    time_t         ts2;
    uint32_t       version = 0;
    size_t         reply_len = 0;
    uint32_t       size = 0;
    int            rc;
    int            n = 0;
    uint8_t        consider_success = false;
    pcm_rc_t       pcm_rc = PCM_RC_OK;

    rev_mutex_lock (&pcm_purge_mutex);

    purge_stats.pps_requests++;

    if (!jobj) {
        pcm_rc = PCM_RC_INVALID_JSON_OBJECT;
        status = "input-error";
        purge_stats.pps_errors++;
        goto send_reply;
    }
 
    /* get the time stamp */
    gettimeofday (&tv1, NULL);

    /* write request to a file */
    pcm_rc = pcm_util_write_json_to_file (jobj_orig,
                                          PCM_PURGE_JSON_PATH);
    if (pcm_rc != PCM_RC_OK) {
        pcm_rc = PCM_RC_FILE_WRITE_FAILED;
        status = "file-error";
        purge_stats.pps_errors++;
        goto send_reply;
    }

    json = nx_json_parse (jobj, 0);
    if (!json) {
        pcm_rc = PCM_RC_INVALID_JSON_OBJECT;
        goto send_reply;
    }

    version = (uint32_t)(nx_json_get (json, "version")->int_value);
    if (version && (version > PCM_PURGE_CUR_VER)) {
        pcm_rc = PCM_RC_INVALID_PURGE_VERSION;
        status = "version-mismatch";
        purge_stats.pps_errors++;
        goto send_reply;
    }

    reqid = (char *)(nx_json_get (json, "request_id")->text_value);
    if (reqid && (version != PCM_PURGE_CUR_VER)) {
        /* temporarily allow this case */
        pcm_rc = PCM_RC_INVALID_PURGE_VERSION;
        status = "version-mismatch";
        purge_stats.pps_errors++;
        goto send_reply;
    }

    if (!reqid) {
        PCMP_LOG_DEBUG ("%s: processing purge request",
                       func_name);
    } else {
        PCMP_LOG_DEBUG ("%s: processing purge request [id %s]",
                       func_name, reqid);
    }

    if (1 == system ("pidof -x apache2 > /dev/null")) {
        pcm_rc = PCM_RC_PROCESS_NOT_STARTED;
        status = "system-error";
        purge_stats.pps_errors++;
        goto send_reply;
    }

    rc = system (PCM_PURGE_SCRIPT_NAME);
    if (rc != 0) {
        pcm_rc = PCM_RC_SYSTEM_CMD_FAILED;
        status = "system-error";
        purge_stats.pps_errors++;
        goto send_reply;
    }

    purge_stats.pps_success++;
    consider_success = true;

send_reply:

    reply_buf[0] = '\0';

    pcm_purge_construct_json (reply_buf, reqid, &version, status);

    reply_len = (size_t) rev_strlen (reply_buf);
    reply_buf[reply_len] = '\0';

    /* return reply code to sender */
    n = libwebsocket_write (wsi,
                              (unsigned char *)reply_buf,
                              reply_len,
                              LWS_WRITE_TEXT);
    if (n < 0) {
        pcm_rc = PCM_RC_WEBSOCK_WRITE_FAILED;
        purge_stats.pps_errors++;
        if (consider_success) {
            /* adjust previous increment */
            purge_stats.pps_success--;
            consider_success = false;
        }

        goto exit_unlock;
    }

    if (n && (n < (int)reply_len)) {
        PCMP_LOG_WARN ("%s: partial write (actual %u sent %u)",
                      __FUNCTION__, (uint32_t)reply_len, (uint32_t)n);
    }

    purge_stats.pps_replies++;

exit_unlock:

    /* get the time stamps */
    gettimeofday (&tv2, NULL);
    ts2 = pcm_util_get_current_time ();

    PCMP_LOG_INFO ("%s[reqid: %s]: json rcvd time: %lu sent time: %lu processing time: %u.%u secs",
                   __FUNCTION__, reqid, ts1, ts2,
                   (unsigned int)(tv2.tv_sec-tv1.tv_sec),
                   (unsigned int)(tv2.tv_usec-tv1.tv_usec));

    if (purge_stats.pps_debug) {
        stat (PCM_PURGE_REPLY_LOG_PATH, &st);
        size = (uint32_t)st.st_size;
        /* log replies to a file */
        strcat (reply_buf, "\r\n");
        if (size <= PCM_PURGE_LOG_SIZE) {
            pcm_rc = pcm_util_append_status_to_file (reply_buf,
                                            PCM_PURGE_REPLY_LOG_PATH);
        }

        stat (PCM_PURGE_STATS_LOG_PATH, &st);
        size = (uint32_t)st.st_size;
        /* log stats to a file */
        if (size <= PCM_PURGE_LOG_SIZE) {
            /* get the time stamp */
            time_stamp = pcm_util_get_current_time ();

            reply_buf[0] = '\0';
            sprintf (reply_buf,
                     "{\"req_rcvd\":\"%lu\", \"resp_sent\":\"%lu\",  \"time_stamp\":\"%lu\", \"fail\":\"%lu\", \"pass\":\"%lu\"}",
                purge_stats.pps_requests,
                purge_stats.pps_replies,
                time_stamp,
                purge_stats.pps_errors,
                purge_stats.pps_success);

            strcat (reply_buf, "\r\n");
            pcm_rc = pcm_util_append_status_to_file (reply_buf,
                                            PCM_PURGE_STATS_LOG_PATH);
        }
    }

    rev_mutex_unlock (&pcm_purge_mutex);

    return (pcm_rc);
}

/*
 * pcm_purge_process_data
 */
static int
pcm_purge_process_data_cb (
                  struct libwebsocket_context        *context UNUSED_PTR,
                  struct libwebsocket                *wsi,
                  enum libwebsocket_callback_reasons  reason,
                  void                               *user    UNUSED_PTR,
                  void                               *in,
                  size_t                              len)
{
    pcm_rc_t pcm_rc = PCM_RC_OK;
    time_t   ts;

    switch (reason) {

    case LWS_CALLBACK_ESTABLISHED:
        PCMP_LOG_DEBUG ("%s: connection established", func_name);
        break;

    case LWS_CALLBACK_RECEIVE:
        PCMP_LOG_INFO ("%s: received %d bytes json", func_name, (int)len);
        /* get the time stamp */
        ts = pcm_util_get_current_time ();
        pcm_rc = pcm_purge_process_data (wsi, in, &ts);
        if (pcm_rc != PCM_RC_OK) {
            PCMP_LOG_ERROR ("%s: pcm_purge_process_data failed (%s)",
                           func_name, pcm_rc_str (pcm_rc));
        } else {
            PCMP_LOG_INFO ("%s: processed purge request and replied",
                          func_name);
        }

        break;

    case LWS_CALLBACK_CLOSED:
        PCMP_LOG_DEBUG ("%s: connection closed", func_name);
        break;

    default:
        break;
    }

    return ((int)PCM_RC_OK);
}

/*
 * pcm_purge_http_cb
 */
static int
pcm_purge_http_cb (
          struct libwebsocket_context        *context UNUSED_PTR,
          struct libwebsocket                *wsi     UNUSED_PTR,
          enum libwebsocket_callback_reasons  reason  UNUSED_VAR,
          void                               *user    UNUSED_PTR,
          void                               *in      UNUSED_PTR,
          size_t                              len     UNUSED_VAR)
{
    return (0);
}

static struct libwebsocket_protocols protocols[] = {
    {"http-only", pcm_purge_http_cb, 0, 0, 0, NULL, 0},
    {"collector-bridge", pcm_purge_process_data_cb, 0, 0, 0, NULL, 0},
    {NULL, NULL, 0, 0, 0, NULL, 0}
};

/*
 * pcm_purge_thread_main
 */
void *
pcm_purge_thread_main (void *arg UNUSED_PTR)
{
    struct libwebsocket_context      *context;
    const char                       *iface = NULL;
    char                             *ssl_ws = NULL;
    char                             *debug = NULL;
    struct lws_context_creation_info  info;
    unsigned int                      opts = 0;
    int                               use_ssl = 0;
    int                               debug_level = 6;

    memset(&info, 0, sizeof (info));
    memset(&purge_stats, 0, sizeof (purge_stats));

    /* assiagn the values to info */
    info.port = PCM_PURGE_LISTNER_PORT;
    info.iface = iface;
    info.protocols = protocols;
#ifndef LWS_NO_EXTENSIONS
    info.extensions = libwebsocket_get_internal_extensions ();
#endif
    info.gid = -1;
    info.uid = -1;
    info.options = opts;

    ssl_ws = (char *)getenv ("SSLWS");
    if (ssl_ws) {
        use_ssl = *ssl_ws - '0';
    }

    debug = (char *)getenv ("PURGE_DEBUG");
    if (debug) {
        purge_stats.pps_debug = *debug - '0';
    }

    purge_stats.pps_debug = 1;

    if (purge_stats.pps_debug) {
#ifdef DEBUG_COL_BRIDGE
        PCMP_LOG_DEBUG ("%s: enabled purge debug", func_name);
#endif
    }

    if (use_ssl) {
#ifdef DEBUG_COL_BRIDGE
        PCMP_LOG_DEBUG ("%s: pcmp using ssl", func_name);
#endif
        info.ssl_cert_filepath = PCM_PURGE_LWS_SSL_CERT;
        info.ssl_private_key_filepath = PCM_PURGE_LWS_SSL_KEY;
    } else {
#ifdef DEBUG_COL_BRIDGE
        PCMP_LOG_DEBUG ("%s: pcmp using no-ssl", func_name);
#endif
        info.ssl_cert_filepath = NULL;
        info.ssl_private_key_filepath = NULL;
    }

    /* redirect logs to syslog, check /var/log */
    lws_set_log_level (debug_level, lwsl_emit_syslog);

    /* create libwebsocket context for this server */
    context = libwebsocket_create_context (&info);

    if (context == NULL) {
        PCMP_LOG_ERROR ("%s: libwebsocket init failed", func_name);
    }

#ifdef DEBUG_COL_BRIDGE
    PCMP_LOG_DEBUG ("%s: starting purge listner...", func_name);
#endif

    while (true) {
        libwebsocket_service (context, PCM_SOCK_WAIT_TIME);
    }

    libwebsocket_context_destroy (context);

    return (arg);
}


/*
 * pcm_purge_thread_main_essl
 */
void *
pcm_purge_thread_main_essl (void *arg UNUSED_PTR)
{
    struct libwebsocket_context      *context;
    const char                       *iface = NULL;
    char                             *debug = NULL;
    struct lws_context_creation_info  info;
    unsigned int                      opts = 0;
    int                               debug_level = 6;

    memset(&info, 0, sizeof (info));
    memset(&purge_stats, 0, sizeof (purge_stats));

    /* assign the values to info */
    info.port = PCM_PURGE_LISTNER_PORT_SSL;
    info.iface = iface;
    info.protocols = protocols;
#ifndef LWS_NO_EXTENSIONS
    info.extensions = libwebsocket_get_internal_extensions ();
#endif
    info.gid = -1;
    info.uid = -1;
    info.options = opts;

    debug = (char *)getenv ("PURGE_DEBUG");
    if (debug) {
        purge_stats.pps_debug = *debug - '0';
    }

    purge_stats.pps_debug = 1;

    if (purge_stats.pps_debug) {
#ifdef DEBUG_COL_BRIDGE
        PCMP_LOG_DEBUG ("%s: enabled purge debug", func_name);
#endif
    }

    info.ssl_cert_filepath = PCM_PURGE_LWS_SSL_CERT;
    info.ssl_private_key_filepath = PCM_PURGE_LWS_SSL_KEY;

    /* redirect logs to syslog, check /var/log */
    lws_set_log_level (debug_level, lwsl_emit_syslog);

    /* create libwebsocket context for this server */
    context = libwebsocket_create_context (&info);

    if (context == NULL) {
        PCMP_LOG_ERROR ("%s: libwebsocket init failed", func_name);
    }

#ifdef DEBUG_COL_BRIDGE
    PCMP_LOG_DEBUG ("%s: starting purge listner...", func_name);
#endif

    while (true) {
        libwebsocket_service (context, PCM_SOCK_WAIT_TIME);
    }

    libwebsocket_context_destroy (context);

    return (arg);
}

