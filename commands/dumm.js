//Load node ytdl-core(you-tube-down-loader) Npmjs :https://www.npmjs.com/package/ytdl-core
const ytdl = require('ytdl-core-discord');
//Load ytsr(you-tube-search-result). Npmjs :https://www.npmjs.com/package/ytsr
const ytsr = require('ytsr');
//using ffmpeg from https://www.ffmpeg.org/

module.exports = {
    name: 'dumm',
    description: 'ich bin dumm',
    args: false,
    guildOnly: true,
    category: 'Fun',
    async execute(message, args, sqliteDB) {
        const voiceChannel = message.member.voice.channel;
        //check if user is in a voice channel
        if (!voiceChannel) {
            return;
        }
        //check if the bot have the perms to join and play 
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return;
        }
        try {
            var connection = await voiceChannel.join();
            let stream = await ytdl('https://www.youtube.com/watch?v=dGAo9AK0KNA', { filter: 'audioonly', highWaterMark: 1 << 25 });
            let dispatcher = await connection.play(stream, { type: 'opus' })
            dispatcher.on("finish", () => {
                voiceChannel.leave();
              })
              .on("error", e => {
                console.error(e);
                message.channel.send("....");
            })
            dispatcher.setVolumeLogarithmic(1);
        }
        catch (err) {
            console.log(err);
            return
        }
    }
}