const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');


const src = {
    js: [
        './src/**/*.js',
        '!./src/**/build*.js'
    ],
    build: './build',
    base: './src/'
};

gulp.task('build', () =>
    gulp
        .src(src.js, {base: src.base})
        .pipe(changed(src.build))
        .pipe(babel({
            plugins: ['transform-es2015-modules-commonjs']
        }))
        .on('error', handleError)
        .pipe(gulp.dest(src.build))
);

gulp.task('watch', () =>
    gulp.watch(src.js, gulp.parallel('js'))
);


function handleError(err) {
    console.error(err);
    this.end();
}
