const readline = require('readline');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');

const videoUrl = [
'https://www.youtube.com/watch?v=dEe1CZvvTuA',
];

for (i = 0; i < videoUrl.length; i++) {

let stream = ytdl(videoUrl[i]);


let start = Date.now();
ffmpeg(stream)
  .audioBitrate(128)
  .save(`${__dirname}/${i}.mp4`)
  .on('progress', p => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${p.targetSize}kb downloaded`);
  })
  .on('end', () => {
    console.log(`\ndone, thanks - ${(Date.now() - start) / 1000}s`);
  });

}


