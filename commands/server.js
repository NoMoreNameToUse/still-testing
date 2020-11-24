module.exports = {
	name: 'server',
	usage: '<server>',
	description: 'reply server status ',
	args: false,
	guildOnly: true,
	category: 'Still Testing',
	execute(message, args) {
		message.channel.send(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`);
	},
}