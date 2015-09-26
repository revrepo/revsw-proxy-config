#ifndef REV_LOG_H
#define REV_LOG_H

/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

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
#define REV_LOG_DEBUG(format, args...) \
    printf("INFRA_DEBUG[%s] "format"\n", __TIME__, args);

#define REV_LOG_ERROR(format, args...) \
    fprintf(stderr, "REV_ERROR [%s] "format"\n", __TIME__, args);

#define REV_LOG_WARN(format, args...) \
    fprintf(stderr, "REV_WARN [%s] "format"\n", __TIME__, args);

#define REV_LOG_INFO(format, args...) \
    fprintf(stderr, "REV_INFO [%s] "format"\n", __TIME__, args);
/******************************************************************/
#else /* SYS_LOG */
/******************************************************************/
#define REV_LOG_DEBUG(format, args...) \
    do { \
        openlog ("infra", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_DEBUG, "DEBUG[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define REV_LOG_ERROR(format, args...) \
    do { \
        openlog ("infra", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_ERR, "ERROR[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define REV_LOG_WARN(format, args...) \
    do { \
        openlog ("infra", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_WARNING, "WARN[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)

#define REV_LOG_INFO(format, args...) \
    do { \
        openlog ("infra", LOG_PID|LOG_CONS, LOG_USER); \
        syslog (LOG_INFO, "INFO[%s]: "format, __TIME__, args); \
        closelog (); \
    } while (0)
/******************************************************************/
#endif /* SYS_LOG */
/******************************************************************/

/* function prototypes */

#endif /* REV_LOG_H */
