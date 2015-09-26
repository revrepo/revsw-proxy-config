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
#include <errno.h>

/* public includes */
#include <rev_defs.h>
#include <rev_utils.h>
#include <rev_thread.h>
#include <rev_log.h>
#include <rev_rc.h>

static rev_thread_entry_t rev_thread_list[REV_THREAD_COUNT_MAX];

/*
 * rev_thread_entry_put
 */
static void
rev_thread_entry_put (rev_thread_t *tid)
{
    uint32_t i;

    for (i = 0; i < REV_THREAD_COUNT_MAX; i++) {
        if (!rev_thread_list[i].rte_is_busy &&
            (rev_thread_list[i].rte_tid == *tid)) {
            /* memset to initialize array to defaults */
            rev_memset (&rev_thread_list[i],
                        0,
                        sizeof(rev_thread_entry_t));

            rev_thread_global_count--;
        }
    }

    return;
}

/*
 * rev_thread_entry_get
 */
static rev_thread_entry_t *
rev_thread_entry_get (void)
{
    uint32_t i;

    for (i = 0; i < REV_THREAD_COUNT_MAX; i++) {
        if (!rev_thread_list[i].rte_is_busy) {
            /* memset to initialize array to defaults */
            rev_memset (&rev_thread_list[i],
                        0,
                        sizeof(rev_thread_entry_t));

            rev_thread_list[i].rte_is_busy = true;
            rev_thread_list[i].rte_tnum = i+1;

            rev_thread_global_count++;

            return (&rev_thread_list[i]);
        }
    }

    return (NULL);
}

/*
 * rev_thread_exit
 */
void
rev_thread_exit (rev_thread_t *tid)
{
    (void) rev_thread_entry_put (tid);
    (void) pthread_exit (NULL);
}

/*
 * rev_thread_create
 */
int
rev_thread_create (rev_thread_t              *tid,
                   const rev_thread_attr_t   *attr,
                   void                    *(*func)(void*),
                   void                      *arg,
                   const char                *name)
{
    rev_thread_entry_t *e;
    rev_thread_attr_t   a;
    size_t              stack_size = REV_THREAD_DEFAULT_STACK_SIZE;
    int                 rc;

    e = rev_thread_entry_get ();
    if (e == NULL) {
        REV_LOG_INFO ("%s: %s (active threads: %u)",
                      func_name, strerror (EAGAIN),
                      rev_thread_global_count);
        return (EAGAIN);
    }

    rc = pthread_attr_init (&a);
    if (rc != 0) {
        REV_LOG_ERROR ("%s: %s (rc %d)", func_name,
                       "pthread_attr_init() failed", rc);
    }

    rc = pthread_attr_setstacksize (&a, stack_size);
    if (rc != 0) {
        REV_LOG_ERROR ("%s: %s (rc %d)", func_name,
                       "pthread_attr_setstacksize() failed", rc);
    }

    if (name) {
        rev_strncpy (e->rte_name, name, sizeof(name));
    } else {
        e->rte_name[0] = '\0';
    }

    if (attr) {
        /* copy user attributes to thread attributes
           before passing "a" to pthread_create()  */
    }

    e->rte_func = func;
    e->rte_arg = arg;

    rc = pthread_create (tid, &a, func, e);
    if (rc != 0) {
        REV_LOG_ERROR ("%s: tid(0x%x) (rc %d)",
                       func_name, (uint32_t)*tid, rc);
    }

#ifdef DEBUG_INFRA
    REV_LOG_DEBUG ("%s created: tid(0x%x) tnum(%d) busy(%d) rc(%d)",
                   name,
                   (uint32_t)*tid,
                   e->rte_tnum,
                   e->rte_is_busy,
                   rc);
#endif

    e->rte_tid = *tid;

    return (rc);
}

