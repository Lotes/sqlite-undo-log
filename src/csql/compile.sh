cpp $1 | sed s/__NL/\\r\\n/g | sed '/^#/d' | grep -v -e '^\s*$'
