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
#include <unistd.h>

/* pcm includes */
#include "libwebsockets.h"
#include "nxjson.h"
#include "pcm_config.h"

/*
 * pcm_config_construct_json
 */
static void
pcm_config_construct_json (char       *rbuf,
                           const char *status)
{
    char host_name[128];

    (void)gethostname (host_name, (size_t)127);

    sprintf (rbuf,
             "{\"host_name\":\"%s\", \"status\":\"%s\"}",
             host_name, status);

    return;
}

/*
 * pcm_config_process_data
 */
static pcm_rc_t
pcm_config_process_data (struct libwebsocket        *wsi,
                         void                       *in,
                         size_t                      len,
                         pcm_config_process_data_s *userdata)
{
    char          *dn = NULL;
    char          *sdk_operation = NULL;
    char          *configuration_type = NULL;
    const nx_json *json;
    const char    *status = "success";
    const char    *tmp_file_location="/tmp/local-json-configuration.json";
    char           reply_buf[PCM_CONFIG_JSON_BUFLEN];
    char           file_path[PCM_CONFIG_FILE_BUFLEN];
    char           base_command[PCM_CONFIG_CMD_BUFLEN];
    char           command[PCM_CONFIG_CMD_BUFLEN];
    struct timeval tv1, tv2;
    time_t         ts1 = pcm_util_get_current_time ();
    time_t         ts2;
    int            rc;
    int            n = 0;
    int            reply_len = 0;
    pcm_rc_t       pcm_rc = PCM_RC_OK;
    size_t         remaining;

    rev_mutex_lock (&pcm_config_mutex);

    remaining = libwebsockets_remaining_packet_payload(wsi);
    PCMC_LOG_INFO ("%s: received %d bytes of json, %d remaining; last byte is %#x", __FUNCTION__,
                   (int)len, (int)remaining, (int)(len ? ((char*)in)[len-1] : '!'));

    if (!in || !len) {
        pcm_rc = PCM_RC_INVALID_JSON_OBJECT;
        status = "input-error";
        goto send_reply;
    }

    /* Alloc or append JSON buffer. The extra byte is for the zero termination. */
    userdata->json_in = realloc(userdata->json_in, userdata->json_in_len + len + 1);
    memcpy(userdata->json_in + userdata->json_in_len, in, len);
    userdata->json_in_len += len;
    userdata->json_in[userdata->json_in_len] = 0;

    /* get the time stamp */
    gettimeofday (&tv1, NULL);

    /* Did we get all the data ? Process the JSON then */
    if (!remaining) {
        /* HACK:
           If the JSON is large, it may take more than one buffer to receive.
           Since we don't know the final size, we have to look for '}' at the end.
         */
        if (userdata->json_in[userdata->json_in_len - 1] != '}') {
            PCMC_LOG_INFO ("%s: got partial json data, %d bytes so far", __FUNCTION__,
                           (int)userdata->json_in_len);
            remaining = 1;  /* to prevent deallocation further down */
            goto exit_unlock;
        }

        PCMC_LOG_INFO ("%s: got all data, processing json of size %d", __FUNCTION__,
                       (int)userdata->json_in_len);

        /* Write request to a temp file */
        pcm_rc = pcm_util_write_json_to_file (userdata->json_in, tmp_file_location);
        if (pcm_rc != PCM_RC_OK) {
            pcm_rc = PCM_RC_FILE_WRITE_FAILED;
            status = "file-error";
            goto send_reply;
        }

        /* Parse the JSON */
        json = nx_json_parse (userdata->json_in, 0);
        if (!json) {
            pcm_rc = PCM_RC_INVALID_JSON_OBJECT;
            status = "input-error";
            goto send_reply;
        }

        configuration_type = (char *)(nx_json_get (json, "configuration_type")->text_value);
        PCMC_LOG_DEBUG ("%s: value of configuration_type field: %s", func_name, configuration_type);
        if (configuration_type) {
            if (strcmp(configuration_type, "sdk_apps_config") == 0) {
                sdk_operation = (char *)(nx_json_get (json, "operation")->text_value);

                if (!sdk_operation) {
                    pcm_rc = PCM_RC_INVALID_SDK_OPERATION;
                    status = "input-error";
                    goto send_reply;
                }

                sprintf (base_command, "%s", PCM_CONFIG_SDK_SCRIPT_NAME);
                sprintf (file_path, "%s/apps.json", PCM_CONFIG_JSON_PATH);

                PCMC_LOG_DEBUG ("%s: processing config for sdk apps", func_name);
            } else {
                pcm_rc = PCM_RC_INVALID_CONFIGURATION_TYPE;
                status = "input-error";
                goto send_reply;
            }

        } else {
            dn = (char *)(nx_json_get (json, "domain_name")->text_value);

            if (!dn) {
                pcm_rc = PCM_RC_INVALID_DOMAIN_NAME;
                status = "input-error";
                goto send_reply;
            }

            sprintf (base_command, "%s", PCM_CONFIG_DOMAIN_SCRIPT_NAME);
            sprintf (file_path, "%s/ui-config-%s.json", PCM_CONFIG_JSON_PATH, dn);

            PCMC_LOG_DEBUG ("%s: processing config req for domain %s", func_name, dn);

        }

        /* check if Apache running */
        if (1 == system ("pidof -x apache2 > /dev/null")) {
            pcm_rc = PCM_RC_PROCESS_NOT_STARTED;
            status = "system-error";
            goto send_reply;
        }

        sprintf (command, "mv %s %s", tmp_file_location, file_path);

        rc = system (command);
        if (rc != 0) {
            pcm_rc = PCM_RC_SYSTEM_CMD_FAILED;
            status = "system-error";
            goto send_reply;
        }

        sprintf (command, "%s -f %s", base_command, file_path);

        rc = system (command);
        if (rc != 0) {
            pcm_rc = PCM_RC_SYSTEM_CMD_FAILED;
            status = "system-error";
            goto send_reply;
        }

send_reply:

        reply_buf[0] = '\0';

        pcm_config_construct_json (reply_buf, status);

        reply_len = rev_strlen (reply_buf);
        reply_buf[reply_len] = '\0';

        /* return reply code to sender */
        n = libwebsocket_write (wsi,
                                (unsigned char *)reply_buf,
                                (size_t)reply_len,
                                LWS_WRITE_TEXT);

        if (n < 0) {
            pcm_rc = PCM_RC_WEBSOCK_WRITE_FAILED;
            goto exit_unlock;
        }

        if (n && (n< (int)reply_len)) {
            PCMC_LOG_WARN ("%s: partial write (actual %u sent %u)",
                           __FUNCTION__, (uint32_t)reply_len, (uint32_t)n);
        }
    }

exit_unlock:
    /* Free the stored JSON data on error or if the data has been
       completely received (and processed) */
    if ((pcm_rc || !remaining) && userdata->json_in) {
        free(userdata->json_in);
        userdata->json_in = NULL;
        userdata->json_in_len = 0;
    }

    /* get the time stamps */
    gettimeofday (&tv2, NULL);
    ts2 = pcm_util_get_current_time ();

    PCMC_LOG_INFO ("%s: json rcvd time: %lu sent time: %lu processing time: %u.%u secs",
                   __FUNCTION__, ts1, ts2,
                   (unsigned int)(tv2.tv_sec-tv1.tv_sec),
                   (unsigned int)(tv2.tv_usec-tv1.tv_usec));

    rev_mutex_unlock (&pcm_config_mutex);

    return (pcm_rc);
}

