var ffmpeg = require('fluent-ffmpeg'),
	fs = require('fs'),
	child_process = require('child_process'),
	uuid = require('node-uuid'),
	formidable = require('formidable'),
	now = require("performance-now"),
	gm = require('gm'),
	util = require('util'),
	AWS = require('aws-sdk');

module.exports = function(UserVideo) {
	UserVideo.generate = function(photoName, cb) {
		var performance = {
			"name": photoName,
			"size": null,
			"upload": null,
			"resize": null,
			"looped": null,
			"render": null,
			"S3":null,
			"url":null
		};
		console.log("-------------------------------------");
		createLoopedVideo(photoName, performance, cb);
	};
	
	UserVideo.uploadAndGenerate = function(req, res, cb) {
		var performance = {
			"name": null,
			"size": null,
			"upload": null,
			"resize": null,
			"looped": null,
			"render": null,
			"S3":null,
			"url":null
		};
		var fileUploadStart = now();
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files) {
			var old_path = files.file.path,
			    file_ext = files.file.name.split('.').pop(),
			    index = old_path.lastIndexOf('/') + 1,
			    file_name = uuid.v4(),
			    new_path =  "./client/storage/kitchenImages/" +  file_name + '.' + file_ext;
			
			console.log("-------------------------------------");
			console.log(file_name + " received: " + (files.file.size/1000000) + "MB");
			performance.name = file_name;
			performance.size = (files.file.size/1000000) + "MB";
			fs.readFile(old_path, function(err, data) {
				fs.writeFile(new_path, data, function(err) {
					fs.unlink(old_path, function(err) {
				    	if (err) {
							console.log(err)
							cb(err, "On file write");
				        }
						else
						{
							var fileUploadFinish = now();
							console.log(file_name + '.' + file_ext + " upload image time:" + (fileUploadFinish-fileUploadStart).toFixed(3));
							performance.upload = (fileUploadFinish-fileUploadStart).toFixed(3);
							createLoopedVideo(file_name, performance, cb)
						}
				    });
				});
			});						            	
		});
	};

	UserVideo.remoteMethod(
		'generate', 
		{
			accepts: {arg: 'photoName', type: 'string'},
	    	returns: {arg: 'videoPath', type: 'string'}
		}
	);
	
	UserVideo.remoteMethod(
		'uploadAndGenerate', 
	    {
	          accepts: [{arg: 'req', type: 'object', 'http': {source: 'req'}},
			  {arg: 'res', type: 'object', 'http': {source: 'res'}}],
	          returns: {arg: 'msg', type: 'string'}
	        }
	    );
};

function createLoopedVideo(fileName, performance, cb)
{		
	var loopedImageName =  fileName + ".mp4";
	var resizeImageStart = now();
	gm("./client/storage/kitchenImages/" + fileName + ".jpg")
		.resize(640, 480)
		.autoOrient()
		.noProfile()
		.write('./client/generatedVideos/' + fileName + '.jpg', function (err) {
	  		if (!err)
			{
				var resizeImageEnd = now();
				console.log(fileName + " resize image time:" + (resizeImageEnd-resizeImageStart).toFixed(3));
				performance.resize = (resizeImageEnd-resizeImageStart).toFixed(3);
				var loopImageStart = now();
				ffmpeg('./client/generatedVideos/' + fileName + '.jpg').loop(15).addOptions(['-c:v libx264', '-c:a aac', '-strict experimental', '-pix_fmt yuv420p']).size('640x480').save('./client/generatedVideos/loopedVideo/' + loopedImageName).on('end', 
					function(){
						var loopImageEnd = now();
						console.log(fileName + " looped image time:" + (loopImageEnd-loopImageStart).toFixed(3));
						performance.looped = (loopImageEnd-loopImageStart).toFixed(3);
						/*fs.unlink('./client/generatedVideos/' + imageName + '.JPG', function (err) {
							if (err)
								console.log(err);
						});*/

						createUserVideo(loopedImageName, performance, cb);
				});
			}
			else
			{
				cb(null, err);
			}
	
	});
}

function createUserVideo(loopedImageName, performance, cb)
{
	var userVideoStart = now();
	var maytagAudioFile = "./client/sourceFiles/audio.aif";
	var maytagOverlayFile = "./client/sourceFiles/man.mp4";
	var xCoord = 180;
	var yCoord = 30;
	var vWidth = 270;
	var vHeight = 470;
	
	var savedImageName = loopedImageName;
	ffmpeg('./client/generatedVideos/loopedVideo/' + loopedImageName).mergeAdd(maytagAudioFile).addOption(['-vf', 'movie='+maytagOverlayFile+ ' [watermark]; [in] [watermark] overlay=shortest=1:x='+xCoord+':y='+yCoord+' [out]']).size('640x480').outputOptions('-metadata', 'title=Bring Maytag Home').save('./client/generatedVideos/' + savedImageName).on('end', 
	function(){
		var userVideoEnd = now();
		console.log(loopedImageName + " render time:" + (userVideoEnd-userVideoStart).toFixed(3)); 
		performance.render = (userVideoEnd-userVideoStart).toFixed(3);
		/*fs.unlink('./client/generatedVideos/' + loopedImageName, function (err) {
			if (err)
				console.log(err);
		});*/
		uploadFile(savedImageName, performance, cb);
	});
}

function uploadFile(savedImageName, performance, cb) {
  	var uploadStart = now();
  	var fileBuffer = fs.readFileSync('./client/generatedVideos/' + savedImageName);
  	var metaData = getContentTypeByFile('./client/generatedVideos/' + savedImageName);
  	var s3 = new AWS.S3();

  	s3.putObject({
    	ACL: 'public-read',
    	Bucket: "bmmh-testing",
    	Key: savedImageName,
    	Body: fileBuffer,
    	ContentType: metaData
  	}, function(error, response) {
		var uploadEnd = now();
		console.log(savedImageName + " upload time:" + (uploadEnd-uploadStart).toFixed(3));
		performance.S3 = (uploadEnd-uploadStart).toFixed(3);
		performance.url = 'https://s3-us-west-2.amazonaws.com/bmmh-testing/' + savedImageName;
		cb(null,performance);
  	});
}

function getContentTypeByFile(fileName) {
  var rc = 'application/octet-stream';
  var fn = fileName.toLowerCase();

  if (fn.indexOf('.html') >= 0) rc = 'text/html';
  else if (fn.indexOf('.css') >= 0) rc = 'text/css';
  else if (fn.indexOf('.json') >= 0) rc = 'application/json';
  else if (fn.indexOf('.js') >= 0) rc = 'application/x-javascript';
  else if (fn.indexOf('.png') >= 0) rc = 'image/png';
  else if (fn.indexOf('.jpg') >= 0) rc = 'image/jpg';
  else if (fn.indexOf('.mp4') >= 0) rc = 'video/mp4';

  return rc;
}
