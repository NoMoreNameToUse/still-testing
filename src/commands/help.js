const { prefix } = require('../../config/config.json');
const { Collection } = require("discord.js");
const { chmod } = require('fs');
const categories = new Collection();

module.exports = {
    name: 'help',
    description: 'List all of the commands or info about a specific command like all the other helps',
    aliases: ['commands'],
    usage: '<command>',
    category: 'Information',
    cooldown: 5,

    execute(message, args) {
        //create an Array where the command will be stored
        const data = [];
        const { commands } = message.client;
        const name = args[0];
        const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

        //check if the elements is unique
        const onlyUnique = (value, index, self) => {
            return self.indexOf(value) === index;
        }

        //function to dynamically retrive categories and command names
        function sendInfo() {
            //find all command categories 
            const commandCategories = commands.map(command => command.category).filter(onlyUnique)

            let currentCategory = "";
            data.push('Here\'s a list of all my commands:\n');

            //list all the commands in every command category.
            commandCategories.forEach(cat => {
                if (currentCategory !== cat) {
                    data.push(`**${cat}**`);

                    currentCategory = cat;
                }

                //map commands into categories 
                let categoryCommands = commands.filter(command => (command.category === currentCategory)).map(command => command)

                //push command name and description into data 
                for (i = 0; categoryCommands[i] != undefined; i++) {
                    data.push(`     -\`${categoryCommands[i].name}\`        ${categoryCommands[i].description}`);
                }

            });
            data.push(`\nUse \`${prefix}help <command name>\` for details\n`);
        }
        //if no arguments is given, send all available commands 
        if (!args.length) {
            //call the sendInfo command where it dynamically retrive categories and command names
            sendInfo();
            //send the retrived data into channel chat
            message.channel.send(data.join("\n"));
            return;
        }

        if (name === 'dm') {
            //call the sendInfo command where it dynamically retrive categories and command names
            sendInfo();
            //check if the request cames from a server channel or direct message. remind the user and catch any error.
            return message.author.send(data, { split: true })
                .then(() => {
                    if (message.channel.type === 'dm') return;
                    message.reply('I\'ve sent you a direct message with all my commands :D !');
                })
                .catch(error => {
                    console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
                    message.reply('it seems like I can\'t direct message you! Do you have direct messages disabled?');
                });
        }
        //check if the arguments is valid .
        else if (!command) {
            return message.reply('that\'s not a valid command!');
        }
        //retrive the info of the requested command.
        data.push(`**Command Info:**`);
        data.push(`# Name: ${command.name}`);
        if (command.aliases) data.push(`# Aliases: ${command.aliases.join(', ')}`);
        if (command.description) data.push(`#Description: ${command.description}`);
        if (command.usage) data.push(`#Usage: ${prefix}${command.name} ${command.usage}`);
        data.push(`#Cooldown: ${command.cooldown || 3} second(s)`);

        //send the retrived data into server chat

        message.channel.send(data.join("\n"));
        
    },
}