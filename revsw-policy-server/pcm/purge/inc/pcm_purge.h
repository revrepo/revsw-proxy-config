/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

#ifndef PCM_PURGE_H
#define PCM_PURGE_H

/* public includes */
#include "pcm_inc.h"

/* defines */
#define PCM_PURGE_LWS_SSL_CERT    "/opt/revsw-config/pcm-config-certs/server.crt"
#define PCM_PURGE_LWS_SSL_KEY     "/opt/revsw-config/pcm-config-certs/server.key"
#define PCM_PURGE_JSON_PATH       "/opt/revsw-config/policy/ui-purge.json"
#define PCM_PURGE_REPLY_LOG_PATH  "/opt/revsw-config/log/ui-purge-reply.log"
#define PCM_PURGE_STATS_LOG_PATH  "/opt/revsw-config/log/ui-purge-stats.log"

#define PCM_PURGE_SCRIPT_NAME     "python /opt/revsw-config/bin/revsw-varnish-purge.py"

#define PCM_PURGE_LOG_SIZE        10485760 /* 10mb */

#define PCM_PURGE_DOMAIN_NAME_LEN      256
#define PCM_PURGE_JSON_BUFLEN         4096
#define PCM_PURGE_CUR_VER                1
#define PCM_PURGE_LISTNER_PORT        8002
#define PCM_PURGE_LISTNER_PORT_SSL    8003

/* globals */
rev_thread_mutex_t pcm_purge_mutex;

/* enums */

/* structure definitions */
typedef struct pcm_purge_gloabal_s {
    rev_thread_t ppg_thread_id;
    char         ppg_thread_name[REV_THREAD_NAME_LEN];

} pcm_purge_global_t;

typedef struct pcm_purge_stats_s {
    int      pps_debug;
    uint64_t pps_requests;
    uint64_t pps_replies;
    uint64_t pps_success;
    uint64_t pps_errors;

} pcm_purge_stats_t;

/* function prototypes */
extern void *
pcm_purge_thread_main (void *arg);
extern void *
pcm_purge_thread_main_essl (void *arg);

#endif /* PCM_PURGE_H */

