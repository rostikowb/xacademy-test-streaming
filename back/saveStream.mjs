import {PassThrough} from "stream";
import fs from "fs";
import {path as ffmpegPath} from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import {StreamInput} from "fluent-ffmpeg-multistream";
import wrtc from "wrtc";

const {RTCAudioSink, RTCVideoSink} = wrtc.nonstandard;
ffmpeg.setFfmpegPath(ffmpegPath);

const VIDEO_OUTPUT_SIZE = '720x?'
// const VIDEO_OUTPUT_SIZE = '320x240'
// const VIDEO_OUTPUT_SIZE = '720x720'
const VIDEO_OUTPUT_PATH = './video/'
const VIDEO_OUTPUT_FILE = './video/recording.mp4'

let UID = 0;


export default function beforeOffer(mediaStream, id) {
  const allTracks = mediaStream.getTracks()
  let audioTrack, videoTrack;

  if (!allTracks) return;

  allTracks.forEach(track=> track.kind === 'video' ? videoTrack = track : audioTrack = track)

  const audioSink = new RTCAudioSink(audioTrack);
  const videoSink = new RTCVideoSink(videoTrack);

  const streams = [];

  try {
    fs.mkdir(`./video/${id}/`)
  }catch (e) {

  }


  console.log('start record');
  videoSink.addEventListener('frame', ({frame: {width, height, data}}) => {
    // console.log('width', width);
    const size = width + 'x' + height;
    if (!streams[0] || (streams[0] && streams[0].size !== size)) {
    // if (!streams[0]) {
      UID++;

      const stream = {
        recordPath: `./video/${id}/recording-${size}-${UID}.mp4`,
        size,
        video: new PassThrough(),
        audio: new PassThrough()
      };

      const onAudioData = ({ samples: { buffer } }) => {
        if (!stream.end) {
          stream.audio.push(Buffer.from(buffer));
        }
      };

      audioSink.addEventListener('data', onAudioData);

      stream.audio.on('end', () => {
        audioSink.removeEventListener('data', onAudioData);
      });

      streams.forEach(item=>{
        if (item !== stream && !item.end) {
          item.end = true;
          if (item.audio) {
            item.audio.end();
          }
          item.video.end();
        }
      })
  
      stream.proc = ffmpeg()
        .addInput((new StreamInput(stream.video)).url)
        .addInputOptions([
          '-f', 'rawvideo',
          '-pix_fmt', 'yuv420p',
          '-s', stream.size,
          '-r', '30',
        ])
        .addInput((new StreamInput(stream.audio)).url)
        .addInputOptions([
          '-f s16le',
          '-ar 48k',
          '-ac 1',
        ])
        .on('start', ()=>{
          console.log('Start recording >> ', stream.recordPath)
        })
        .on('end', ()=>{
          stream.recordEnd = true;
          console.log('Stop recording >> ', stream.recordPath)
        })
        .size(VIDEO_OUTPUT_SIZE)
        .output(stream.recordPath)
        .aspect('4:3')
        .autopad();

        stream.proc.run();

        streams.unshift(stream);


    }

    streams[0].video.push(Buffer.from(data));
  });

  let totalEnd = 0;
  const timer = setInterval(() => {
    streams.forEach(stream => {
      // if (stream.recordEnd) {
        if (videoTrack.readyState !== 'live') {
        totalEnd++;
        if (totalEnd === streams.length) {
          streams[0].proc.kill('SIGCONT');
          clearTimeout(timer);
  
          // const mergeProc = ffmpeg()
          //   .on('start', () => {
          //     console.log('Start merging into ' + VIDEO_OUTPUT_FILE);
          //   })
          //   .on('end', () => {
          //     streams.forEach(({recordPath}) => {
          //       fs.unlinkSync(recordPath);
          //     })
          //     console.log('Merge end. You can play ' + VIDEO_OUTPUT_FILE);
          //   });
  
  
          // streams.forEach(({recordPath}) => {
          //   // console.log(recordPath);
          //   // const rstream = fs.createReadStream(recordPath)
          //   // mergeProc.addInput((new StreamInput(rstream)).url)
          //   mergeProc.addInput(recordPath)
          // });
  
          // mergeProc.mergeToFile(VIDEO_OUTPUT_FILE)
          //   .on('error', function(err) {
          //     console.log('Error ' + err.message);
          //   })
          //   .on('end', function() {
          //     console.log('Finished!');
          //   });
  
          // mergeProc
          //   // .addOutputOption('-movflags','frag_keyframe+empty_moov')
          //   .output(VIDEO_OUTPUT_FILE)
          //   .run();
        }
      }
    });
  }, 2000)
  return close.apply(this, arguments);
}






// UID++;
// // ffmpeg.getAvailableFormats(function(err, formats) {
// //   console.log('Available formats:');
// //   console.dir(formats);
// // });
 
// // ffmpeg.getAvailableCodecs(function(err, codecs) {
// //   console.log('Available codecs:');
// //   console.dir(codecs);
// // });
 
// // ffmpeg.getAvailableEncoders(function(err, encoders) {
// //   console.log('Available encoders:');
// //   console.dir(encoders);
// // });
 
// // ffmpeg.getAvailableFilters(function(err, filters) {
// //   console.log("Available filters:");
// //   console.dir(filters);
// // });
// const stream = {
//   // recordPath: './recording-' + size + '-' + UID + '.mp4',
//   recordPath: './recording.mp4',
//   size,
//   video: new PassThrough(),
//   audio: new PassThrough()
// };

// const onAudioData = ({samples: {buffer}}) => {
//   if (!stream.end) {
//     stream.audio.push(Buffer.from(buffer));
//   }
// };

// audioSink.addEventListener('data', onAudioData);

// stream.audio.on('end', () => {
//   audioSink.removeEventListener('data', onAudioData);
// });

// streams.unshift(stream);

// streams.forEach(item => {
//   if (item !== stream && !item.end) {
//     item.end = true;
//     if (item.audio) {
//       item.audio.end();
//     }
//     item.video.end();
//   }
// })
//   // .videoFilters('pad="ih*16/9:ih:(ow-iw)/2:(oh-ih)/2"')
//   // .videoFilters('scale=w=720:h=720')
// stream.proc = ffmpeg()
//   // .preset('podcast')
//   .addInput((new StreamInput(stream.video)).url)
//   .addInputOptions([
//     '-f', 'rawvideo',
//     '-pix_fmt', 'yuv420p',
//     // '-s', '720x720',
//     '-s', stream.size,
//     '-r', '30',
//   ])
//   // .fps(25)
//   .addInput((new StreamInput(stream.audio)).url)
//   .addInputOptions([
//     '-f s16le',
//     '-ar 48k',
//     '-ac 1',
//   ])
//   .on('start', () => {
//     console.log('Start recording >> ', stream.recordPath)
//   })
//   .on('end', () => {
//     stream.recordEnd = true;
//     console.log('Stop recording >> ', stream.recordPath)
//   })
//   .on('error', (err) => {

//     console.log('Errrrr >> ', err)
//   })
//   .save(stream.recordPath)

//   // .videoCodec('libx264')
//   // .size(VIDEO_OUTPUT_SIZE)
//   // .aspect('4:3')
//   // .autopad()
//   // .format('mp4')


// // stream.proc.run();
// }

// streams[0].video.push(Buffer.from(data));