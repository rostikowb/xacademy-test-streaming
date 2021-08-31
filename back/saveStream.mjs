import {PassThrough} from "stream";
import {promises as fs} from 'fs';
import {path as ffmpegPath} from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import {StreamInput} from "fluent-ffmpeg-multistream";
import wrtc from "wrtc";
import options from "./options";
import "ffprobe";

const {RTCAudioSink, RTCVideoSink} = wrtc.nonstandard;
ffmpeg.setFfmpegPath(ffmpegPath);

const VIDEO_OUTPUT_SIZE = '1280x720'
// const VIDEO_OUTPUT_SIZE = '320x240'
// const VIDEO_OUTPUT_SIZE = '720x720'
const VIDEO_OUTPUT_PATH = './video/'


export async function beforeOffer(mediaStream, id, peer) {
  const path = `./video/${id}/`

  const allTracks = mediaStream.getTracks()
  let audioTrack, videoTrack;

  if (!allTracks) return;

  allTracks.forEach(track => track.kind === 'video' ? videoTrack = track : audioTrack = track)
  const audioSink = new RTCAudioSink(audioTrack);
  const videoSink = new RTCVideoSink(videoTrack);

  const streams = [];


  try {
    await fs.mkdir(path)
  }catch (e) {
  }

  const fileList = await fs.readdir(path);
  let UID = fileList.length;

  console.log('start record');
  videoSink.addEventListener('frame', ({frame: {width, height, data}}) => {
    const size = width + 'x' + height;
    if (!streams[0] || (streams[0] && streams[0].size !== size)) {
      UID++;

      const stream = {
        recordPath: `./video/${id}/tmp${size}-${UID}-.mp4`,
        size,
        video: new PassThrough(),
        audio: new PassThrough()
      };

      const onAudioData = ({samples: {buffer}}) => {
        if (!stream.end) {
          stream.audio.push(Buffer.from(buffer));
        }
      };

      audioSink.addEventListener('data', onAudioData);

      stream.audio.on('end', () => {
        audioSink.removeEventListener('data', onAudioData);
      });

      streams.forEach(item => {
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
        .on('start', () => {
          console.log('Start recording >> ', stream.recordPath)
        })
        .on('end', () => {
          stream.recordEnd = true;
          console.log('Stop recording >> ', stream.recordPath)
        })
        .on('error', console.log)
        .size(VIDEO_OUTPUT_SIZE)
        .output(stream.recordPath)
        // .aspect('4:3')
        // .autopad();

      stream.proc.run();

      streams.unshift(stream);


    }

    streams[0].video.push(Buffer.from(data));
  });


  peer.on('close', () => {
    audioSink.stop();
    videoSink.stop();

    streams.forEach(({audio, video, end, proc, recordPath}) => {
      if (!end) {
        if (audio) {
          audio.end();
        }
        video.end();
      }
    });

    let totalEnd = 0;
    const timer = setInterval(() => {
      streams.forEach(stream => {
        if (stream.recordEnd) {
          totalEnd++;
          if (totalEnd === streams.length) {
            clearTimeout(timer);
          }
        }
      });
    }, 2000)
    // return close.apply(this, arguments);
  })
}

export async function glueRecord (id) {
  const VIDEO_OUTPUT_FILE = `./video/${id}/recording.mp4`
  const VIDEO_TMP_DIR = `./video/${id}/tmp`
  const url = `/${id}}/recording.mp4`
  const body = {
    password: 'seyFE8JULDrCmPVU',
    lesson_id: id,
    video_url: url
  };

  let fileList = await fs.readdir(`./video/${id}/`);
  if (!fileList.length || fileList[0].split('-').length < 3) return null;
  fileList = fileList.reverse()

  // fileList = fileList.sort((item1, item2)=>{
  //   const num1 = Number(item1.split('-')[1])
  //   const num2 = Number(item2.split('-')[1])
  //   return num1 > num2;
  // })
  console.log(fileList);
  const mergeProc = ffmpeg()
    .on('start', ()=>{
      console.log('Start merging into ' + VIDEO_OUTPUT_FILE);
    })
    .on('end', ()=>{
      try {
        fileList.forEach((recordPath)=>{
          fs.unlink(`./video/${id}/${recordPath}`);
        })

        fetch(options.api, {
          method: 'post',
          body:    JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        })
          .then(res => res.json())
          .then(json => console.log(json));

      }catch (e) {

      }
      console.log('Merge end. You can play ' + VIDEO_OUTPUT_FILE);
    });

  let lngt = fileList.length

  while (lngt--) {
    mergeProc.addInput(`./video/${id}/${fileList[lngt]}`);
  }

  // await fs.mkdir(VIDEO_TMP_DIR)
  mergeProc
    .mergeToFile(VIDEO_OUTPUT_FILE);
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


// let totalEnd = 0;
// const timer = setInterval(() => {
//   streams.forEach(stream => {
//     // if (stream.recordEnd) {
//     if (videoTrack.readyState !== 'live') {
//       totalEnd++;
//       if (totalEnd === streams.length) {
//         // streams[0].proc.kill('SIGCONT');
//         clearTimeout(timer);
//
//         const mergeProc = ffmpeg()
//           .on('start', () => {
//             console.log('Start merging into ' + VIDEO_OUTPUT_FILE);
//           })
//           .on('end', () => {
//             streams.forEach(({recordPath}) => {
//               fs.unlinkSync(recordPath);
//             })
//             console.log('Merge end. You can play ' + VIDEO_OUTPUT_FILE);
//           });
//
//
//         streams.forEach(({recordPath}) => {
//           mergeProc.addInput(recordPath)
//         });
//
//         mergeProc
//           .output(VIDEO_OUTPUT_FILE)
//           .run();
//       }
//     }
//   });