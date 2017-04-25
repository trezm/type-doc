const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const clean = plugins.clean;
const sequence = require('run-sequence');
const exec = require('child_process').exec;

gulp.task('build:dev', () => {
  return gulp.src('src/**/*.js')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel({
      presets: ['es2015'],
      sourceMaps: 'both'
    }))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task('build:dev:definitions', ['build:dev'], (done) => {
  exec('./bin/importLibs.js', (err, stdout, stderr) => {
    done(err);
  });
});

gulp.task('build:prod:definitions', ['build:prod'], (done) => {
  exec('./bin/importLibs.js', (err, stdout, stderr) => {
    done(err);
  });
});

gulp.task('build:prod', ['clean:source'], () => {
  return gulp.src('src/**/*.js')
    .pipe(plugins.babel({
      presets: ['es2015'],
      sourceMaps: false
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('test', ['build:dev', 'build:dev:definitions'], () => {
  return gulp.src(['dist/**/*.spec.js', 'dist/integrationTests/**/*.js'], {
      read: false
    })
    .pipe(plugins.plumber())
    .pipe(plugins.env.set({
      NODE_ENV: 'test'
    }))
    .pipe(plugins.mocha({
      timeout: 10000,
      profile: true
    }))
    .once('end', () => {
      process.exit();
    });
});

gulp.task('clean:source', () => {
  return gulp.src('dist', { read: false }).pipe(clean());
});

/**
 * DOCS
 *
 * - Clean existing docs/dist folder to get most recent type checker
 * - Rebuild the existing dist folder
 * - Copy over the rebuilt dist folder
 */
gulp.task('clean:docs', () => {
  return gulp.src('docs/dist', { read: false }).pipe(clean());
});

gulp.task('copy:dist2docs', () => {
  return gulp.src(['dist/**/*']).pipe(gulp.dest('docs/dist'));
});

gulp.task('docs', () => {
  sequence(
    'default',
    'clean:docs',
    'copy:dist2docs'
  );
});

gulp.task('default', ['build:dev']);
gulp.task('release', ['build:prod', 'build:prod:definitions']);
