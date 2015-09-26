/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

#ifndef PCM_STATS_H
#define PCM_STATS_H

/* public includes */
#include "pcm_inc.h"

/* defines */
#define PCM_STATS_LWS_SSL_CERT       "/opt/revsw-config/policy/websock.crt"
#define PCM_STATS_LWS_SSL_KEY        "/opt/revsw-config/policy/websock.key"
#define PCM_STATS_REQUEST_LOG_PATH   "/opt/revsw-config/policy/pcm_stats_request.json"
#define PCM_STATS_REPLY_LOG_PATH     "/opt/revsw-config/policy/pcm_stats_reply.json"

#define PCM_STATS_MODSEC_ATTACK_PATH "/var/cache/modsecurity/audit"
#define PCM_STATS_MODSEC_TEMP_PATH   "/tmp/._attack"

#define PCM_STATS_DOMAIN_NAME_LEN     256
#define PCM_STATS_JSON_BUFLEN        4096
#define PCM_STATS_LISTNER_PORT       8001

/* globals */
rev_thread_mutex_t pcm_stats_mutex;

/* enums */

/* structure definitions */

/* function prototypes */
extern void *
pcm_stats_thread_main (void *arg);

#endif /* PCM_STATS_H */

