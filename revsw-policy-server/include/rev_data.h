#ifndef REV_DATA_H
#define REV_DATA_H

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
#include <rev_cq.h>
#include <rev_rc.h>

/* defines */

/* enums */
typedef enum rev_data_type_e {

    REV_DATA_TYPE_INVALID  = 0,
    REV_DATA_SET_TYPE_HASH = 1,
    REV_DATA_SET_TYPE_TREE = 2,

} rev_data_type_t;

/* typedefs */
revcq(rev_data_set_cq) rev_data_set_cq_t;

/* structure definitions */
typedef struct rev_data_set_s {
    char                     rds_name[REV_DATA_SET_NAME_LEN];
    rev_data_type_t          rds_type;
    rev_data_set_cq_t        rds_q;
    struct rev_data_funcs_s *rds_funcs;
    uint32_t                 rds_key_offset;
    uint32_t                 rds_key_len;
    uint32_t                 rds_num_ents;
    uint32_t                 rds_num_inserts;
    uint32_t                 rds_num_deletes;
    uint32_t                 rds_num_find_next;
    uint32_t                 rds_num_find_exact;

} rev_data_set_t;

typedef struct rev_data_global_s {
    uint32_t           rdg_set_size;
    uint32_t           rdg_num_sets;
    rev_data_set_cq_t  rdg_set_q;
    rev_thread_mutex_t rdg_set_mutex;
    uint32_t           rdg_set_create;
    uint32_t           rdg_set_delete;

} rev_data_global_t;

typedef struct rev_data_param_s {
    char               rdp_name[REV_DATA_SET_NAME_LEN];
    rev_data_type_t    rdp_type;
    uint32_t           rdp_key_offset;
    uint32_t           rdp_key_len;

    union {
        struct {
            uint32_t   rdp_num_buckets;
            uint32_t (*rdp_hash_func) (const void *);

        } hash;
    };

} rev_data_param_t;

typedef struct rev_data_funcs_s {
    uint32_t  (*rdf_set_size)          (void);

    rev_rc_t  (*rdf_set_create)        (rev_data_param_t*,
                                        rev_data_set_t*);

    void      (*rdf_set_delete)        (rev_data_set_t*);

    rev_rc_t  (*rdf_insert)            (rev_data_set_t*,
                                        void*,
                                        rev_hash_handle_t*);

    rev_rc_t  (*rdf_delete)            (rev_data_set_t*,
                                        rev_hash_handle_t);

    void     *(*rdf_find_exact)        (rev_data_set_t*,
                                        const void*); 

    void     *(*rdf_find_exact_by_key) (rev_data_set_t*,
                                        const void*);

} rev_data_funcs_t;

/* externs */
extern rev_data_global_t *rdg;

/* function prototypes */
rev_rc_t
rev_data_global_init (void);

rev_rc_t
rev_data_set_create (rev_data_param_t  *rdp,
                     rev_data_set_t   **rds);

void
rev_data_set_delete (rev_data_set_t *rds);

uint32_t
rev_data_set_size (rev_data_set_t *rds);

rev_rc_t
rev_data_insert (rev_data_set_t    *rds,
                 void              *ud,
                 rev_hash_handle_t *rhh);

rev_rc_t
rev_data_delete (rev_data_set_t    *rds,
                 rev_hash_handle_t  rhh);

void *
rev_data_find_exact (rev_data_set_t *rds,
                     const void     *ud);

void *
rev_data_find_exact_by_key (rev_data_set_t *rds,
                            const void     *key);

#endif /* REV_DATA_H */

