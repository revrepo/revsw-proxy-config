#!/usr/bin/awk -f

{sub(/^[ \t]+/,"");idx=0}
/ \{/{ctx++;idx=1}
/^{/{ctx++;idx=1}
/\}$/{ctx--;}
{id="";for(i=idx;i<ctx;i++)id=sprintf("%s%s", id, "\t");printf "%s%s\n", id, $0}
