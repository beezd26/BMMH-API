var ffmpeg = require('fluent-ffmpeg'),
	fs = require('fs'),
	child_process = require('child_process'),
	uuid = require('node-uuid');
	AWS = require('aws-sdk');

module.exports = function(UserVideo) {
	UserVideo.generate = function(photoName, cb) {
		console.log("rendering file")
		var userImageFile = "./client/sourceFiles/kitchen_8.jpg";
		
		var loopedImageName = "photoName" + uuid.v4() + ".mp4";
		
		ffmpeg(userImageFile).loop(30).addInput(userImageFile).addOptions(['-c:v libx264', '-c:a aac', '-strict experimental', '-t 30', '-pix_fmt yuv420p']).save('./client/generatedVideos/' + loopedImageName).on('end', function(){console.log('Finished Looping!'); createUserVideo(loopedImageName, cb);});

		//exec('ffmpeg -loop 1 -i '+userImageFile+' -c:v libx264 -c:a aac -strict experimental -t 30 -pix_fmt yuv420p '+ loopedImageName +';',function(){
			//var newVideo = loopedImageName;
			//console.log("inside");
			//ffmpeg(newVideo).mergeAdd(maytagAudioFile).mergeAdd(newVideo).addOption(['-vf', 'movie='+maytagOverlayFile+ ' [watermark]; [in] [watermark] overlay=shortest=1:x='+xCoord+':y='+yCoord+' [out]']).outputOptions('-metadata', 'title=Bring Maytag Home').save('./public/customKitchen.mp4').on('end', function(){console.log('Finished Processing !'); var msg = uploadFile("customKitchen.mp4", "./public/customKitchen.mp4"); cb(null, 'The video info: ' + msg);});
		//});
	}

	UserVideo.remoteMethod(
		'generate', 
		{
			accepts: {arg: 'photoName', type: 'string'},
	    	returns: {arg: 'videoPath', type: 'string'}
		}
	);
};

function createUserVideo(loopedImageName, cb)
{
	var maytagAudioFile = "./client/sourceFiles/audio.aif";
	var maytagOverlayFile = "./client/sourceFiles/frankerberry_countchockula.mp4";
	var xCoord = 300;
	var yCoord = 200;
	var vWidth = 270;
	var vHeight = 470;
	
	console.log("creating user video");
	var savedImageName = uuid.v4() + ".mp4";
	ffmpeg('./client/generatedVideos/' + loopedImageName).mergeAdd(maytagAudioFile).mergeAdd('./client/generatedVideos/' + loopedImageName).addOption(['-vf', 'movie='+maytagOverlayFile+ ' [watermark]; [in] [watermark] overlay=shortest=1:x='+xCoord+':y='+yCoord+' [out]']).outputOptions('-metadata', 'title=Bring Maytag Home').save('./client/generatedVideos/' + savedImageName).on('end', function(){console.log('Finished Processing !'); uploadFile(savedImageName, cb);});
}

function uploadFile(savedImageName, cb) {
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
    console.log('uploaded file[' + './client/generatedVideos/' + savedImageName + '] to [' + savedImageName + '] as [' + metaData + ']');
    console.log(arguments);
    console.log(response);
	cb(null, 'The video url: ' + 'https://s3-us-west-2.amazonaws.com/bmmh-testing/' + savedImageName);
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
