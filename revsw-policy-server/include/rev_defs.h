#ifndef REV_DEFINES_H
#define REV_DEFINES_H

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
#include <stdint.h>

#include <sys/socket.h>
#include <sys/select.h>
#include <sys/types.h>
#include <netinet/in.h>
#include <arpa/inet.h>

/* lint -e{715, 818} */

/* defines */
#define UNUSED_PTR __attribute__((unused))
#define UNUSED_VAR __attribute__((unused))

#define func_name  __FUNCTION__
#define line_num   __LINE__

#define FALSE 0
#define TRUE  1

#define false FALSE
#define true  TRUE

#define REV_DATA_SET_NAME_LEN 16
#define REV_QUEUE_NAME_LEN    16

#ifndef offsetof
#define offsetof(type, member)  ((size_t)(&((type *)0)->member))
#endif

/* structure definitions */
typedef struct rev_ip_addr_s {
    uint32_t            ver;
    union {
        struct in_addr  v4;
        struct in6_addr v6;
    } ip;

} rev_ip_addr_t;

/* typedefs */
typedef void          *rev_queue_handle_t;
typedef unsigned long  rev_hash_handle_t;

#endif /* REV_DEFINES_H */
