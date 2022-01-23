echo "Cleaning..."
rm -rf bin
mkdir -p bin bin/src

echo "Assembling database..."
find . -name *.csql -exec sh -c "mkdir -p bin/{} && cpp {} | sed s/__NL/\\r\\n/g | grep -wv ^# | grep -v -e '^\s*$' > bin/{}/script.sql" \;

sqlite3 bin/prelude.sqlite < bin/src/sqlpp/install.csql/script.sql
