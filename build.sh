#!/usr/bin/env bash
set -e

shopt -s lastpipe
shopt -so pipefail

_build_dir="web-ext-artifacts"
_manifest_chrome="manifest-chrome.json"
_manifest_firefox="manifest-firefox.json"


cd src

echo '--------------------'
pwd
echo '--------------------'
ls -lah
echo '--------------------'


echo "Building: ${_manifest_chrome}"
cp -f "../${_manifest_chrome}" manifest.json
_name=$(jq '.name' < "manifest.json")
_version=$(jq '.version' < "manifest.json")
echo "${_name} - ${_version}"
zip "../${_build_dir}/chrome.zip" -r .


#echo "Building: ${_manifest_firefox}"
#cp -f "../${_manifest_firefox}" manifest.json
#_name=$(jq '.name' < "manifest.json")
#_version=$(jq '.version' < "manifest.json")
#echo "${_name} - ${_version}"
##zip "../${_build_dir}/firefox.zip" -r .
#web-ext build --overwrite-dest