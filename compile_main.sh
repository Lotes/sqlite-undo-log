echo "Cleaning..."
rm -rf bin
mkdir -p bin bin/src

echo "Assembling database..."
cpp src/main.sql | sed s/__NL/\\r\\n/g | grep -wv ^# | grep -v -e '^\s*$' > bin/src/main.sql

echo "Compiling database..."
sqlite3 bin/src/main.sqlite < bin/src/main.sql

echo "Running tests..."
