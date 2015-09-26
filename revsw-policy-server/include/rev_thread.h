#ifndef REV_THREAD_H
#define REV_THREAD_H

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
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <pthread.h>

/* public includes */

/* defines */
#define rev_thread_mutex_t   pthread_mutex_t
#define rev_thread_cond_t    pthread_cond_t
#define rev_thread_t         pthread_t
#define rev_thread_attr_t    pthread_attr_t
#define rev_cond_init(c)     pthread_cond_init(c, NULL)
#define rev_cond_wait(c, m)  pthread_cond_wait(c, m)
#define rev_cond_signal(c)   pthread_cond_signal(c)
#define rev_mutex_init(m)    pthread_mutex_init(m, NULL)
#define rev_mutex_lock(m)    pthread_mutex_lock(m)
#define rev_mutex_unlock(m)  pthread_mutex_unlock(m)
#define rev_mutex_destroy(m) pthread_mutex_destroy(m)

#define REV_THREAD_DEFAULT_STACK_SIZE (16 * 2048)

#define REV_THREAD_COUNT_MAX           16
#define REV_THREAD_NAME_LEN            32 

/* globals */
uint32_t rev_thread_global_count;

/* structure definitions */
typedef struct rev_thread_entry_s {
    rev_thread_t         rte_tid;
    void              *(*rte_func)(void*);
    void                *rte_arg;
    uint32_t             rte_is_busy;
    rev_thread_attr_t    rte_attr;
    char                 rte_name[REV_THREAD_NAME_LEN];
    uint32_t             rte_tnum;

} rev_thread_entry_t;

/* Function Prototypes */
extern void
rev_thread_exit (rev_thread_t *tid);

extern int
rev_thread_create (rev_thread_t              *tid,
                   const rev_thread_attr_t   *attr,
                   void                    *(*tfun)(void*),
                   void                      *arg,
                   const char                *tname);

#endif /* REV_THREAD_H */
