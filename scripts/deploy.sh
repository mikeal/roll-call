#!/bin/bash

# based on:
# - https://gist.github.com/domenic/ec8b0fc8ab45f39403dd
# - http://www.steveklabnik.com/automatically_update_github_pages_with_travis_example/

set -o errexit -o nounset

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
  echo "Skipping deploy: pull request."
  exit 1
fi

if [ "$TRAVIS_BRANCH" != "master" -a "$TRAVIS_BRANCH" != "stable" ]; then
  echo "Skipping deploy: branch not master or stable."
  exit 1
fi

copy_assets () { cp -r favicon.png index.html bundle.js worker.js faq.html $1; }


mkdir ../build
mkdir ../build/staging

git fetch origin master:remotes/origin/master stable:remotes/origin/stable

git checkout -f origin/master
MASTER_REV=$(git rev-parse --short HEAD)
rm -rf node_modules package-lock.json
npm install
npm run build
copy_assets ../build/staging

git checkout -f origin/stable
STABLE_REV=$(git rev-parse --short HEAD)
rm -rf node_modules package-lock.json
npm install
npm run build
copy_assets ../build

cd ../build
echo "rollcall.audio" > CNAME

git init
git config user.name "CI"
git config user.email "ci@rollcall.audio"

git add -A .
git commit -m "Auto-build of ${MASTER_REV} (master), ${STABLE_REV} (stable)"
git push -f "https://${GH_TOKEN}@${GH_REF}" HEAD:gh-pages > /dev/null 2>&1

echo "✔ Deployed successfully."
