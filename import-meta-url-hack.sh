#!/bin/bash
set -e

shopt -s globstar
sed -i 's/IMPORT_META_URL/import.meta.url/g' dist/**/*.js