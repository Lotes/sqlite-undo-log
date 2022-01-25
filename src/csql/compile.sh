cpp $1 | sed s/__NL/\\r\\n/g | sed s/^#/--#/g | grep -v -e '^\s*$' > $1.sql
