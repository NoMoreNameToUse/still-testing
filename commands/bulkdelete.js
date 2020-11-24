module.exports = {
    name: 'bulkdelete',
    description: 'for deleting a lot of messages in one go',
    usage: '<number from 1-99>',
    args: false,
    guildOnly: true,
    aliases: ['bdelete', 'bdel'],
    category: 'Utility',
    execute(message, args) {
        /*################### temporary premission script###################*/
        if(message.author.id == "594484787914473483"){
        /*################### temporary premission script end###################*/
                  const deleteamout = parseInt(args[0]) + 1;
        //check if the given quantity is number 
        if (isNaN(deleteamout)) {
            return message.reply('that doesn\'t seem to be a valid quantity.');
        }
        //check if the given quantity is valid 
        else if (deleteamout <= 1 || deleteamout > 100) {
            return message.reply('please enter a valid quantity between 1 and 99');
        }
        //Bulk delete messages, catch any error (can't delete message older then 2 weeks), return deleted amount 
        message.channel.bulkDelete(deleteamout, true).catch(err => {
            console.error(err);
            message.channel.send('there was an error trying to prune messages in this channel!');
        })
        message.channel.send(`deleted ${deleteamout - 1} messages`);
        }
        /*################### temporary premission script###################*/
        else{
              message.channel.send("you don't have the premission to do that!");
            return;
        }
        /*################### temporary premission script end###################*/

    },
};