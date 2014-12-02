angular.module('app', ['angularFileUpload'])

  // The example of the full functionality
  .controller('TestController',function ($scope, $fileUploader) {
    'use strict';

    // create a uploader with options
    var uploader = $scope.uploader = $fileUploader.create({
      scope: $scope,                          // to automatically update the html. Default: $rootScope
      url: '/api/UserVideos/uploadAndGenerate',
      formData: [
        { key: 'value' }
      ],
      filters: [
        function (item) {                    // first user filter
          console.info('filter1');
          return true;
        }
      ]
    });

    // ADDING FILTERS

    uploader.filters.push(function (item) { // second user filter
      console.info('filter2');
      return true;
    });

    // REGISTER HANDLERS
	var start_time = new Date().getTime();

    uploader.bind('afteraddingfile', function (event, item) {
      console.info('After adding a file', item);
    });

    uploader.bind('whenaddingfilefailed', function (event, item) {
      console.info('When adding a file failed', item);
    });

    uploader.bind('afteraddingall', function (event, items) {
      console.info('After adding all files', items);
    });

    uploader.bind('beforeupload', function (event, item) {
	  start_time = new Date().getTime();
      console.info('Before upload', item);
    });

    uploader.bind('progress', function (event, item, progress) {
      console.info('Progress: ' + progress, item);
    });

    uploader.bind('success', function (event, xhr, item, response) {
      console.info('Success', xhr, item, response);
      $scope.$broadcast('uploadCompleted', item);
    });

    uploader.bind('cancel', function (event, xhr, item) {
      console.info('Cancel', xhr, item);
    });

    uploader.bind('error', function (event, xhr, item, response) {
      console.info('Error', xhr, item, response);
    });

    uploader.bind('complete', function (event, xhr, item, response) {
	  var request_time = (new Date().getTime() - start_time)/1000;
	  console.log("Request Time: " + request_time);
	  $(".request-time").text("Request Time: " + request_time);
	  $(".name span").text(response.msg.name);
	  $(".size span").text(response.msg.size);
	  $(".upload span").text(response.msg.upload);	
	  $(".resize span").text(response.msg.resize);	
	  $(".looped span").text(response.msg.looped);	
	  $(".render span").text(response.msg.render);	
	  $(".s3 span").text(response.msg.S3);	
	  $(".url span").text(response.msg.url);
      console.info('Complete', xhr, item, response);
    });

    uploader.bind('progressall', function (event, progress) {
      console.info('Total progress: ' + progress);
    });

    uploader.bind('completeall', function (event, items) {
      console.info('Complete all', items);
    });

  }
).controller('FilesController', function ($scope, $http) {

    $scope.load = function () {
      $http.get('/api/containers/kitchenImages/files').success(function (data) {
        console.log(data);
        $scope.files = data;
      });
    };

    $scope.delete = function (index, id) {
      $http.delete('/api/containers/kitchenImages/files/' + encodeURIComponent(id)).success(function (data, status, headers) {
        $scope.files.splice(index, 1);
      });
    };

    $scope.$on('uploadCompleted', function(event) {
      console.log('uploadCompleted event received');
      $scope.load();
    });

  });
