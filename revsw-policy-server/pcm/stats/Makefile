# Makefile to build PCM module binaries
# Author : Sidde Gowda

TOP_DIR := $(CURDIR)

PROG_PATH := ../install/
PROG_NAME := pcms

WARNINGS := -Wall -Wextra -Wshadow -Wpointer-arith -Wcast-align \
            -Wwrite-strings -Wmissing-prototypes -Wmissing-declarations \
            -Wredundant-decls -Wnested-externs -Winline -Wno-long-long \
            -Wuninitialized -Wconversion -Wno-variadic-macros \

CC := gcc -o
CC += $(CC) -O1

DEBUG = -g

CC_FLAGS := -std=c99 $(WARNINGS) $(DEBUG)

LD_FLAGS := -pthread

CMN_SRC_PATH := ../common/src
PCM_SRC_PATH := src
CMN_OBJ_PATH := cmn_obj
PCM_OBJ_PATH := pcm_obj

INC_DIRS := -I./inc \
            -I../common/inc \
            -I../../include \
            -I../../../bp_co/rev_traffic_counter/include

PCM_CC_FILES := $(wildcard $(PCM_SRC_PATH)/*.c)
CMN_CC_FILES := $(wildcard $(CMN_SRC_PATH)/*.c)

PCM_OBJ_FILES := $(patsubst $(PCM_SRC_PATH)/%.c,$(PCM_OBJ_PATH)/%.o,$(PCM_CC_FILES))
CMN_OBJ_FILES := $(patsubst $(CMN_SRC_PATH)/%.c,$(CMN_OBJ_PATH)/%.o,$(CMN_CC_FILES))

LIBS += -L$(TOP_DIR)/../../lib -lrev_infra
LIBS += -lwebsockets

CC_FLAGS += $(INC_DIRS) -DDEBUG_COL_BRIDGE

all := $(PROG_NAME)

# Order is important so, OBJ_FILES should be before LIBS

$(PROG_NAME) : $(PCM_OBJ_FILES) $(CMN_OBJ_FILES) dir
	$(CC) $(PCM_OBJ_FILES)  $(CMN_OBJ_FILES) $(CC_FLAGS) $(LD_FLAGS) $(LIBS) -o $(PROG_PATH)/$(PROG_NAME)

.PHONY: dir directories dirs

dir:
	mkdir -p $(PROG_PATH)

$(PCM_OBJ_PATH)/%.o: $(PCM_SRC_PATH)/%.c
	@mkdir -p $(PCM_OBJ_PATH)
	$(CC) $(CC_FLAGS) -c -o $@ $^

$(CMN_OBJ_PATH)/%.o: $(CMN_SRC_PATH)/%.c
	@mkdir -p $(CMN_OBJ_PATH)
	$(CC) $(CC_FLAGS) -c -o $@ $^

ECH := @echo
CMD := @

#
# Clean all object files
#
.PHONY: clean

clean:
	$(ECH) Clean complete.
