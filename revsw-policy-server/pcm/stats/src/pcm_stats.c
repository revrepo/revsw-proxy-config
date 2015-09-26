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
#include <rev_defs.h>
#include <rev_utils.h>

/* pcm includes */
#include "pcm_stats.h"
#include "pcm_util.h"

#include "libwebsockets.h"
#include "nxjson.h"

//#define USE_REV_TC

/* globals */

#ifdef USE_REV_TC

#include "ipc.h"

/*
 * pcm_stats_get_mapped_code
 */
static pcm_rc_t
pcm_stats_get_mapped_code (rev_tc_rc_t tc_rc)
{
    pcm_rc_t pcm_rc = PCM_RC_OK;

    switch (tc_rc) {

    case REV_TC_RC_SUCCESS:
        pcm_rc = PCM_RC_OK;

    case REV_TC_RC_NO_INSTANCE:
        pcm_rc = PCM_RC_TC_NO_INSTANCE;

    case REV_TC_RC_SHM_INIT_ERR:
        pcm_rc = PCM_RC_TC_SHM_INIT_ERR;

    case REV_TC_RC_INVALID_DOMAIN:
        pcm_rc = PCM_RC_TC_INVALID_DOMAIN;

    case REV_TC_RC_NO_DOMAIN:
        pcm_rc = PCM_RC_TC_NO_DOMAIN;
    }

    return (pcm_rc);
}
#endif // USE_REV_TC

/*
 * pcm_stats_get_attack_count
 */
static uint64_t
pcm_stats_get_attack_count (const char *dir)
{
    FILE               *fp;
    char                cmd[1024];
    unsigned long long  count = 0;

    system ("mkdir /tmp/._attack");

    sprintf (cmd, "mv %s/* %s", dir, PCM_STATS_MODSEC_TEMP_PATH);

    /* move files to tmp directory */
    system (cmd);

    system ("ls -lR /tmp/._attack | grep ^d | wc -l > /tmp/attack_cnt.log");

    fp = fopen ("/tmp/attack_cnt.log", "r");
    if (fp == NULL) {
        PCMS_LOG_ERROR ("%s: fopen failed", func_name);
        return (0);
    }

    fscanf (fp, "%llu", &count);

    fclose (fp);

    /* delete counted files */
    system ("rm -rf /tmp/._attack/*");

    /* delete created files */
    system ("rm -rf /tmp/attack_cnt.log");

    PCMS_LOG_DEBUG ("%s: attack count returned %llu", func_name, count);

    return ((uint64_t)count);
}

/*
 * pcm_stats_construct_json
 */
static void
pcm_stats_construct_json (const char     *domain,
                          char           *reply_buf,
#ifdef USE_REV_TC
                          rev_tc_element *rte,
                          rev_tc_rc_t     status_code,
#endif
                          time_t          time_stamp,
                          uint64_t        attack_count)
{
    sprintf (&reply_buf[rev_strlen (reply_buf)], "{\"domain_name\":\"%s\",\"rev_stats\":{\"time_stamp\":%lu,\"page_count\":%lu,\"bytes_count\":%lu,\"status\":\"%s\",\"attack_count\":%lu}},",
             domain,
             time_stamp,
#ifdef USE_REV_TC
             rte->page_count,
             rte->byte_count,
             ((status_code == REV_TC_RC_SUCCESS) ? "success" :
               (status_code == REV_TC_RC_NO_DOMAIN) ? "nodomain" :
                (status_code == REV_TC_RC_INVALID_DOMAIN) ? "dnamenull" : "failure"),
#else
             0,
             0,
             "success",
#endif
             attack_count);

    return;
}

/*
 * pcm_stats_retrieve_stats
 */
