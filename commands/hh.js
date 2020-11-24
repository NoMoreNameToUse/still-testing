//using ffmpeg from https://www.ffmpeg.org/
module.exports = {
    name: 'hh',
    description: 'hh',
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
            let dispatcher = await connection.play('./resources/hh.mp3')
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