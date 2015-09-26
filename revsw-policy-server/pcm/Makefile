# root makefile to build all the sub-directories
# Author : Sidde Gowda

PCM_DIRS := config purge # add dirs here

all:
	set -e; for d in $(PCM_DIRS); do $(MAKE) -C $$d; done

ECH := @echo
CMD := @

#
# Clean all object files
#

.PHONY: clean

clean:
	$(ECH) cleanng up config directory...
	$(CMD) rm -f  config/cmn_obj/*.o
	$(CMD) rm -f  config/pcm_obj/*.o
	$(CMD) rm -rf config/cmn_obj
	$(CMD) rm -rf config/pcm_obj
	$(ECH) cleanng up purge directory...
	$(CMD) rm -f  purge/cmn_obj/*.o
	$(CMD) rm -f  purge/pcm_obj/*.o
	$(CMD) rm -rf purge/cmn_obj
	$(CMD) rm -rf purge/pcm_obj
	$(ECH) cleanng up install directory...
	$(CMD) rm -f  install/revsw-pcm-config
	$(CMD) rm -f  install/revsw-pcm-purge
	$(ECH) clean  done.
