module.exports = grunt => {
  require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    exec: {
      test: {
        cmd: 'nyc yarn test --color'
      }
    },
    spawnProcess: {
      ivectors: {
        args: ['ivectors.js', '--color']
      }
    },
    watch: {
      ivectors: {
        files: ['ivectors.js', 'app/**/*.js', 'test/**/*.js'],
        tasks: ['xo', 'exec:test', 'spawnProcess:ivectors'],
        options: {
          spawn: false
        }
      },
      noSpawn: {
        files: ['ivectors.js', 'app/**/*.js', 'test/**/*.js'],
        tasks: ['xo', 'exec:test'],
        options: {
          spawn: false
        }
      }
    },
    xo: {
      target: ['ivectors.js', 'app/**/*.js', 'test/**/*.js']
    }
  });

  grunt.registerTask('default', 'no-spawn');
  grunt.registerTask('no-spawn', ['xo', 'exec:test', 'watch:noSpawn']);
  grunt.registerTask(
    'start', ['xo', 'exec:test', 'spawnProcess:ivectors', 'watch:ivectors']);
};
