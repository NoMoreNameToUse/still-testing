module.exports = {
    name: 'avatar',
    description: 'use to display avatars',
    usage: '<@user>',
    args: false,
    guildOnly: true,
    category: 'Useless Utility',
    execute(message) {
        if (!message.mentions.users.size) {
            return message.channel.send(`Your avatar: <${message.author.displayAvatarURL({ format: "png", dynamic: true })}>`);
        }
        message.mentions.users.forEach(user =>  {
            return message.channel.send(`${user.username}'s avatar: <${user.displayAvatarURL({ format: "png", dynamic: true })}>`);
        });
    },
};