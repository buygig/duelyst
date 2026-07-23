import gulp from 'gulp';
import fs from 'fs';

export function consolidate(locale) {
  const all = require('require-dir')(`${__dirname}/../app/localization/locales/${locale}`);
  // exclude data from any previous index.json
  delete all.index;

  fs.writeFileSync(`${__dirname}/../app/localization/locales/${locale}/index.json`, JSON.stringify(all), 'utf8');
}

export function copy() {
  // consolidate all individual language parts into index.json
  consolidate('en');
  consolidate('zh-cn');
  return gulp.src('app/localization/locales/**/index.json')
    .pipe(gulp.dest('dist/src/resources/locales'));
}
