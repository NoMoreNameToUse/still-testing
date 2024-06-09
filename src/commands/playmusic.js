//temporary music playing option with direct url
//Load node ytdl-core(you-tube-down-loader) Npmjs :https://www.npmjs.com/package/ytdl-core
const ytdl = require("ytdl-core");
//Load ytsr(you-tube-search-result). Npmjs :https://www.npmjs.com/package/ytsr
const ytsr = require("youtube-sr");
//using ffmpeg from https://www.ffmpeg.org/

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
} = require("@discordjs/voice");

module.exports = {
  name: "playmusic",
  description: "temporary method of playing music by url",
  args: false,
  guildOnly: true,
  category: "Utility",
  async execute(message, args) {
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
      var connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
      const audioPlayer = createAudioPlayer();
      const musicUrl = args.shift();
      console.log(musicUrl)
      const stream = ytdl(musicUrl, {
        filter: "audioonly",
        highWaterMark: 1 << 25,
      });
      const resource = createAudioResource(stream);
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 5000);

        console.log("Connected: " + voiceChannel.guild.name);
      } catch (error) {
        console.log("Voice Connection not ready within 5s.", error);

        return null;
      }
      console.log("playing");

      connection.subscribe(audioPlayer);
      audioPlayer.play(resource);
      console.log(resource);
      audioPlayer.on("error", (error) => {
        console.error(error);
      });
      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });
    } catch (err) {
      console.log(err);
      return;
    }
  },
};
