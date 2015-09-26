#ifndef REV_ITC_H
#define REV_ITC_H

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
#include <stdlib.h>
#include <string.h>

/* public includes */
#include <rev_thread.h>
#include <rev_defs.h>
#include <rev_itc.h>
#include <rev_cq.h>
#include <rev_log.h>
#include <rev_rc.h>

/* defines */

/* typedefs */
revcq(rev_queue_e_cq) rev_queue_e_cq_t;

/* structure definitions */
typedef struct rev_queue_e_s {
    rev_queue_e_cq_t rqe_q;
    char             rqe_data[0];

} rev_queue_e_t;

revcq(rev_queue_cq) rev_queue_cq_t;

typedef struct rev_queue_s {
    char               rq_name[REV_QUEUE_NAME_LEN];
    rev_thread_mutex_t rq_lock;
    rev_thread_cond_t  rq_wait;
    rev_queue_cq_t     rq_q;
    rev_queue_e_cq_t   rq_eq;
    uint32_t           rq_depth;
    uint32_t           rq_writes;
    uint32_t           rq_reads;

} rev_queue_t;

/* function prototypes */
rev_rc_t
rev_itc_init (void);

void *
rev_itc_recv (rev_queue_handle_t qh);

void
rev_itc_send (rev_queue_handle_t  qh,
              void               *qd);

rev_rc_t
rev_itc_queue_create (char               *qn,
                      rev_queue_handle_t *qh);

rev_rc_t
rev_itc_queue_delete (rev_queue_handle_t qh);

uint32_t
rev_itc_queue_depth (rev_queue_handle_t qh);

void *
rev_itc_alloc (rev_queue_handle_t qh,
               size_t             s);

#endif /* REV_ITC_H */