/*
 * pcm_config_process_data
 */
static int
pcm_config_process_data_cb (
                   struct libwebsocket_context        *context UNUSED_PTR,
                   struct libwebsocket                *wsi,
                   enum libwebsocket_callback_reasons  reason,
                   void                               *user,
                   void                               *in,
                   size_t                              len)
{
    pcm_rc_t pcm_rc = PCM_RC_OK;
    pcm_config_process_data_s *userdata = user;

    switch (reason) {

    case LWS_CALLBACK_ESTABLISHED:
        PCMC_LOG_DEBUG ("%s: connection established", func_name);
        userdata->json_in = NULL;
        userdata->json_in_len = 0;
        break;

    case LWS_CALLBACK_RECEIVE:
        pcm_rc = pcm_config_process_data (wsi, in, len, userdata);
        if (pcm_rc != PCM_RC_OK) {
            PCMC_LOG_ERROR ("%s: pcm_config_process_data failed (%s)",
                            func_name, pcm_rc_str (pcm_rc));
        }
        break;

    case LWS_CALLBACK_CLOSED:
        PCMC_LOG_DEBUG ("%s: connection closed", func_name);
        break;

    default:
        break;
    }

    return ((int)PCM_RC_OK);
}

/*
 * pcm_config_http_cb
 */
static int
pcm_config_http_cb (
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
    {"http-only", pcm_config_http_cb, 0, 0, NULL, 0},
    {"collector-bridge", pcm_config_process_data_cb, sizeof(pcm_config_process_data_s), 0, NULL, 0},
    {NULL, NULL, 0, 0, NULL, 0}
};

/*
 * pcm_config_thread_main
 */
void *
pcm_config_thread_main (void *arg UNUSED_PTR)
{
    struct libwebsocket_context      *context, *context2;
    const char                       *iface = NULL;
    char                             *ssl_ws = NULL;
    struct lws_context_creation_info  info, info2;
    unsigned int                      opts = 0;
    int                               use_ssl = 0;
    int                               debug_level = 6;

    memset(&info, 0, sizeof (info));

    /* assign the values to info */
    info.port = PCM_CONFIG_LISTNER_PORT;
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
    } // NOTE: Igor: Currently ignored: always use SSL.

    info.ssl_cert_filepath = NULL;
    info.ssl_private_key_filepath = NULL;


    memcpy(&info2, &info, sizeof(info));
    info2.ssl_cert_filepath = PCM_CONFIG_LWS_SSL_CERT;
    info2.ssl_private_key_filepath = PCM_CONFIG_LWS_SSL_KEY;
    info2.port = PCM_CONFIG_LISTNER_PORT_SSL;

    /* redirect logs to syslog, check /var/log */
    lws_set_log_level (debug_level, lwsl_emit_syslog);

    /* create libwebsocket context for this server */
    context = libwebsocket_create_context (&info);
    context2 = libwebsocket_create_context (&info2);


    if (context == NULL) {
        PCMC_LOG_ERROR ("%s: libwebsocket init (#1) failed", func_name);
    }
    if (context2 == NULL) {
        PCMC_LOG_ERROR ("%s: libwebsocket init (#2) failed", func_name);
    }

#ifdef DEBUG_COL_BRIDGE
    PCMC_LOG_DEBUG ("%s: starting config listner...", func_name);
#endif
    if (context2 == NULL) {
        while (true) {
            libwebsocket_service (context, PCM_SOCK_WAIT_TIME);
        }
    } else
    while (true) {
        libwebsocket_service (context, 0);
        libwebsocket_service (context2, 0);
    }

    libwebsocket_context_destroy (context);
    if (context2 != NULL)
        libwebsocket_context_destroy (context2);

    return (arg);
}
