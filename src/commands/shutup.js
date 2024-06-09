//declare two global variable for storage. 
if (typeof activestate == 'undefined') {
	 Shutuplist = new Array;
	//create an activestate 
	 activestate = false;
}

module.exports = {
	name: 'shutup',
	usage: ' <now/withdraw>  <@username>',
	description: 'yeetus deletus messagues',
	aliases: ['shu'],
	args: false,
	guildOnly: true,
	category: 'Utility',
	//create an Array to store the Usernames 


	async execute(message, args) {
        /*################### temporary premission script###################*/
		if(message.author.id !== "594484787914473483"){
			message.channel.send("you don't have the premission to do that!");
            return;
		}
        /*################### temporary premission script end###################*/
		if (typeof activestate == 'undefined') {
			 Shutuplist = [];
			//create an activestate 
			 activestate = false;
		}
		//get the command
		const subCommand = args[0];
		let ifUserid = false;

		switch (subCommand) {
			//list all User in shutup mode
			case 'info':
				if (Shutuplist[0] == undefined) {
					message.reply('no one is currently on shutup mode.');
				}
				else {
					const data = [];
					data.push(`**there is currently ${Shutuplist.length} User in shutup mode:**`);
					for (i = 0; Shutuplist[i] != undefined; i++) {
						data.push(`     <@${Shutuplist[i]}>`);
					}
					data.push(`for more information please use the \`help\` command.`);
					message.channel.send(data);
				}
				break;
			case 'now':
				//check if there is a target user
				if (message.mentions.users.first() == undefined) {
					message.reply('Please @ a user');
					return;
				}
				const ShutupUserId = message.mentions.users.map(user => user.id);
				console.log(ShutupUserId)
				for (let id = 0; id < ShutupUserId.length; id++) {
					//check if the user is bot himself
					if (ShutupUserId[id] == 732898098321293403) {
						message.reply(`oops! i can't mute myself!`);
						break;
					}
					else {
						//set target user into shutup mode (put userid into Shutuplist array) 
						for (i = 0; Shutuplist[i] != undefined; i++) {
							//check if the id already exists
							if (Shutuplist[i] == ShutupUserId[id]) {
								message.channel.send(`<@${ShutupUserId[id]}> is already in shutup mode`);
								ifUserid = true;
							}
						}
						//push the id into array 
						if (ifUserid == false) {
							Shutuplist.push(ShutupUserId[id]);
							activestate = true;
							message.reply(`succesfully set <@${ShutupUserId[id]}> into shutup mode`);
						}
						console.log(`Current User in shutup mode:${Shutuplist}`);
					}
				}
				break;
			case 'withdraw' || 'wd':
				//check if there is a target user
				if (message.mentions.users.first() == undefined) {
					message.reply('Please @ a user');
					return;
				}
				const wdUserId = message.mentions.users.first().id;
				//remove the user from Shutuplist array 
				ifUserid = false;
				for (i = 0; Shutuplist[i] != undefined; i++) {
					if (Shutuplist[i] == wdUserId) {
						Shutuplist.splice(i, 1);
						ifUserid = true;
						if (Shutuplist[0] == undefined) {
							activestate = false;
						}
						message.reply(`successfuly retracted the shutup on <@${wdUserId}>`);
					}
				}
				if (!ifUserid) { message.reply(`<@${wdUserId}> is not in shutup mode`) }
				console.log(Shutuplist);
				break;

			default:
				return;
		}
	},
	//check the message for shutup
	async check(message) {
		//just for testing 
		console.log(`shutup command state: ${activestate}`)
		if (activestate != false) {
			//loop throgh the array to find the matching id 
			try {
				const UserId = message.author.id;
				for (i = 0; Shutuplist[i] != undefined; i++) {
					if (Shutuplist[i] == UserId) {
						message.delete();
					}
				}
			}
			catch (error) {
				console.log('oops at shutup check :C');
				console.error(err);
			}
		}
	},
}
