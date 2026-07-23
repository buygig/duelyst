// Fix for EMFILE issues on Windows, Linux, and macOS.
import 'coffeescript/register';
import 'app-module-path/register';

import gulp from 'gulp';
import gutil from 'gulp-util';
import bundle from './gulp/bundler';
import css from './gulp/css';
import html from './gulp/html';
import vendor from './gulp/vendor';
import * as clean from './gulp/clean';
import * as rsx from './gulp/rsx';
import * as localization from './gulp/localization';
import {
  opts, env, version,
} from './gulp/shared';

const fs = require('fs');
const gracefulFs = require('graceful-fs');

gracefulFs.gracefulify(fs);

gutil.log(`${gutil.colors.red(`GULP :: env: ${env} :: version: ${version}`)}`);
gutil.log(`${gutil.colors.yellow(`GULP :: minification = ${opts.minify}`)}`);

gulp.task('clean:all', clean.all);
gulp.task('clean:app', clean.app);
gulp.task('clean:web', clean.web);
gulp.task('clean:locales', clean.locales);
gulp.task('css', css);
gulp.task('html', html);
gulp.task('js', bundle);
gulp.task('vendor', vendor);
gulp.task('rsx:imagemin', rsx.imageMin);
gulp.task('rsx:imagemin:lossy', rsx.imageMinLossy);
gulp.task('rsx:copy', rsx.copy);
gulp.task('rsx:copy:web', rsx.copyWeb);
gulp.task('rsx:packages', rsx.packages);
gulp.task('rsx', gulp.series(rsx.packages, rsx.copy));
gulp.task('localization:copy', localization.copy);

gulp.task('source', gulp.series(
  gulp.parallel('vendor', 'css', 'html'),
  'localization:copy',
  'rsx:packages',
  'js',
));

gulp.task('build', gulp.series(
  'clean:all',
  'source',
  'rsx:copy',
  'rsx:copy:web',
));

gulp.task('build:app', gulp.series(
  'clean:app',
  'js',
));

gulp.task('build:web', gulp.series(
  'clean:web',
  'clean:locales',
  'html',
  'css',
  'vendor',
  'localization:copy',
));

gulp.task('default', gulp.series('build'));
