#ifndef REV_CQ_H
#define REV_CQ_H
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

/* public includes */

/* structure defintions */

#define revcq(qname)         \
    typedef struct qname {   \
        struct qname *qnext; \
        struct qname *qprev; \
        void         *baddr; \
    }

/****************************\
 * (h) - head               *
 * (e) - element            *
 * (f) - field              *
 * (t) - type               *
 * (q) - queue              *
 ****************************/

/*
 * revcq_init()
 */
#define revcq_init(h)        \
    do {                     \
        (h)->qnext = (h);    \
        (h)->qprev = (h);    \
        (h)->baddr = NULL;   \
    } while (0)

/*
 * revcq_is_empty
 */
#define revcq_is_empty(h)    \
    ((h)->qnext == (h))

/*
 * revcq_ent
 */
#define revcq_ent(h, t, f)            \
    (t *)((char *)&((h)->qnext) -     \
          (char *)&((t *)0)->f)

/*
 * revcq_first
 */
#define revcq_first(h, t, f)          \
    (revcq_ent((h)->qnext, t, f))

/*
 * revcq_init_ent
 */
#define revcq_init_ent(e, f)          \
    do {                              \
        (e)->f.qnext = &(e)->f;       \
        (e)->f.qprev = &(e)->f;       \
        (e)->f.baddr = (void *)e;     \
    } while (0)

/*
 * revcq_insert_head
 */
#define revcq_insert_head(h, e, f)    \
    do {                              \
        (e)->f.qnext = (h)->qnext;    \
        (e)->f.qprev = (h);           \
        (h)->qnext->qprev = &(e)->f;  \
        (h)->qnext        = &(e)->f;  \
    } while (0)

/*
 * revcq_insert_tail
 */
#define revcq_insert_tail(h, e, f)    \
    do {                              \
        (e)->f.qprev = (h)->qprev;    \
        (e)->f.qnext = (h);           \
        (h)->qprev->qnext = &(e)->f;  \
        (h)->qprev        = &(e)->f;  \
    } while (0)

/*
 * revcq_next
 */
#define revcq_next(e, t, f)           \
    (revcq_ent((e)->f.qnext, t, f))

/*
 * revcq_walk
 */
#define revcq_walk(q, h)              \
    (q) = (h)->qnext;                 \
    while ((q) != (h))

/*
 * revcq_walk_body
 */
#define revcq_walk_body(q, e, t, f)   \
    (e) = revcq_ent(q, t, f);         \
    (q) = (q)->qnext;

/*
 * revcq_remove
 */
#define revcq_remove(e, f)                  \
    do {                                    \
        (e)->f.qprev->qnext = (e)->f.qnext; \
        (e)->f.qnext->qprev = (e)->f.qprev; \
        (e)->f.qnext        = &(e)->f;      \
        (e)->f.qprev        = &(e)->f;      \
    } while (0)

/*
 * revcq_foreach
 */
#define revcq_foreach(q, h)                 \
    for ((q) = ((h)->qnext);                \
         (q) != (h);                        \
         (q) = ((q)->qnext))

#endif /* REV_CQ_H */

