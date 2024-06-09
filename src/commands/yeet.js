module.exports = {
    name: 'yeet',
    usage: '<@user>',
    description: 'yeet someone',
    args: false,
    guildOnly: true,
    category: 'Fun',
    execute(message, args) {
        //check if a user is mentioned
        if (!message.mentions.users.size) {
            return message.reply('you need to tag a user in order to yeet them!');
        }
        //choose the first tagged user 
        const taggedUser = message.mentions.users.first();
        //YEEEEET'EM!
        message.channel.send(`${taggedUser.username} YEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEETUS DELETUS`);
    },
};