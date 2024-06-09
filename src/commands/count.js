module.exports = {
    name: 'count',
    usage: '<number from 1 to 99>',
    description: 'count numbers from 1 to the given number(max:30)',
    args: false,
    guildOnly: true,
    cooldown: 10,
    category: 'Utility',
    execute(message, args) {
        const countnumbers = parseInt(args[0]);

        if (isNaN(countnumbers)) {
            return message.reply('that doesn\'t seem to be a valid number.');
        }
        else if (countnumbers < 1 || countnumbers > 30) {
            return message.reply('please enter a valid number between 1 and 30');
        }
        var i;
        for (i = 1; i <= countnumbers; i++) {
            message.channel.send(`${i}\n`);
        }
    },
};