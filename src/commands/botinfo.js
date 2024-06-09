//Load discord.js Module 
const Discord = require('discord.js')
//Load config
const config = require('../../config/config.json');

module.exports = {
    name: 'botinfo',
    description: 'Information about the bot',
    args: false,
    guildOnly: false,
    aliases: ['binfo'],
    category: 'Information',

    execute(message) {
        const data = [];
        data.push(`\nBot Name: ${config.botName}`)
        data.push(`Bot Description: ${config.description}`)
        data.push(`Bot Version: ${config.version}`)
        data.push(`Bot Developer: <@${config.developer}>`)
        data.push(`Bot Github link: ${config.githubLink}`)
        data.push(`Contact: ${config.contact}`)
        console.log("Start");
        console.log(data);
        console.log("End");
        message.reply(data.join("\n"));
    }
};