static void
pcm_stats_retrieve_stats (char       *buf,
                          const char *dn)
{
    time_t         time_stamp;
    uint64_t       attack_count;
    char           dir[1024];
    pcm_rc_t       pcm_rc = PCM_RC_OK;

#ifdef USE_REV_TC
    rev_tc_handle  hdl;
    rev_tc_element rte; /* traffic counters from BP */
    rev_tc_rc_t    tc_rc = REV_TC_RC_SUCCESS;

    rev_memset (&rte, 0, sizeof (rev_tc_element));

    hdl = rev_tc_open (REV_TC_API_VERSION);
    if (!hdl) {
        pcm_rc = PCM_RC_TC_INST_INIT_FAILED;
        PCMS_LOG_ERROR ("%s: %s", func_name, pcm_rc_str (pcm_rc));
        return;
    }

    tc_rc = rev_tc_get_domain_counters (hdl, dn, &rte);
    if (tc_rc != REV_TC_RC_SUCCESS) {
        pcm_rc = pcm_stats_get_mapped_code (tc_rc);
        PCMS_LOG_ERROR ("%s: %s", func_name, pcm_rc_str (pcm_rc));
    }

    rev_tc_close (hdl);
#endif

    /* get the time stamp */
    time_stamp = pcm_util_get_current_time ();

    /* get attack count for given domain */
    sprintf (dir, "%s/%s", PCM_STATS_MODSEC_ATTACK_PATH, dn);
    attack_count = pcm_stats_get_attack_count (dir);

    /* construct stats json to be sent to portal */
    pcm_stats_construct_json (dn, buf,
#ifdef USE_REV_TC
                              &rte, tc_rc,
#endif
                              time_stamp, attack_count);

    return;
}

/*
 * pcm_stats_process_data
 */
static pcm_rc_t
pcm_stats_process_data (struct libwebsocket *wsi,
                        void                *in,
                        size_t               len UNUSED_VAR)
{
    char          *jobj_orig = (char *)in;
    char          *jobj = jobj_orig;
    char          *dn = NULL;
    const nx_json *json;
    char           host_name[128];
    char           reply_buf[PCM_STATS_JSON_BUFLEN];
    char           domain_name[PCM_STATS_DOMAIN_NAME_LEN];
    char           key[8];
    size_t         reply_len = 0;
    int            i = 48;
    int            n = 0;
    pcm_rc_t       pcm_rc = PCM_RC_OK;

    rev_mutex_lock (&pcm_stats_mutex);

    /* dump request to a file */
    pcm_rc = pcm_util_write_json_to_file (jobj_orig,
                                          PCM_STATS_REQUEST_LOG_PATH);
    if (pcm_rc != PCM_RC_OK) {
        goto exit_unlock;
    }

    if (!jobj) {
        pcm_rc = PCM_RC_INVALID_JSON_OBJECT;
        goto exit_unlock;
    }

    json = nx_json_parse (jobj, 0);

    if (!json) {
        pcm_rc = PCM_RC_INVALID_JSON_OBJECT;
        goto exit_unlock;
    }

    if (1 == system ("pidof -x apache2 > /dev/null")) {
        pcm_rc = PCM_RC_PROCESS_NOT_STARTED;
        goto exit_unlock;
    }

    reply_buf[0] = '\0';

    (void)gethostname (host_name, (size_t)127);

    sprintf (reply_buf,
             "{\"version\":\"1.0.0\", \"host_name\":\"%s\", \"domains\":[",
             host_name);

    while (true) {
        sprintf (key, "d%c", ++i);
        dn = NULL;
        dn = (char *)(nx_json_get (nx_json_get (json,
                                  "domain_names"), key)->text_value);
        if (!dn) {
            break; /* we are done */
        }

        PCMS_LOG_DEBUG ("%s: processing stats req for domain %s",
                       func_name, dn);

        rev_strncpy (domain_name, dn, (size_t)(rev_strlen (dn)+1));

        /* pull stats from BP for a given domain */
        pcm_stats_retrieve_stats (reply_buf, domain_name);
    }

    reply_buf[rev_strlen (reply_buf) + 1] = '\0';
    reply_buf[rev_strlen (reply_buf) - 1] = ']';
    reply_buf[rev_strlen (reply_buf)] = '}';

    reply_len = (size_t) rev_strlen (reply_buf);

    /* send retrieved traffic counters to portal */
    n = libwebsocket_write (wsi,
                            (unsigned char *)reply_buf,
                            (size_t)reply_len,
                            LWS_WRITE_TEXT);

    if (n < 0) {
        pcm_rc = PCM_RC_WEBSOCK_WRITE_FAILED;
        goto exit_unlock;
    }

    if (n && (n < (int)reply_len)) {
        PCMS_LOG_WARN ("%s: partial write (actual %u sent %u)",
                      __FUNCTION__, (uint32_t)reply_len, (uint32_t)n);
    }

    /* dump reply to a file */
    (void)pcm_util_write_json_to_file (reply_buf,
                                       PCM_STATS_REPLY_LOG_PATH);

exit_unlock:

    rev_mutex_unlock (&pcm_stats_mutex);
    /* return status */
    return (pcm_rc);
}

