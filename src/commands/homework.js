//Load Sequelize, an object-relational-mapper(ORM) for database usage
const Sequelize = require('sequelize');
//Load discord.js Module
const Discord = require('discord.js');
//Load configuration 
const config = require('../../config/config.json');
//Load Operators from sequelize 
const Op = Sequelize.Op;


module.exports = {
	name: 'homework',
	usage: '<homework>',
	description: 'homework!',
	aliases: ['ho', 'ha'],
	args: false,
	guildOnly: true,
	category: 'Useless Utility',
    //For documentations of homeworks
	execute(message, args) {
		message.channel.send(`hello!`);
		//some code for testing here
	}
};