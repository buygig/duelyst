import gulp from 'gulp';
import notify from 'gulp-notify';
import gutil from 'gulp-util';
import gif from 'gulp-if';
import rename from 'gulp-rename';
import Sass from 'sass';
import gsass from 'gulp-sass';
import autoprefixer from 'gulp-autoprefixer';
import rework from 'gulp-rework';
import reworkUrl from 'rework-plugin-url';
import cssmin from 'gulp-minify-css';
import {
  opts, config, production, staging,
} from './shared';

const sass = gsass(Sass);
const nodeUtil = require('util');

// clean-css v3 still calls this API, which was removed in Node.js 24.
if (nodeUtil.isRegExp == null) nodeUtil.isRegExp = (value) => value instanceof RegExp;

export default function css() {
  return gulp.src('./app/ui/styles/application.scss')
    .pipe(sass({
      includePaths: ['./app/vendor', './node_modules'],
    }))
    .pipe(autoprefixer('last 1 version', '> 1%', 'ie 8', 'ie 7'))
    .pipe(rename((p) => {
      p.basename = 'duelyst';
      return p.basename;
    }))
  // This is where we replace our CSS urls with CDN urls
    .pipe(gif(
      (production || staging) && !config.get('offlineMode'),
      rework(reworkUrl((url) => {
        if (url.indexOf('resources') >= 0 && config.get('cdn') !== '') {
          // gutil.log(`${config.get('cdn')}/${url}`)
          return `${config.get('cdn')}/${url}`;
        }
        return url;
      })),
    ))
  // This is where we minify our css
    .pipe(gif(
      opts.minify,
      cssmin({ keepSpecialComments: 0, processImport: false }),
    ))
    .pipe(notify())
    .pipe(gulp.dest('dist/src'));
}
