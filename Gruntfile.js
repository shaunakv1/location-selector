module.exports = function(grunt) {
   /**
    * Load all 3rd party grunt plugins we need
    */

    // Load the plugin that provides the "uglify" task.
    // grunt.loadNpmTasks('grunt-contrib-uglify');

    //Load the plugin that provides the 'JS Combine' task
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-concat-sourcemaps');

    //Load the plugin that provides the 'JS Uglify' task
    //grunt.loadNpmTasks('grunt-contrib-uglify');

    //Load the plugin that provides the "LESS" task.
    grunt.loadNpmTasks('grunt-contrib-less');

    //Load the plugin that provides the "cssmin" task
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    //Load the plugin that provides the "watch" task.
    grunt.loadNpmTasks('grunt-contrib-watch');

    //Load the plugin that used md5 hash of files to break cache only of its needed
    //check for all options: https://github.com/hollandben/grunt-cache-bust
    grunt.loadNpmTasks('grunt-cache-bust');

    //Load the plugin that copies dist files to deploy folder
    grunt.loadNpmTasks('grunt-contrib-copy');
    
    //Load the plugin that cleans up unused files
    grunt.loadNpmTasks('grunt-contrib-clean');

    //to start a static server
    grunt.loadNpmTasks('grunt-contrib-connect'); 

    // Load the plugin that is used to compress a folder to zip
    grunt.loadNpmTasks('grunt-contrib-compress');

    /**
     * Start the actual Grunt script
     */

    var pk = require('./package.json'),
        fs = require('fs'),
        request = require("request"),
        replaceStream = require('replacestream'),
        path = require('path'),
        url = require('url'),
        urlValidator = require('valid-url'),
        dependencies = grunt.file.exists('./js/'+ pk.appName+'.json') ? require('./js/'+pk.appName+'.json') : require('./js/app-name.json');
 

     /**
     * Config Task: Usual Grunt Configuration 
     */
    grunt.registerTask('config', 'sets up all the configurations needed for tasks to run', function(){

        var gruntConf = {
            pkg: grunt.file.readJSON('package.json'),

            //Combine JavaScript files
            concat: {
                options: {
                    separator: ';\n',
                },
                dist: {
                    src: dependencies,
                    dest: 'js/<%= pkg.appName %>.js'
                },
            },

            //Compile and minify Less files
            less: {
                development: {
                    options: {
                        paths: ["css"]
                    },
                    files: {
                        "css/<%= pkg.appName %>.css": "css/less/<%= pkg.appName %>.less"
                    }
                }
            },

            //Minify compiled css
            cssmin: {
                minify: {
                    expand: true,
                    cwd: 'css/',
                    src: '<%= pkg.appName %>.css',
                    dest: 'css/',
                    ext: '.min.css'
                }
            },

            clean: {
                 artifacts: ["css/<%= pkg.appName %>.css"],
                 build: ["dist/**"]
               },

            //Copy files to dist
            copy: {
             
                // include img files within path and its sub-directories 
                img: {
                    expand: true, 
                    src: 'img/**', 
                    dest: 'dist/'
                  },
                
                css: {
                    expand: true,
                    src: ['css/*.css'],
                    filter: 'isFile',
                    dest: 'dist/'
                },
                js: {
                   expand: true,
                    src:['js/*.js'],
                    filter: 'isFile',
                    dest: 'dist/'
                },
                files: {
                    expand: true,
                    src: ['**/**.html','**/*.xml','**/*.php','data/*','!docs/*','!node_modules/**/*.*'],
                    dest: 'dist/'
                },
                fonts: {
                    expand: true,
                    src: 'fonts/**',
                    dest: 'dist/'
                }
            },

            cachebreak:{
                dev: ['index.html'],
                dist: ['./dist/index.html']
            },

            //start a static server
            connect: {
                dev: {
                  options: {
                    port: 3000,
                    base: '.',
                    open:true,
                    livereload: true
                  }
                },
                dist: {
                  options: {
                    port: 3000,
                    base: './dist',
                    open:true,
                    livereload: true
                  }
                }
            },

            watch: {
                //watch js files
                js: {
                    files: ['js/*/*.js', 'js/lib/*.js'],
                    tasks: ['config','concat',"cachebreak:dev"]
                },
                //watch dependencies
                dependencies:{
                    files: ['js/<%= pkg.appName %>.json'],
                    tasks:['config','install-dependencies','concat',"cachebreak:dev"]
                },
                //watch less files
                css: {
                    files: ['css/less/*.less'],
                    tasks: ['config','less:development', 'cssmin:minify','clean:artifacts',"cachebreak:dev"],
                },
                html: {
                    files: ['**/*.html'],
                    tasks: []
                },
                options: {
                    livereload: true,
                }
                // Livereload browser

            },//end watch task

            // will compress the entire directory that contains Gruntfile.js to zipfile and save it inside the the same dir.
            compress: {
              main: {
                options: {
                  archive: path.basename(__dirname)+'.zip',
                  pretty: true
                },
                expand: true,
                src: ['**/*','!node_modules/**/*'],
                dest: '.'
              }
            }

        };

        grunt.initConfig(gruntConf); // close grunt initconfig function
    });

    /**
     * Custom tasks: Fold this code and save yourself a headache :) 
     */
    grunt.registerMultiTask('cachebreak','Busts cache based on its MD5Hash',function(){
        grunt.config.set('cacheBust', {
                options: {
                  encoding: 'utf8',
                  algorithm: 'md5',
                  length: 16,
                  deleteOriginals: false,
                  rename:false
                },
                assets: {
                  files: [{
                    src: this.data
                  }]
                }
          });
        //grunt.registerTask('bust',['cacheBust']);
        grunt.task.run('cacheBust');
    });

    grunt.registerTask('setup','Checks that all the required configuration files are present for building this project', function (){
        
        /**
         * Checks when using this template to create new project:
         * This check crates appropriate js/app-name.json and css/less/app-name.less files if they don't exist.
         * Usually, before running Grunt, "appName" entry in packege.json should be set to projectName (one word all small). This will
         * be used to name the  js/*.json and css/less/*.less file
         */

        //warn user if using grunt without specifying the name in packege.json
        if(pk.appName === 'app-name'){
            grunt.fail.warn('You are running grunt without changing "appName" property in ' + 'packege.json'.blue + ' file. \nPlease change the property to a different name (oneword small-caps), and try running grunt again.'.yellow);
        }
        //check for dependencies json file
        grunt.log.ok('Checking if '+ (pk.appName +'.json').blue + ' exists...' + (grunt.file.exists('./js/'+ pk.appName +'.json') ? 'yes'.green : 'no'.red ));
        if(!grunt.file.exists('./js/'+ pk.appName+'.json')){
            grunt.log.subhead('\tChecking if '+ ('app-name.json').blue + ' exists...' + (grunt.file.exists('./js/app-name.json') ? 'yes'.green : 'no'.red ));    
            if(grunt.file.exists('./js/app-name.json')){
                grunt.log.writeln('\tRenaming ' + 'app-name.json'.blue + ' to ' + (pk.appName +'.json').yellow);
                fs.rename('./js/app-name.json', './js/'+pk.appName+'.json'); // rename app-name.json to name specified in packege.json
                
                grunt.log.writeln('\tDeleting ' + 'js/app-name.js'.blue);
                fs.unlink('./js/app-name.js'); // delete the compiled js file created in the example
            }
            else{
                grunt.fail.warn("Please create either 'js/app-name.json' or 'js/"+pk.appName+".json' and try running grunt again");
            }
        }
        
        //check for less declaration file
        grunt.log.ok('Checking if '+ ('css/less/'+ pk.appName +'.less').blue + ' exists...' + (grunt.file.exists('./css/less/'+ pk.appName+'.less') ? 'yes'.green : 'no'.red ));
        if(!grunt.file.exists('./css/less/'+ pk.appName+'.less')){
            grunt.log.subhead('\tChecking if '+ ('css/less/app-name.less').blue + ' exists...' + (grunt.file.exists('./css/less/app-name.less') ? 'yes'.green : 'no'.red ));    
            if(grunt.file.exists('./css/less/app-name.less')){
                grunt.log.writeln('\tRenaming ' + 'css/less/app-name.less'.blue + ' to ' + ('css/less/'+pk.appName +'.less').yellow);
                fs.rename('./css/less/app-name.less', './css/less/'+pk.appName+'.less'); // rename app-name.less to name specified in packege.json
                
                grunt.log.writeln('\tDeleting ' + 'css/app-name.min.css'.blue);
                fs.unlink('./css/app-name.min.css'); // delete the compiled js file created in the example

                grunt.log.writeln('\tInjecting CSS buid in ' + 'index.html'.blue);
            }else{
                grunt.fail.warn("Please create either 'css/less/app-name.less' or 'css/less/"+pk.appName+".less' and try running grunt again");
            }
        }


       grunt.log.ok('Injecting CSS and JavaScript buid in ' + 'index.html'.blue);
        var done = this.async();
        fs.createReadStream('index.html')
        .pipe(replaceStream('app-name.js', pk.appName+'.js', { limit: 1 } ))
        .pipe(replaceStream('app-name.min.css', pk.appName+'.min.css', { limit: 1 } ))
        .pipe(fs.createWriteStream('temp.html').on('finish',function(){ 
            fs.unlink('index.html');
            fs.rename('temp.html','index.html');
            done(); 
        }));
    });
    
    grunt.registerTask('fetch-dependencies','Checks js/app-name.json file, and if any of the entries are URLs , it fetches the JavaScript file, saves it in the js/lib directory, and changes the entry in ap-name.json file to point to location of file in lib', function(){
        var tt = this;
        var dependencyCount = 0;
        // HTTP GET Request
        dependencies.forEach(function(dependency,i){
            if(urlValidator.isWebUri(dependency)){
                var done = tt.async();
                dependencyCount += 1;
                var fileName = url.parse(dependency).pathname.split('/').pop();
                
                grunt.log.writeln("\tDownloading " + dependency.yellow + ' to > ' + ('js/lib/'+fileName).blue );
                
                request(dependency)
                   .on('complete',function(res){
                        if(res.statusCode !== 200){
                            grunt.fail.warn("Cannot download dependency", + dependency );
                            dependencyCount -= 1;
                            if(dependencyCount <= 0) done();    
                            
                        }
                    })  
                   .pipe(fs.createWriteStream('./js/lib/'+fileName).on('finish',function(){
                        //now replace the URL in the json dependency file with new local referece instead of URL 
                        dependencies[i]  = 'js/lib/'+fileName;
                        dependencyCount -= 1;
                        if(dependencyCount <= 0) done();
                   }));
            }
        });
    });
    
    grunt.registerTask('update-dependency-json','Writes back the latest dependency json to js/app-name.json file', function(){
        fs.writeFileSync('./js/'+pk.appName+'.json', JSON.stringify(dependencies, null, 4));
    });
  

    /**
     * Tasks Registrations start here. All the registerd tasks here can be run as :
     *  grunt <task-name>  or 
     *  grunt  (runs grunt default)
     */    

    //zip up this folder and save file inside the folder
    grunt.registerTask('zip',['config','compress']);

    //install dependencies
    grunt.registerTask('install-dependencies',['fetch-dependencies','update-dependency-json']);
    
    //release task
    grunt.registerTask('release',['setup','config','clean','copy',"cachebreak:dist"]);
    
    //build task  : builds entire project, including release dist
    grunt.registerTask('build', ['setup','config','install-dependencies','concat','less', 'cssmin',"cachebreak:dev",'clean:artifacts']);

    //default task : runs build and starts watching for any changes
    grunt.registerTask('default', ['build', 'watch']);

    //serve task: runs default tasks of build,then starts a local server for development, finally starts the watch tasks to enable live changes build and reload
    grunt.registerTask('serve-dev',['build', 'connect:dev' , 'watch']);

    //serve task: runs default tasks of build,then starts a local server to preview production, finally starts the watch tasks to enable live changes build and reload
    grunt.registerTask('serve-dist',['build', 'connect:dist' , 'watch']);

};