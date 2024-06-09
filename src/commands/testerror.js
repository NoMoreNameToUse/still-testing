const config = require('../../config/config.json');

module.exports = {
name: 'testerror',
description:'make a intentional error',
args: false,
guildOnly: false,
category: 'Still Testing',

execute(message){
    let data ;
    data.push(`if you see this, then the world is broken`) 
    message.reply(data);
    }
};