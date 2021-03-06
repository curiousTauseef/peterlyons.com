#!/usr/bin/env bash

# Please Use Google Shell Style: https://google.github.io/styleguide/shell.xml

# ---- Start unofficial bash strict mode boilerplate
# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -o errexit    # always exit on error
set -o errtrace   # trap errors in functions as well
set -o pipefail   # don't ignore exit codes when piping output
set -o posix      # more strict failures in subshells
# set -x          # enable debugging

IFS="$(printf "\n\t")"
# ---- End unofficial bash strict mode boilerplate

# create a build archive of the app for deployment
# Usage: build.sh <HEAD|WORK|TAG>
#   build.sh HEAD will use the last commit on the current branch
#   build.sh WORK will use uncommited local changes
#   build.sh TAG will use the code in the given git tag"

main() {
  cd "$(dirname "$0")/.." || exit 10
  source ./bin/lib/strict-mode.sh

  local git_ref="${1-WORK}"
  local build_dir="build"
  local prefix
  prefix="peterlyons.com-${git_ref}-$(date +%Y%m%d%H%M)"

  # OSX build support. BSD tar vs GNU tar issue
  if [[ "$(uname)" == "Darwin" ]]; then
    alias tar=gtar
  fi

  echo -n "git archive…"
  mkdir -p "${build_dir}/${prefix}/node"
  if [[ "${git_ref}" == "WORK" ]]; then
    git ls-files |
      tar --files-from - --create --file - |
      tar --directory "${build_dir}/${prefix}" --extract --file -
  else
    git archive --format=tar --prefix="${prefix}/" "${git_ref}" |
      # extract that archive into a temporary build directory
      tar --directory "${build_dir}" --extract
  fi

  echo ✓
  echo -n "node…"
  local node_version
  node_version="$(cat .nvmrc)"
  local node_archive="node-v${node_version}-linux-x86.tar.gz"
  local node_url
  node_url=$(echo "https://nodejs.org/dist/v" \
    "${node_version}/node-v${node_version}-linux-x86.tar.gz" | tr -d " ")
  if [[ ! -f "${node_archive}" ]]; then
    curl --silent --fail --location --remote-name "${node_url}"
  fi
  tar --directory "${build_dir}/${prefix}/node" --strip-components=1 --extract --gzip \
    --file "${node_archive}"

  echo ✓
  echo -n "npm packages…"
  # pre-cache the local node_modules in the build dir to avoid web downloads
  tar --create --file - node_modules |
    tar --directory "${build_dir}/${prefix}" --extract --file -
  cd "${build_dir}/${prefix}" || exit 10
  echo ✓
  echo -n "nginx configs…"

  ./bin/config-json.js \
    --hostname=peterlyons.com \
    --express_port="$(config3 proPort)" \
    --www_root=/opt/peter_lyons_web_site/static |
    mustache - deploy/nginx-site.mustache >nginx-peterlyons.com
  ./bin/config-json.js \
    --hostname=peterlyons.org \
    --express_port="$(config3 persPort)" \
    --www_root=/opt/peter_lyons_web_site/static |
    mustache - deploy/nginx-site.mustache >nginx-peterlyons.org
  ./bin/config-json.js \
    --hostname=stage.peterlyons.com \
    --express_port="$(config3 proPort)" \
    --www_root=/opt/peter_lyons_web_site/static |
    mustache - deploy/nginx-site.mustache >nginx-stage.peterlyons.com
  ./bin/config-json.js \
    --hostname=stage.peterlyons.org \
    --express_port="$(config3 persPort)" \
    --www_root=/opt/peter_lyons_web_site/static |
    mustache - deploy/nginx-site.mustache >nginx-stage.peterlyons.org

  # Run OSX node and npm utilites but within the linux build dir
  npm install --silent --production --ignore-scripts
  ./bin/build-js.sh production
  npm dedupe
  npm prune --production
  # npm prune removes our symlink, add it back
  ln -nsf ../app node_modules/app

  # remove development-only files
  rm -rf doc deploy test Vagrantfile .gitignore .eslint* .gitmodules app/core/blog/unit-test-blog1
  find ./app -name \*-tap.js -delete
  cd - || exit 10
  echo ✓

  # OSX build support. Need to rebuild on a linux virtualbox
  if [[ "$(uname)" == "Darwin" ]]; then
    echo -n "vagrant rebuild…"
    cat <<EOF | vagrant ssh build
set -e
cd "/vagrant/${build_dir}/${prefix}"
PATH="\${PWD}/node/bin:\${PATH}" ./node/bin/npm rebuild --silent --parseable --update-binary &>> "/vagrant/${build_dir}/npm.log"
EOF
    echo ✓
  fi

  echo -n "archive…"
  local dist_path="${build_dir}/${prefix}.tar.gz"
  tar --directory "${build_dir}" --create --gzip --file "${dist_path}" "${prefix}"
  echo ✓

  ls -lh "${dist_path}"
  echo "To deploy to stage, run:"
  echo "  ./bin/deploy.sh ${dist_path} deploy/host-vagrant-stage.yml"
}

main "$@"
