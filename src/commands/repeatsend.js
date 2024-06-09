module.exports = {
    name: 'repeatsend',
    usage: '<number from 1 - 30> <command>',
    description: 'repeatetly send given command a given amount of time (1 to 30)',
    args: false,
    aliases: ['rese'],
    guildOnly: true,
    cooldown: 10,
    category: 'Useless Utility',
    execute(message, args) {
        const countnumbers = args.shift().toLowerCase();
        const sendcommand = args.join(' ');

        if (isNaN(countnumbers)) {
            return message.reply('that doesn\'t seem to be a valid number.');
        }
        else if (countnumbers < 1 || countnumbers > 30) {
            return message.reply('please enter a valid number between 1 and 30');
        }
        if (sendcommand) {
            var i;
            for (i = 1; i <= countnumbers; i++) {
                message.channel.send(sendcommand);
            }
        }
    },
};