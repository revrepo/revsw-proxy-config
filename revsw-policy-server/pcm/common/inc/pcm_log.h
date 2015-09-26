/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

#ifndef PCM_LOG_H
#define PCM_LOG_H

/* system includes */
#include <stdio.h>
#include <unistd.h>
#include <syslog.h>
#include <stdlib.h>
#include <string.h>

/* public includes */

/******************************************************************/
#ifdef FILE_LOG /* old style logging */
/******************************************************************/
#define PCM_LOG_DEBUG(format, args...) \
    fprintf(stderr, "PCM_DEBUG [%s] "format"\n", __TIME__, args);

#define PCM_LOG_ERROR(format, args...) \
    fprintf(stderr, "PCM_ERROR [%s] "format"\n", __TIME__, args);

#define PCM_LOG_WARN(format, args...) \
    fprintf(stderr, "PCM_WARN [%s] "format"\n", __TIME__, args);

#define PCM_LOG_INFO(format, args...) \
    fprintf(stderr, "PCM_INFO [%s] "format"\n", __TIME__, args);
/******************************************************************/
#else /* SYS_LOG */
/******************************************************************/
//PCM LOGS
#define PCMG_LOG_DEBUG(format, args...) \
    do { \
        openlog ("revsw-pcm-general", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_DEBUG, "DEBUG[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMG_LOG_ERROR(format, args...) \
    do { \
        openlog ("revsw-pcm-general", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_ERR, "ERROR[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMG_LOG_WARN(format, args...) \
    do { \
        openlog ("revsw-pcm-general", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_WARNING, "WARN[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMG_LOG_INFO(format, args...) \
    do { \
        openlog ("revsw-pcm-general", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_INFO, "INFO[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

//PCMC LOGS
#define PCMC_LOG_DEBUG(format, args...) \
    do { \
        openlog ("revsw-pcm-config", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_DEBUG, "DEBUG[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMC_LOG_ERROR(format, args...) \
    do { \
        openlog ("revsw-pcm-config", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_ERR, "ERROR[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMC_LOG_WARN(format, args...) \
    do { \
        openlog ("revsw-pcm-config", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_WARNING, "WARN[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMC_LOG_INFO(format, args...) \
    do { \
        openlog ("revsw-pcm-config", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_INFO, "INFO[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

//PCMS LOGS
#define PCMS_LOG_DEBUG(format, args...) \
    do { \
        openlog ("revsw-pcm-stats", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_DEBUG, "DEBUG[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMS_LOG_ERROR(format, args...) \
    do { \
        openlog ("revsw-pcm-stats", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_ERR, "ERROR[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMS_LOG_WARN(format, args...) \
    do { \
        openlog ("revsw-pcm-stats", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_WARNING, "WARN[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMS_LOG_INFO(format, args...) \
    do { \
        openlog ("revsw-pcm-stats", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_INFO, "INFO[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

//PCMP LOGS
#define PCMP_LOG_DEBUG(format, args...) \
    do { \
        openlog ("revsw-pcm-purge", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_DEBUG, "DEBUG[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMP_LOG_ERROR(format, args...) \
    do { \
        openlog ("revsw-pcm-purge", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_ERR, "ERROR[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMP_LOG_WARN(format, args...) \
    do { \
        openlog ("revsw-pcm-purge", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_WARNING, "WARN[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define PCMP_LOG_INFO(format, args...) \
    do { \
        openlog ("revsw-pcm-purge", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_INFO, "INFO[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)
/******************************************************************/
#endif /* SYS_LOG */
/******************************************************************/
#endif /* PCM_LOG_H */
