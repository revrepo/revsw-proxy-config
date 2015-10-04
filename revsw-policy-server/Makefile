# root makefile to build all the sub-directories
# Author : Sidde Gowda

ifeq ($(shell dpkg -l | grep libwebsockets-dev),)
$(error You must run 'apt-get install libwebsockets-dev' before compiling)
endif

SUB_DIRS := infra pcm # add dirs here

all:
	set -e; for d in $(SUB_DIRS); do $(MAKE) -C $$d; done

install:
	cp -r pcm/install/init.d /etc/
	cp pcm/install/revsw-pcm-config /opt/revsw-config/bin
	cp pcm/install/revsw-pcm-purge /opt/revsw-config/bin
	cp lib/librev_infra.so /opt/revsw-config/bin

ECH := @echo
CMD := @

#
# Clean all object files
#

.PHONY: clean

clean:
	$(ECH) cleanng up infra shared lib directory...
	$(CMD) rm -f  infra/obj/*.o
	$(CMD) rm -rf infra/obj
	$(CMD) rm -rf lib/librev_infra.so
	$(CMD) rm -rf pcm/install/rev_infra.so
	$(ECH) cleanng up config directory...
	$(CMD) rm -f  pcm/config/cmn_obj/*.o
	$(CMD) rm -f  pcm/config/pcm_obj/*.o
	$(CMD) rm -rf pcm/config/cmn_obj
	$(CMD) rm -rf pcm/config/pcm_obj
	$(ECH) cleanng up purge directory...
	$(CMD) rm -f  pcm/purge/cmn_obj/*.o
	$(CMD) rm -f  pcm/purge/pcm_obj/*.o
	$(CMD) rm -rf pcm/purge/cmn_obj
	$(CMD) rm -rf pcm/purge/pcm_obj
	$(ECH) cleanng up install directory...
	$(CMD) rm -f  pcm/install/revsw-pcm-config
	$(CMD) rm -f  pcm/install/revsw-pcm-purge
	$(ECH) clean  done.
