import gulp from 'gulp';
import gif from 'gulp-if';
import rename from 'gulp-rename';
import htmlmin from 'gulp-minify-html';
import hbs from 'gulp-hb';
import {
  opts, version, development,
} from './shared';

export default function html() {
  return gulp.src('./app/index.hbs')
    .pipe(hbs({
      data: {
        version,
        development,
        zendeskEnabled: false,
        analyticsEnabled: false,
        gaId: '',
        cdn: '',
      },
    }))
    .pipe(rename((p) => {
      p.extname = '.html';
      return p.extname;
    }))
    .pipe(gif(opts.minify, htmlmin()))
    .pipe(gulp.dest('dist/src'));
}
