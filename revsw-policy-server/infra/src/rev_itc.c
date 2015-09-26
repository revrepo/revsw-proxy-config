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
#include <string.h>
#include <errno.h>
#include <pthread.h>

/* public includes */
#include <rev_defs.h>
#include <rev_itc.h>
#include <rev_cq.h>
#include <rev_cq.h>
#include <rev_log.h>
#include <rev_utils.h>

/* globals */

typedef struct rev_itc_q_s {
    rev_thread_mutex_t riq_lock;
    uint32_t           riq_count;
    rev_queue_cq_t     riq_q;

} rev_itc_q_t;

static rev_itc_q_t *itc_q;

/*
 * rev_itc_init
 */
rev_rc_t
rev_itc_init (void)
{
    rev_itc_q_t *qptr;

    if (itc_q != NULL) {
        REV_LOG_ERROR ("%s: %s [error: %s]", func_name,
                        "invalid pointer or size", strerror (EINVAL));
        return (REV_RC_INVALID_QUEUE_PARAM);
    }

    qptr = (rev_itc_q_t *)malloc (sizeof (*qptr));
    if (qptr == NULL) {
        REV_LOG_ERROR ("%s: %s [error: %s]", func_name,
                       "malloc failed", strerror (ENOMEM));
        return (REV_RC_MEMORY_ALLOC_FAILED);
    }

    rev_memset (qptr, 0, sizeof (*qptr));
    rev_mutex_init (&qptr->riq_lock);
    revcq_init (&qptr->riq_q);
    itc_q = qptr;

    return (REV_RC_OK);
}

/*
 * rev_itc_recv
 */
void *
rev_itc_recv (rev_queue_handle_t qh)
{
    rev_queue_t   *rq = (rev_queue_t *)qh;
    rev_queue_e_t *eq;

    rev_mutex_lock (&rq->rq_lock);
    while (revcq_is_empty (&rq->rq_eq)) {
        /* queue is empty wait for producer to write */
        rev_cond_wait (&rq->rq_wait, &rq->rq_lock);
        continue;
    }

    rev_mutex_unlock (&rq->rq_lock);

    rev_mutex_lock (&itc_q->riq_lock);

    eq = revcq_first (&rq->rq_eq, rev_queue_e_t, rqe_q);

    revcq_remove (eq, rqe_q);

    rq->rq_depth--;

    rq->rq_reads++;

    rev_mutex_unlock (&itc_q->riq_lock);

    return (&eq->rqe_data[0]);
}

/*
 * rev_itc_send
 */
void
rev_itc_send (rev_queue_handle_t  qh,
              void               *qd)
{
    rev_queue_t   *rq = (rev_queue_t *)qh;
    rev_queue_e_t *eq;

    eq = (rev_queue_e_t *)((char *)qd - sizeof (rev_queue_e_t));

    rev_mutex_lock (&itc_q->riq_lock);

    rq->rq_depth++;

    revcq_insert_tail (&rq->rq_eq, eq, rqe_q);

    rq->rq_writes++;

    rev_cond_signal (&rq->rq_wait);

    rev_mutex_unlock (&itc_q->riq_lock);

    return;
}

/*
 * rev_itc_queue_create
 */
rev_rc_t
rev_itc_queue_create (char               *qn,
                      rev_queue_handle_t *qh)
{
    rev_queue_t *rq;

    rq = (rev_queue_t *)malloc (sizeof (*rq));
    if (rq == NULL) {
        REV_LOG_ERROR ("%s: %s [error: %s]", func_name,
                       "malloc failed", strerror (ENOMEM));
        return (REV_RC_MEMORY_ALLOC_FAILED);
    }

    rev_memset (rq, 0, sizeof (*rq));

    revcq_init_ent (rq, rq_q);

    rev_mutex_init (&rq->rq_lock);

    rev_cond_init (&rq->rq_wait);

    rev_strncpy (rq->rq_name, qn, sizeof (rq->rq_name));

    revcq_init (&rq->rq_eq);

    rev_mutex_lock (&itc_q->riq_lock);

    revcq_insert_tail (&itc_q->riq_q, rq, rq_q);

    itc_q->riq_count++;

    rev_mutex_unlock (&itc_q->riq_lock);

    *qh = (void *)rq;

    return (REV_RC_OK);
}

/*
 * rev_itc_queue_delete
 */
rev_rc_t
rev_itc_queue_delete (rev_queue_handle_t qh)
{
    rev_queue_t *rq = (rev_queue_t *)qh;

    rev_mutex_lock (&itc_q->riq_lock);

    if (rq->rq_depth != 0) {
        rev_mutex_unlock (&itc_q->riq_lock);
        return (REV_RC_ITC_QUEUE_NOT_EMPTY);
    }

    revcq_remove (rq, rq_q);

    rev_mutex_destroy (&rq->rq_lock);

    itc_q->riq_count--;

    rev_free (rq);

    rev_mutex_unlock (&itc_q->riq_lock);

    return (REV_RC_OK);
}

/*
 * rev_itc_queue_depth
 */
uint32_t
rev_itc_queue_depth (rev_queue_handle_t qh)
{
    return(((rev_queue_t *)qh)->rq_depth);
}

/*
 * rev_itc_buf_alloc
 */
void *
rev_itc_alloc (rev_queue_handle_t qh UNUSED_VAR,
               size_t             s)
{
    /* this needed if we maintain queue elements
       and need to check here -Sidde
    rev_queue_t   *q = (rev_queue_t *)qh;
    */
    rev_queue_e_t *qe;

    rev_mutex_lock (&itc_q->riq_lock);

    qe = (rev_queue_e_t *)malloc (s + sizeof (rev_queue_e_t));
    if (qe == NULL) {
        rev_mutex_unlock (&itc_q->riq_lock);
        return (NULL);
    }

    revcq_init_ent (qe, rqe_q);

    rev_mutex_unlock (&itc_q->riq_lock);

    return (&qe->rqe_data[0]);
}

