import gulp from 'gulp';
import gutil from 'gulp-util';
import size from 'gulp-size';
import changed from 'gulp-changed';
import _ from 'underscore';
import { exec } from 'child_process';

// images
import imagemin from 'gulp-imagemin';
import pngquant from 'imagemin-pngquant';
import optipng from 'imagemin-optipng';
import mozjpeg from 'imagemin-mozjpeg';
import zopfli from 'imagemin-zopfli';
import jpegtran from 'imagemin-jpegtran';
import { development } from './shared';

const RESOURCE_PATH_FIELDS = [
  'img',
  'imgPosX',
  'imgNegX',
  'imgPosY',
  'imgNegY',
  'imgPosZ',
  'imgNegZ',
  'audio',
  'plist',
  'font',
];

export const OFFLINE_EXCLUDED_RESOURCE_DIRECTORIES = Object.freeze([
  'resources/shop',
  'resources/emotes',
  'resources/arena',
  'resources/booster_pack_opening',
  'resources/loot_crates',
  'resources/season_rewards',
]);

function normalizeResourcePath(resourcePath) {
  return resourcePath
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^app\//, '');
}

export function shouldIncludeResourcePackage(rsx) {
  return !RESOURCE_PATH_FIELDS.some((field) => {
    const resourcePath = rsx[field];
    if (typeof resourcePath !== 'string') return false;

    const normalizedPath = normalizeResourcePath(resourcePath);
    return OFFLINE_EXCLUDED_RESOURCE_DIRECTORIES.some(
      (directory) => normalizedPath === directory || normalizedPath.startsWith(`${directory}/`),
    );
  });
}

export function imageMin() {
  return gulp.src('app/original_resources/**/*.{jpg,png}')
    .pipe(changed('app/resources', { hasChanged: changed.compareSha1Digest }))
    .pipe(imagemin([mozjpeg(), zopfli()], { verbose: true }))
    .pipe(size())
    .pipe(gulp.dest('app/resources'));
}

export function imageMinLossy() {
  return gulp.src(['app/resources/**/*.{jpg,png}', '!app/resources/{maps,maps/**}'])
    .pipe(changed('app/resources', { hasChanged: changed.compareSha1Digest }))
    .pipe(imagemin([pngquant({ nofs: true })], { verbose: true }))
    .pipe(size())
    .pipe(gulp.dest('app/resources'));
}

// Copy non-cdn flagged resources over to the dist folder
// Used before packaging the desktop application
export function copy() {
  const pkgsAll = require('../app/data/packages').all;
  const pkgsFiltered = pkgsAll.filter(shouldIncludeResourcePackage);
  gutil.log(gutil.colors.magenta(`${pkgsFiltered.length} offline resources detected`));
  let paths = pkgsFiltered.reduce((paths, rsx) => {
    if (rsx.img) {
      paths.push(`app/${rsx.img}`);
    }
    if (rsx.imgPosX) { paths.push(`app/${rsx.imgPosX}`); }
    if (rsx.imgNegX) { paths.push(`app/${rsx.imgNegX}`); }
    if (rsx.imgPosY) { paths.push(`app/${rsx.imgPosY}`); }
    if (rsx.imgNegY) { paths.push(`app/${rsx.imgNegY}`); }
    if (rsx.imgPosZ) { paths.push(`app/${rsx.imgPosZ}`); }
    if (rsx.imgNegZ) { paths.push(`app/${rsx.imgNegZ}`); }
    if (rsx.audio) {
      paths.push(`app/${rsx.audio}`);
    }
    if (rsx.plist) {
      paths.push(`app/${rsx.plist}`);
    }
    if (rsx.font) {
      paths.push(`app/${rsx.font}`);
    }
    return paths;
  }, []);
  paths.push(
    'app/resources/fonts/fontawesome-webfont.eot',
    'app/resources/fonts/fontawesome-webfont.svg',
    'app/resources/fonts/fontawesome-webfont.ttf',
    'app/resources/fonts/fontawesome-webfont.woff',
  );
  paths = _.uniq(paths);
  // paths.forEach(path => gutil.log(gutil.colors.bgMagenta.white(path)))
  gutil.log(gutil.colors.magenta(`${paths.length} paths being copied for packaging`));
  return gulp.src(paths, { base: 'app' })
    .pipe(gulp.dest('dist/src'));
}

// Copy web assets (e.g. favicon.ico) into build.
export function copyWeb() {
  return gulp.src('app/resources/web/*', { base: 'app/resources/web' })
    .pipe(gulp.dest('dist/src'));
}

// Generate Packages
// https://github.com/gulpjs/gulp/blob/4.0/docs/recipes/running-shell-commands.md
// https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
export function packages(cb) {
  const pkgs = exec(`node scripts/generate_packages.js -d${development ? ' -fa' : ''}`, (err) => {
    if (err != null) {
      gutil.log(`generate_packages.js error: ${err}`);
      return cb(err);
    }
    return cb();
  });
  pkgs.stdout.pipe(process.stdout);
}