/*
 * pcm_stats_process_data
 */
static int
pcm_stats_process_data_cb (
                  struct libwebsocket_context        *context UNUSED_PTR,
                  struct libwebsocket                *wsi,
                  enum libwebsocket_callback_reasons  reason,
                  void                               *user    UNUSED_PTR,
                  void                               *in,
                  size_t                              len)
{
    pcm_rc_t pcm_rc = PCM_RC_OK;

    switch (reason) {

    case LWS_CALLBACK_ESTABLISHED:
        PCMS_LOG_DEBUG ("%s: connection established", func_name);
        break;

    case LWS_CALLBACK_RECEIVE:
        pcm_rc = pcm_stats_process_data (wsi, in, len);
        if (pcm_rc != PCM_RC_OK) {
            PCMS_LOG_ERROR ("%s: pcm_stats_process_data failed (%s)",
                           func_name, pcm_rc_str (pcm_rc));
        } else {
            PCMS_LOG_INFO ("%s: processed stats request and replied",
                          func_name);
        }

        break;

    case LWS_CALLBACK_CLOSED:
        PCMS_LOG_DEBUG ("%s: connection closed", func_name);
        break;

    default:
        break;
    }

    return ((int)PCM_RC_OK);
}

/*
 * pcm_stats_http_cb
 */
static int
pcm_stats_http_cb (
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
    {"http-only", pcm_stats_http_cb, 0, 0, NULL, 0},
    {"collector-bridge", pcm_stats_process_data_cb, 0, 0, NULL, 0},
    {NULL, NULL, 0, 0, NULL, 0}
};

/*
 * pcm_stats_thread_main
 */
void *
pcm_stats_thread_main (void *arg UNUSED_PTR)
{
    struct libwebsocket_context      *context;
    const char                       *iface = NULL;
    char                             *ssl_ws = NULL;
    struct lws_context_creation_info  info;
    unsigned int                      opts = 0;
    int                               use_ssl = 0;
    int                               debug_level = 6;

    memset(&info, 0, sizeof (info));

    /* assiagn the values to info */
    info.port = PCM_STATS_LISTNER_PORT;
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

    if (use_ssl) {
#ifdef DEBUG_COL_BRIDGE
        PCMS_LOG_DEBUG ("%s: pcms using ssl", func_name);
#endif
        info.ssl_cert_filepath = PCM_STATS_LWS_SSL_CERT;
        info.ssl_private_key_filepath = PCM_STATS_LWS_SSL_KEY;
    } else {
#ifdef DEBUG_COL_BRIDGE
        PCMS_LOG_DEBUG ("%s: pcms using no-ssl", func_name);
#endif
        info.ssl_cert_filepath = NULL;
        info.ssl_private_key_filepath = NULL;
    }

    /* redirect logs to syslog, check /var/log */
    lws_set_log_level (debug_level, lwsl_emit_syslog);

    /* create libwebsocket context for this server */
    context = libwebsocket_create_context (&info);

    if (context == NULL) {
        PCMS_LOG_ERROR ("%s: libwebsocket init failed", func_name);
    }

#ifdef DEBUG_COL_BRIDGE
    PCMS_LOG_DEBUG ("%s: starting stats listner...", func_name);
#endif

    while (true) {
        libwebsocket_service (context, PCM_SOCK_WAIT_TIME);
    }

    libwebsocket_context_destroy (context);

    return (arg);
}

