const Sequelize = require('sequelize');

module.exports = {
	name: 'tag',
	usage: '<add/tag/edit/info/show/remove>,<tagname>',
	description: 'a useless tag system just for the tutorial :D',
	aliases: ['tags'],
	args: false,
	guildOnly: false,
	category: 'Still Testing',
	async execute(message, args, sequelize) {
		//create a table named 'Tags' for the data 
		const Tags = sequelize.define('tags', {
			name: {
				type: Sequelize.STRING,
				unique: true,
			},
			description: Sequelize.TEXT,
			username: Sequelize.STRING,
			usage_count: {
				type: Sequelize.INTEGER,
				defaultValue: 0,
				allowNull: false,
			},
		});

		//sync with the database 
		Tags.sync();

		const subcommand = args[0];
		const tagName = args[1];
		const tagDescription = args[2];
		
		if(subcommand == 'show'){
			// equivalent to: SELECT name FROM tags;
			const tagList = await Tags.findAll({ attributes: ['name'] });
			const tagString = tagList.map(t => t.name).join(', ') || 'No tags set.';
			return message.channel.send(`List of tags: ${tagString}`);
		}else if (!tagName){
			message.reply('tag name can\'t be empty.')
			return;
		}
		switch(subcommand){
			case 'add':
				try {
					// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
					const tag = await Tags.create({
						name: tagName,
						description: tagDescription,
						username: message.author.username,
					});
					return message.reply(`Tag ${tag.name} added.`);
				}
				catch (e) {
					if (e.name === 'SequelizeUniqueConstraintError') {
						return message.reply('That tag already exists.');
					}
					return message.reply('Something went wrong with adding a tag.');
				}
				break;

			case 'tag':
				// equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
				const tag = await Tags.findOne({ where: { name: tagName } });
				if (tag) {
					// equivalent to: UPDATE tags SET usage_count = usage_count + 1 WHERE name = 'tagName';
					tag.increment('usage_count');
					return message.channel.send(tag.get('description'));
				}
				return message.reply(`Could not find tag: ${tagName}`);
				break;

			case 'edit':
				// equivalent to: UPDATE tags (descrption) values (?) WHERE name='?';
				const affectedRows = await Tags.update({ description: tagDescription }, { where: { name: tagName } });
				if (affectedRows > 0) {
					return message.reply(`Tag ${tagName} was edited.`);
				}
				return message.reply(`Could not find a tag with name ${tagName}.`);
				break;

			case 'info':
				// equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
				const infotag = await Tags.findOne({ where: { name: tagName } });
				if (infotag) {
					return message.channel.send(`${tagName} was created by ${tag.username} at ${tag.createdAt} and has been used ${tag.usage_count} times.`);
				}
				return message.reply(`Could not find tag: ${tagName}`);
				break;

			case 'remove':
				// equivalent to: DELETE from tags WHERE name = ?;
				const rowCount = await Tags.destroy({ where: { name: tagName } });
				if (!rowCount) return message.reply('That tag did not exist.');
				return message.reply('Tag deleted.');
				break;

			return message.reply('Tag deleted.');
			default: 
				return;
		}
	}
}; 