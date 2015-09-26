#ifndef REV_HASH_H
#define REV_HASH_H

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
#include <rev_defs.h>
#include <rev_data.h>
#include <rev_cq.h>
#include <rev_rc.h>

/* typedefs */
revcq(rev_hash_ent_cq) rev_hash_ent_cq_t;

/* structure definitions */
typedef struct rev_hash_ent_s {
    rev_hash_ent_cq_t  rhe_cq;
    void              *rhe_ud;

} rev_hash_ent_t;

typedef struct rev_hash_bucket_s {
    rev_hash_ent_cq_t rhb_cq_head;
    uint32_t          rhb_num_ent;

} rev_hash_bucket_t;

typedef struct rev_hash_set_s {
    uint32_t            rhs_num_buckets;
    rev_hash_bucket_t  *rhs_bucket;
    uint32_t          (*rhs_hash_func)(const void*);

} rev_hash_set_t;

/* externs */
extern rev_data_funcs_t rev_hash_funcs;

/* function prototypes */

#endif /* REV_HASH_H */

