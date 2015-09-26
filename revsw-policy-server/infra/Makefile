# Makefile to build infrastructure shared libraries
# Author: Sidde Gowda

LIB_PATH := ../lib/
LIB_NAME := librev_infra.so

WARNINGS := -Wall -Wextra -Wshadow -Wpointer-arith -Wcast-align \
            -Wwrite-strings -Wmissing-prototypes -Wmissing-declarations \
            -Wredundant-decls -Wnested-externs -Winline -Wno-long-long \
            -Wuninitialized -Wconversion

CC := gcc -o
CC += $(CC) -O1

DEBUG = -g

CC_FLAGS := -fPIC -g -Wall

LD_FLAGS := -shared

SRC_PATH := src
OBJ_PATH := obj
INC_DIRS := -I../include

CC_FILES := $(wildcard $(SRC_PATH)/*.c)
OBJ_FILES:= $(patsubst $(SRC_PATH)/%.c,$(OBJ_PATH)/%.o,$(CC_FILES))

LIBS +=

CC_FLAGS += $(INC_DIRS)

all := $(LIB_NAME)

$(LIB_NAME) : $(OBJ_FILES) dir
	$(CC) $(CC_FLAGS) $(LD_FLAGS) $(LIBS) -o $(LIB_PATH)/$(LIB_NAME) $(OBJ_FILES) -lrt

.PHONY: dir directories dirs

dir:
	mkdir -p $(LIB_PATH)

$(OBJ_PATH)/%.o: $(SRC_PATH)/%.c
	@mkdir -p $(OBJ_PATH)
	$(CC) $(CC_FLAGS) -c -o $@ $^

ECH := @echo
CMD := @

#
# Clean all object files
#
.PHONY: clean

clean:
	$(ECH) Deleted object files $(OBJ_FILES)
	$(CMD) rm -f  $(OBJ_FILES)
	$(ECH) Deleted shared library file $(LIB_NAME)
	$(CMD) rm -f  $(LIB_PATH)/$(LIB_NAME)
	$(CMD) rm -rf $(LIB_PATH)
	$(CMD) rm -rf $(OBJ_PATH)
	$(ECH) Clean complete.
