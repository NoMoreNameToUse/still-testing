//Load discord.js Module 
const Discord = require('discord.js')

//Load Node's native file system module.
const fs = require('fs');

//Load Sequelize, an object-relational-mapper(ORM) for database usage
const Sequelize = require('sequelize');

//Load configuration +
const { prefix, bot_secret_token, bot_id, helloserverid, hellochannelid, version, activityMessage } = require('./config.json');
const { error } = require('console');

//create Still Testing Discord client 
const Still_testing = new Discord.Client()

//create a extend JS's native Map class for better mapping 
Still_testing.commands = new Discord.Collection();

//create command cooldown collaction
const cooldown = new Discord.Collection();

//dynamically retrieve all commands in the /command directory, filter only javascript files 
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

//log the console log into a .txt file. 'a' means appending (old data will be preserved)
const consoleLog = new console.Console(fs.createWriteStream('./log/logoutput.txt', { flags: 'a' }));
consoleLog.log(`/*---------New Console Log startet at ${new Date()}---------*/`);

/*########_Boot_#########*/
/*-----------------------------Database-----------------------------*/
//define sqlite database connection info 
const sqliteDB = new Sequelize('still testing database', 'zhang', 'halloworld', {
    //database storage host position
    host: 'localhost',
    //database engine
    dialect: 'sqlite',
    //disable/enable verbos output from 
    logging: false,
    //sqlite only option, because sqlite stores all its data to a single file
    storage: './database/still testing database.sqlite',
});

//create a temporary database for temporary data storage. The database ceases to exist as soon as the connection is closed. 
const tempMemory = new Sequelize('sqlite::memory:');

/*-----------------------------Startup-----------------------------*/
//Programm startup message 
Still_testing.once('ready', () => {
    //display connect status in 
    console.log("Connected as " + Still_testing.user.tag)
    console.log("Bot Version:" + version)
    const helloserver = Still_testing.guilds.cache.get(helloserverid)
    const hellochannel = helloserver.channels.cache.get(hellochannelid);

    //send message in the specific server on login
    //hellochannel.send(helloMessage);

    //Send hello message to all servers 
    /*const allhelloserver = Still_testing.guilds.cache.map(guild => guild);
        for(helloguild of allhelloserver){
        if(helloguild.systemChannel != undefined){
        helloguild.systemChannel.send(helloMessage);
        }
      }*/

    //set activity
    Still_testing.user.setActivity(`${activityMessage} | ${prefix}help`);
})
/*-----------------------------ReadFile-----------------------------*/
//Read fils from /commands folder
for (const file of commandFiles) {
    const commandName = require(`./commands/${file}`);

    // set a new item in the Collection
    // with the key as the command name and the value as the exported module
    Still_testing.commands.set(commandName.name, commandName);
}

const shutupcheck = Still_testing.commands.get('shutup');

/*########_Main_Programm_#########*/

//Listening Message 
Still_testing.on('message', async message => {
    /*-----------------------------DirectReaction-----------------------------*/
    //check if the command comes from the bot
    if (message.author.id == bot_id) { return };

    //check shutup 
    shutupcheck.check(message);

    //react to all commands that starts with $kick your ass
    if (message.content.startsWith(`$kick`)) {
        message.channel.send('kick your ass too');
    }
    //Helloworld answer 
    else if (message.content === 'still_testing') {
        // Send Helloworld
        message.channel.send('Helloworld');
    }
    //auto delete ass bot online message
    /*else if (message.content.startsWith('Hi')) {
        message.delete();
    }*/

    /*-----------------------------dynamic_Prefix Commands-----------------------------*/
    //Exit early if the message starts without prefix 
    //add || message.author.bot after prefix for excluding bot messages 
    if (!message.content.startsWith(prefix)) return;
    //Trim prefix out of message content, removes the leading and trailing white space and line terminator characters from a string and put it into an array for optimisation
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    //find the requested command in the command p
    const command = Still_testing.commands.get(commandName) || Still_testing.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    //check if the given command is server only
    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply('oops! this command is a server only command   ( 0 _ 0 )');
    }

    //check for all commands with args option set to true if the command is empty. 
    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;
        //If it is empty, return a reply and the proper usage of the command
        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }

        return message.channel.send(reply);
    }
    //check if command cooldown is expired
    if (!cooldown.has(command.name)) {
        cooldown.set(command.name, new Discord.Collection());
    }

    //get current time 
    const now = Date.now();
    //get triggerd command
    const timestamps = cooldown.get(command.name);
    //get the cooldown time. Default is set to 1
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        //check if the cooldown is over
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
        }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    //compair incomming commands with dynamic commands from /command folder, catch any error occuring 
    try {
        await command.execute(message, args, sqliteDB, tempMemory);
        console.log(`${message.author} used ${message} with ${args} as arguments`)
        consoleLog.log(`#LOG <${new Date()}>: ${message.author} used ${message} with ${args} as arguments`);
    }
    catch (error) {
        message.reply(`Error executing command ${message},\n\n   Command:\n     ${message}\n   Error source:\n     ${error}.\n\nI definitly still need some testing`);
        consoleLog.log(`#ERROR <${new Date()}>: ${error}`);
        console.error(error);
    }
});
/*########_Connect_#########*/
//Bot Login 
Still_testing.login(bot_secret_token)