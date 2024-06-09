module.exports = {
    name: 'cinfo',
    description: 'display command info',
    usage: '<type a command>',
    args: true,
    guildOnly: true,
    category: 'Useless Utility',
    execute(message, args) {
        //return the command name for the bot
        message.channel.send(`Command name: ${message}\nArguments: ${args}`);
    },
};

