const { join } = require('node:path');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
//using ffmpeg from https://www.ffmpeg.org/
module.exports = {
    name: 'hmm',
    description: 'hmmmmmmmmm',
    args: false,
    guildOnly: true,
    category: 'Fun',
    async execute(message) {
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
            let resource = createAudioResource(join(__dirname, '../../resources/hmm.mp3'));
            try {

                await entersState(connection, VoiceConnectionStatus.Ready, 5000);
                
                console.log("Connected: " + voiceChannel.guild.name);
                
                } catch (error) {
                
                console.log("Voice Connection not ready within 5s.", error);
                
                return null;
                
                }
                console.log('playing')    
                
            connection.subscribe(audioPlayer);
            audioPlayer.play(resource);
            console.log(resource)
            audioPlayer.on('error', error => {
                console.error(error);
            });
            audioPlayer.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
              });

        }
        catch (err) {
            console.log(err);
            return
        }
    }
}