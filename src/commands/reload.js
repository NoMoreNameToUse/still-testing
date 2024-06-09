
module.exports = {
	name: 'reload',
	usage: '<command>',
	description: 'reload a command',
	aliases: ['rl'],
	args: false,
	guildOnly: false,
	category: 'Still Testing',
	execute(message, args) {
		//check if a argument is given
		if (!args.length) return message.channel.send(`You didn't pass any command to reload, ${message.author}!`);
		//get the command name and command 
		const commandName = args[0].toLowerCase();
		const command = message.client.commands.get(commandName)
			|| message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

		if (!command) return message.channel.send(`There is no command with name or alias \`${commandName}\`, ${message.author}!`);

		//because of the global variable in command shutup, reloading it will breake the command.
		// if(command.name == 'shutup'){message.reply('command shutup is not reloadable because of the global variable in command shutup, reloading it will breake the command. Please restart the bot to reload it.');return;}
		
		//delete the old command instance 
		delete require.cache[require.resolve(`./${command.name}.js`)];

		//try to reload the command 
		try {
			const newCommand = require(`./${command.name}.js`);
			message.client.commands.set(newCommand.name, newCommand);
		} catch (error) {
			console.log(error);
			message.channel.send(`There was an error while reloading a command \`${command.name}\`:\n\`${error.message}\``);
		}
		//tell the user that the command was reloaded 
		message.channel.send(`Command \`${command.name}\` was reloaded!`);
	},
};