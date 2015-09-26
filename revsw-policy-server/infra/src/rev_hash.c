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

/* public includes */
#include <rev_hash.h>
#include <rev_utils.h>
#include <rev_log.h>
#include <rev_rc.h>

/* defines */

/* globals */

/* function definitions */

/*
 * rev_hash_data_size
 */
#ifdef FIND_EXACT_NOT_TESTED
static uint32_t
rev_hash_data_size (void)
{
    return (sizeof (rev_hash_set_t));
}
#endif /* FIND_EXACT_NOT_TESTED */

/*
 * rev_hash_set_create
 */
static rev_rc_t
rev_hash_set_create (rev_data_param_t *rdp,
                     rev_data_set_t   *rds)
{
    rev_hash_set_t    *rhs = (rev_hash_set_t *)&rds[1];
    rev_hash_bucket_t *rhb;
    uint32_t           i;

    if (rdp->hash.rdp_num_buckets == 0) {
        return (REV_RC_HASH_INVALID_BKT_SIZE);
    }

    rhb = rev_malloc (sizeof (rev_hash_bucket_t) * rdp->hash.rdp_num_buckets);
    if (rhb == NULL) {
        return (REV_RC_MEMORY_ALLOC_FAILED);
    }

    for  (i =0; i < rdp->hash.rdp_num_buckets; i++) {
        revcq_init (&rhb[i].rhb_cq_head);
        rhb[i].rhb_num_ent = 0;
    }

    rhs->rhs_num_buckets = rdp->hash.rdp_num_buckets;
    rhs->rhs_bucket = rhb;
    rhs->rhs_hash_func = rdp->hash.rdp_hash_func;

    return (REV_RC_OK);
}

/*
 * rev_hash_set_delete
 */
static void
rev_hash_set_delete (rev_data_set_t *rds)
{
    rev_hash_set_t    *rhs = (rev_hash_set_t *)&rds[1];

    rev_free (rhs->rhs_bucket);
}

/*
 * rev_hash_insert
 */
static rev_rc_t
rev_hash_insert (rev_data_set_t    *rds,
                 void              *ud,
                 rev_hash_handle_t *rhh)
{
    rev_hash_set_t    *rhs = (rev_hash_set_t *)&rds[1];
    rev_hash_ent_t    *ent;
    uint32_t           bucket_num;
    uint32_t           key;

    ent = rev_malloc (sizeof (rev_hash_ent_t));
    if (ent == NULL) {
        return (REV_RC_MEMORY_ALLOC_FAILED);
    }

    revcq_init_ent (ent, rhe_cq);

    if (rhs->rhs_hash_func) {
        key = rhs->rhs_hash_func (ud);
    } else {
        key = *(uint32_t*)((char*)ud + rds->rds_key_offset);
    }

    bucket_num = key % rhs->rhs_num_buckets;

    revcq_insert_tail (&rhs->rhs_bucket[bucket_num].rhb_cq_head,
                       ent,
                       rhe_cq);

    rhs->rhs_bucket[bucket_num].rhb_num_ent++;

    ent->rhe_ud = ud;

    if (rhh != NULL) {
        *rhh = (rev_hash_handle_t)ent;
    }

    return (REV_RC_OK);
}

/*
 * rev_hash_delete
 */
static rev_rc_t
rev_hash_delete (rev_data_set_t    *rds,
                 rev_hash_handle_t  rhh)
{
    rev_hash_set_t *rhs = (rev_hash_set_t *)&rds[1];
    uint32_t        bucket_num;
    rev_hash_ent_t *ent = (rev_hash_ent_t *)rhh;
    uint32_t        key;

    if (rhs->rhs_hash_func) {
        key = rhs->rhs_hash_func (ent->rhe_ud);
    } else {
        key = *(uint32_t*)((char*)ent->rhe_ud + rds->rds_key_offset);
    }

    bucket_num = key % rhs->rhs_num_buckets;

    rhs->rhs_bucket[bucket_num].rhb_num_ent--;

    revcq_remove (ent, rhe_cq);

    rev_free (ent);

    return (REV_RC_OK);
}

/*
 * rev_hash_find_exact
 */
static void *
rev_hash_find_exact (rev_data_set_t *rds,
                     const void     *ud)
{
    rev_hash_set_t    *rhs = (rev_hash_set_t*)&rds[1];
    rev_hash_ent_cq_t *ent_cq;
    rev_hash_bucket_t *bucket;
    rev_hash_ent_t    *ent;
    void              *udp;
    uint32_t           key;
    uint32_t           bucket_num;
    uint32_t           tmp_key;

    if (rhs->rhs_hash_func) {
        key = rhs->rhs_hash_func (ud);
    } else {
        key = *(uint32_t*)((char*)ud + rds->rds_key_offset);
    }

    bucket_num = key % rhs->rhs_num_buckets;

    bucket = &rhs->rhs_bucket[bucket_num];

    if (revcq_is_empty (&bucket->rhb_cq_head)) {
        return (NULL);
    }

    revcq_foreach (ent_cq, &bucket->rhb_cq_head) {

        ent = revcq_ent (ent_cq, rev_hash_ent_t, rhe_cq);

        udp = ent->rhe_ud;

        if (rhs->rhs_hash_func) {
            tmp_key = rhs->rhs_hash_func (udp);
        } else {
            tmp_key = *(uint32_t*)((char*)udp + rds->rds_key_offset);
        }

        if (key == tmp_key) {
            return (udp);
        }
    }

    return NULL;
}

/*
 * rev_hash_find_exact_by_key
 */
#ifdef FIND_EXACT_NOT_TESTED
static void *
rev_hash_find_exact_by_key (rev_data_set_t *rds,
                            const void     *lkpk)
{
    rev_hash_set_t    *rhs = (rev_hash_set_t*)&rds[1];
    rev_hash_ent_cq_t *ent_cq;
    rev_hash_bucket_t *bucket;
    rev_hash_ent_t    *ent;
    void              *udp;
    uint32_t           key;
    uint32_t           bucket_num;
    uint32_t           tmp_key;

    key = *(uint32_t *)lkpk;

    bucket_num = key % rhs->rhs_num_buckets;

    bucket = &rhs->rhs_bucket[bucket_num];

    if (revcq_is_empty (&bucket->rhb_cq_head)) {
        return (NULL);
    }

    revcq_foreach (ent_cq, &bucket->rhb_cq_head) {

        ent = revcq_ent (ent_cq, rev_hash_ent_t, rhe_cq);

        udp = ent->rhe_ud;

        if (rhs->rhs_hash_func) {
            tmp_key = rhs->rhs_hash_func (udp);
        } else {
            tmp_key = *(uint32_t*)((char*)udp + rds->rds_key_offset);
        }

        if (key == tmp_key) {
            return (udp);
        }
    }

    return (NULL);
}
#endif /* FIND_EXACT_NOT_TESTED */

rev_data_funcs_t rev_hash_funcs = {
    NULL,
    rev_hash_set_create,
    rev_hash_set_delete,
    rev_hash_insert,
    rev_hash_delete,
    rev_hash_find_exact,
    NULL,
#ifdef FIND_EXACT_NOT_TESTED
    rev_hash_find_exact_by_key,
#endif
};

