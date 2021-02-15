//Load node ytdl-core(you-tube-down-loader) Npmjs :https://www.npmjs.com/package/ytdl-core
const ytdl = require('ytdl-core');

/*#######################YTSR Temporary Malfunction caused by Youtube Infrastructure change#######################*/
//Load ytsr(you-tube-search-result). Npmjs :https://www.npmjs.com/package/ytsr
/*const ytsr = require('ytsr');*/

//Load YouTube Search. Npmjs :https://www.npmjs.com/package/youtube-sr
const ytsr = require('youtube-sr');

//using ffmpeg from https://www.ffmpeg.org/
const Sequelize = require('sequelize');
//Define prefix of Playlist
const playlistPrefix = '#'
//Load Operators from sequelize 
const Op = Sequelize.Op;
module.exports = {
    name: 'music',
    usage: '\n    -**play**:\n      %<music>(m) <play>(p) <name of the song>\n    -**search**:\n      %<music>(m) <search>(s) <name of the song>\n    -**queue**:\n      %<music>(m) <queue>(q)\n    -**now playing**:\n      %<music>(m) <np>\n    -**create playlist/add new song**:\n      %<music>(m) <playlistadd>(pa) #<playlistname>\n    -**show playlists**:\n      %<music>(m) <playlistinfo>(pli)  (or #<playlistName> for more Information)\n    -**play playlist**:\n      %<music>(m) <play>(p) <playlist>(pl) #<[targetplaylist]>\n    -**skip song**:\n      %<music>(m) <skip>\n    -**delete song in playlist**:\n      %<music>(m) <playlistsongdelete>(psd) #<playlistName> <songid> (get id using playlistsonginfo command)',
    description: 'like every other music bot. ytdl and ytsr based ###Temporary switch to youtube-sr becaus of Youtube change###',
    args: false,
    guildOnly: true,
    aliases: ['m'],
    category: 'Utility',
    async execute(message, args, sqliteDB) {
        //init musicSearchState
        if (typeof this.musicSearchState == 'undefined') {
            this.musicSearchState = false;
        }
        //init song queue 
        if (typeof this.songQueue == 'undefined') {
            this.songQueue = [];
        }
        //check in there is already a search running
        if (this.musicSearchState == true) return;
        //get the subcommand 
        const subcommand = args.shift().toLowerCase();
        //init DB
        const playlistSongTable = await this.playlistSongTableInit(sqliteDB);
        const playlistTable = await this.playlistTableInit(sqliteDB);

        switch (subcommand) {
            case 'play': case 'p':
                //get song name 
                const subsubcommand = args[0];
                if (subsubcommand == "playlist" || subsubcommand == "pl" || subsubcommand == "plist") {
                    //check channel and perms, return voicechannel for later connection
                    let voiceChannel = await this.reqCheck(message)
                    if (!voiceChannel) break;
                    //check if a command/songName is given
                    if (!args[1]) {
                        message.channel.send("you need to give me a song name in order to let me play it!");
                        return;
                    }
                    //check if user want to play a playlist
                    if (args[1].startsWith(playlistPrefix) == true) {
                        const playlistName = args[1].substring(playlistPrefix.length)
                        const playlist = await playlistTable.findOne({ where: { playlist: playlistName } });
                        if (!playlist) {
                            message.channel.send("there is no such playlist. please try again.")
                            return;
                        } else {
                            //push the song form db into queue
                            const oldSongQueue = this.songQueue.length;
                            const playlistSongs = (await playlistSongTable.findAll({ where: { playlist: playlistName } })).map(t => t.songName);
                            const data = [];
                            data.push(`**loading playlist** \`${playlistPrefix}${playlistName}\``)
                            for (let i = 0; playlistSongs[i] !== undefined; i++) {
                                const song = await playlistSongTable.findOne({ where: { songName: playlistSongs[i] } });
                                const songs = { url: song.songUrl, title: song.songName, duration: song.songDuration }
                                this.songQueue.push(songs)
                                data.push(`-${song.songName}, [${song.songDuration}]`)
                            }
                            data.push(`successfuly loaded playlist into queue`)
                            message.channel.send(data);
                            //play the song if there is no song playing.
                            if (oldSongQueue == false) {
                                var connection = await voiceChannel.join();
                                if (connection) {
                                    message.channel.send(`Joined channel \`${message.member.voice.channel.name}\``)
                                } else {
                                    message.channel.send('error joining channel');
                                    return;
                                }
                                await this.play(message, voiceChannel, connection)
                            } else {
                                message.channel.send("queued songs")
                            }
                        }
                    }
                    else {
                        message.channel.send(`please enter a playlist that starts with ${playlistPrefix}.`)
                    }
                }
                else {
                    const playArgument = args.join(' ');
                    if (playArgument) {
                        //check channel and perms, return voicechannel for later connection
                        let voiceChannel = await this.reqCheck(message)
                        if (!voiceChannel) break;
                        //get ytsr search results 
                        let searchResult = await this.searchyt(message, playArgument, false)
                        //get the info of the song
                        var songInfo = { url: searchResult[0].id, title: searchResult[0].title, duration: searchResult[0].durationFormatted };
                        this.songQueue.push(songInfo)
                        //if there is no music in the queue, play the song. Else queue the song
                        if (this.songQueue[1] == undefined) {
                            var connection = await voiceChannel.join();
                            if (connection) {
                                message.channel.send(`Joined channel \`${message.member.voice.channel.name}\``)
                            } else {
                                message.channel.send('error joining channel');
                                return;
                            }
                            await this.play(message, voiceChannel, connection)
                        }
                        else {
                            message.channel.send(`queued ${songInfo.title}`)
                        }
                    }
                }
                break;
            case 'stop':
                //not working for now 
                if (!message.member.voice.channel)
                    return message.channel.send(
                        "You have to be in a voice channel to stop the music!"
                    );
                this.songQueue = [];
                message.member.voice.channel.leave();
                break;
            case 'search': case 's':
                //get search argument 
                const searchArgument = args.join(' ');
                if (searchArgument) {
                    //check channel and perms, return voicechannel for later connection
                    let voiceChannel = await this.reqCheck(message)
                    if (!voiceChannel) break;
                    //get ytsr search results 
                    let searchResult = await this.searchyt(message, searchArgument, true)

                    //set the search state to true to prevent command overlapping
                    this.musicSearchState = true;
                    //wait for the user to chose the version to play 
                    const searchLimit = (await this.getsearchoptions()).limit;
                    //create userchoice and wait for user to choose a version of the song 
                    let Userchoice;
                    while (!Userchoice) {
                        Userchoice = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
                            .then(collected => {
                                //check if user want to cancel search 
                                if (collected.first().content == "cancel") {
                                    message.channel.send('\:white_check_mark: successfuly canceled');
                                    return "cancel";
                                }
                                //check if user's responce is valid 
                                const number = parseInt(collected.first().content);
                                if (number <= searchLimit && number !== 0) {
                                    return parseInt(collected.first().content);
                                } else {
                                    message.channel.send(`please enter a valid number under or equal to ${searchLimit}`)
                                    return;
                                }
                            })
                            .catch(err => {
                                console.log(err)
                            });
                    }
                    //set the search state to false to reenable music command 
                    this.musicSearchState = false;
                    //check if user canceled the search 
                    if (Userchoice == "cancel") break;
                    //set the song info
                    var songInfo = { url: searchResult[Userchoice - 1].id, title: searchResult[Userchoice - 1].title, duration: searchResult[Userchoice - 1].durationFormatted };
                    this.songQueue.push(songInfo)
                    //if there is no music in the queue, play the song. Else queue the song
                    console.log(this.songQueue);
                    if (this.songQueue[1] == undefined) {
                        var connection = await voiceChannel.join();
                        if (connection) {
                            message.channel.send(`Joined channel \`${message.member.voice.channel.name}\``)
                        } else {
                            message.channel.send('error joining channel');
                            return;
                        }
                        await this.play(message, voiceChannel, connection)
                    }
                    else {
                        message.channel.send(`queued ${songInfo.title}`)
                    }
                }
                else {
                    message.channel.send("you need to give me a song name in order to let me play it!")
                }
                break;
            case "queue": case "q":
                //check if there is a song in the queue 
                if (this.songQueue[0] == undefined) {
                    message.channel.send("there is currently no song playing!");
                } else {
                    //display all the songs in the queue 
                    const data = [];
                    const currentQueue = this.songQueue;
                    data.push(`Songs in the Queue \:page_facing_up:`);
                    for (let i = 0; currentQueue[i] !== undefined; i++) {
                        const num = i + 1;
                        data.push(`Queue Position ${num}: \`${currentQueue[i].title}\`  [${currentQueue[i].duration}]`);
                    }
                    message.channel.send(data);
                }
                break;
            case "np":
                //check if there is a song in the queue 
                if (this.songQueue[0] == undefined) {
                    message.channel.send("there is currently no song playing!");
                } else {
                    //display the first song in the queue 
                    const currentQueue = this.songQueue;
                    message.channel.send(`Now Playing:\n  \`${currentQueue[0].title}\`  [${currentQueue[0].duration}]`);
                    message.channel.send(currentQueue[0].url);
                }
                break;
            case "playlistadd": case "padd": case "pa":
                var givenPlaylists = (args.filter(RawPlaylist => RawPlaylist.startsWith(playlistPrefix)).map(RawPlaylist => RawPlaylist.slice(1)))[0];
                if (!givenPlaylists) {
                    message.channel.send(`please enter a playist name with prefix \`${playlistPrefix}\`.`)
                    while (!givenPlaylists) {
                        givenPlaylists = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
                            .then(collected => {
                                //check if user want to cancel search 
                                if (collected.first().content == "cancel") {
                                    message.channel.send('\:white_check_mark: successfuly canceled');
                                    return "cancel";
                                }
                                //check if user's responce is valid 
                                if (collected.first().content.startsWith(playlistPrefix) == true) {
                                    return collected.first().content.substring(playlistPrefix.length)
                                } else {
                                    message.channel.send(`please enter a playlist name with prefix${playlistPrefix}`)
                                    return;
                                }
                            })
                            .catch(err => {
                                console.log(err)
                            });
                    }
                }
                if (givenPlaylists == "cancel") return;
                const dbPlaylist = await playlistTable.findOne({ where: { playlist: givenPlaylists } });
                if (dbPlaylist == undefined) {
                    await this.newPlaylist(message, playlistTable, givenPlaylists)
                }
                let searchName;
                while (searchName !== "leave") {
                    message.channel.send("enter a song name to search and add it into the playlist. Type leave to exit.")
                    searchName = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
                        .then(collected => {
                            //check if user want to cancel search 
                            if (collected.first().content == "leave") {
                                message.channel.send('\:white_check_mark: exit');
                            }
                            return collected.first().content;
                        })
                        .catch(err => {
                            console.log(err)
                        });
                    if (searchName == "leave") break;
                    const searchResult = await this.searchyt(message, searchName, true)
                    this.musicSearchState = true;
                    //wait for the user to chose the version to play 
                    const searchLimit = (await this.getsearchoptions()).limit;
                    //create userchoice and wait for user to choose a version of the song 
                    let Userchoice;
                    while (!Userchoice) {
                        Userchoice = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
                            .then(collected => {
                                //check if user want to cancel search 
                                if (collected.first().content == "cancel") {
                                    message.channel.send('\:white_check_mark: successfuly canceled');
                                    return "cancel";
                                }
                                //check if user's responce is valid 
                                const number = parseInt(collected.first().content);
                                if (number <= searchLimit && number !== 0) {
                                    return parseInt(collected.first().content);
                                } else {
                                    message.channel.send(`please enter a valid number under or equal to ${searchLimit}`)
                                    return;
                                }
                            })
                            .catch(err => {
                                console.log(err)
                            });
                    }
                    //set the search state to false to reenable music command 
                    this.musicSearchState = false;
                    //check if user canceled the search 
                    if (Userchoice !== "cancel") {
                        //set the song info
                        const psongInfo = searchResult[Userchoice - 1];
                        await this.newPlaylistSong(message, playlistSongTable, givenPlaylists, psongInfo)
                    }
                }
                break;
            case 'playlistinfo': case 'playlisti': case 'pli':
                let Playlist = (args.filter(RawPlaylist => RawPlaylist.startsWith(playlistPrefix)).map(RawPlaylist => RawPlaylist.slice(1)))[0];
                const data = [];
                if (Playlist == undefined) {
                    const playlistList = await playlistTable.findAll({ attributes: ['playlist'] });
                    const playlistArray = playlistList.map(t => t.playlist);
                    if (playlistArray.length) {
                        for (var i = 0; playlistArray[i] !== undefined; i++) {
                            const playlistListTable = await playlistTable.findOne({ where: { playlist: playlistArray[i] } });
                            data.push(`- Playlist :\`${playlistPrefix}${playlistListTable.playlist}\`\n   Description:  ${playlistListTable.playlistDescription}`)
                        };
                        //send the retrived info
                        console.log(data);
                        message.channel.send(data);
                    } else {
                        message.channel.send('there is currently no songs in any playlist.');
                    }
                } else {
                    data.push(`Songs in playlist\`${playlistPrefix}${Playlist}\`:`)
                    //get all id of uploaded documents into an array 
                    const songList = await playlistSongTable.findAll({ where: { playlist: Playlist } });
                    const songArray = songList.map(t => t.songName)
                    console.log(songArray);
                    if (songArray.length) {
                        for (var i = 0; songArray[i] !== undefined; i++) {
                            const song = await playlistSongTable.findOne({ where: { songName: songArray[i] } });
                            //get brief inforOnemation from each document
                            data.push(`-${song.songName}  \*${song.songDuration}\*  id:  ${song.id}.`)
                        };
                        //send the retrived info
                        console.log(data);
                        message.channel.send(data);
                    } else {
                        message.channel.send('QAQ can\'t find the Playlist');
                    }
                }
                break;
            case 'skip':
                if (this.songQueue[0] == undefined) {
                    message.reply(`there is no song to skip!`)
                } else {
                    this.songQueue.shift();
                    //check channel and perms, return voicechannel for later connection
                    let voiceChannel = await this.reqCheck(message)
                    if (!voiceChannel) break;
                    var connection = await voiceChannel.join();
                    await this.play(message, voiceChannel, connection);
                }
                break;
            case 'shuffle':
                //shuffle the queue
                if (this.songQueue[2] == undefined) {
                    message.channel.send("there are not enough songs for a shuffle")
                } else {
                    const nowPlaying = this.songQueue.shift();
                    let shuffleQueue = this.songQueue;
                    this.songQueue = [];
                    this.songQueue.push(nowPlaying);
                    //Randomize the songs in the shuffleArray 
                    for (let i = shuffleQueue.length - 1; i > 0; i--) {
                        let j = Math.floor(Math.random() * (i + 1));
                        [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
                    }
                    for (let i = 0; i < shuffleQueue.length; i++) {
                        this.songQueue.push(shuffleQueue[i]);
                    }
                    message.channel.send('\:ok_hand: shuffled queue')
                }
                break;
            case 'playlistsongdelete': case 'psd':
                let deletePlaylist = args.shift().toLowerCase();
                let deleteSongId = args.join(' ')
                if (!deletePlaylist.startsWith(playlistPrefix)) {
                    message.channel.send(`please enter a playlist with prefix \`${playlistPrefix}\``)
                    break;
                };
                deletePlaylist = deletePlaylist.substr(playlistPrefix.length);
                //get the target song info  
                const delSongInfo = await playlistSongTable.findOne({
                    where: {
                            id: deleteSongId,
                            playlist: deletePlaylist
                    }
                });
                if (delSongInfo) {
                    //if target sonf is found, delete it and return delete information 
                    const rowCount = await playlistSongTable.destroy({ where: { songName: delSongInfo.songName, playlist: delSongInfo.playlist } });
                    message.channel.send(`deleted ${delSongInfo.songName} in playlist ${playlistPrefix}${delSongInfo.playlist}`);
                }
                else {
                    message.reply("can't find the song/playlist");
                    break;
                }
                break;
            case 'playlistdelete': case 'pd':
                const delPlaylist = (args.filter(RawPlaylist => RawPlaylist.startsWith(playlistPrefix)).map(RawPlaylist => RawPlaylist.slice(1)))[0];
                console.log(delPlaylist);
                const delPlaylistInfo = await playlistTable.findOne({ where: { playlist: delPlaylist } });
                if (delPlaylistInfo) {
                    //if target document found, delete it and return delete information
                    const rowCount = await playlistTable.destroy({ where: { playlist: delPlaylistInfo.playlist } });
                    console.log(rowCount);
                    message.channel.send(`deleted playlist: \`${playlistPrefix}${delPlaylistInfo.playlist}\``);
                }
                else {
                    message.reply("can't find the song/playlist");
                    break;
                };
                break;
            default:
        }
    },
    async reqCheck(message) {
        const voiceChannel = message.member.voice.channel;
        //check if user is in a voice channel
        if (!voiceChannel) {
            message.channel.send("You need to be in a voice channel to play music!");
            return;
        }
        //check if the bot have the perms to join and play 
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            message.channel.send("I need the permissions \`'connect'\` and \`'speak'\` to join and play music in your voice channel!");
            return;
        }
        return voiceChannel;
    },
    //set the play option. will be changed in future updates to db
    async getsearchoptions() {
        const searchoptions = {
            limit: 8,
            volume: 5,
        }
        return searchoptions;
    },
    //search given song name or whatever in youtube using ytsr 
    async searchyt(message, playArgument, state) {
        var options = await this.getsearchoptions();
        const limit = options.limit;

        //Temporary Switched to Youtube-sr
        const searchResult = await ytsr.search(playArgument, { limit: limit }).catch(err => { console.log(err); });
        const data = [];
        //check if need to list all the songs  
        if (state == true) {
            data.push(`**Search results:**\n`);
            for (let i = 0; i < limit; i++) {
                const num = i + 1;
                data.push(`\`${num}\`.  -  ${searchResult[i].title}  [${searchResult[i].durationFormatted}]`);
            }
            data.push('\nType a number to chose a song, Type \`cancel\` to exit');
            message.channel.send(data);
        }
        
        return searchResult;
    },
    //play the song using ytdl
    async play(message, voiceChannel, connection) {
        //leave if there is no more song in the queue 
        if (this.songQueue[0] == undefined) {
            voiceChannel.leave();
            return;
        }
        try {
            //get the first song in the queue and play it
            songPlay = this.songQueue[0];
            let stream = await ytdl(songPlay.url, {filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25});
            let dispatcher = await connection.play(stream);
            dispatcher
                .on("finish", () => {
                    //play the next song when the song finished playing 
                    this.songQueue.shift();
                    this.play(message, voiceChannel, connection);
                })
                .on("error", e => {
                    console.error(e);
                    message.channel.send("....");
                })
            message.channel.send(`now playing \:notes: \`${songPlay.title}\``)
            console.log(`playing: ${songPlay.title}`)
            dispatcher.setVolumeLogarithmic(1);
        }
        catch (err) {
            console.log(err);
            return
        }
    },
    async playlistSongTableInit(sqliteDB) {
        const playlistSongTable = sqliteDB.define('playlistSongTable', {
            songName: {
                unique: false,
                type: Sequelize.STRING
            },
            songUrl: {
                unique: false,
                type: Sequelize.STRING
            },
            songDuration: {
                unique: false,
                type: Sequelize.STRING
            },
            songDescription: {
                type: Sequelize.STRING,
                unique: false
            },
            playlist: {
                unique: false,
                type: Sequelize.STRING
            },
        });
        //sync with the database 
        await playlistSongTable.sync().catch(err => console.log(`InitplaylistSongTabelError:${err}`));
        return playlistSongTable;
    },
    async playlistTableInit(sqliteDB) {
        const playlistTable = sqliteDB.define('playlistTable', {
            playlist: {
                type: Sequelize.STRING,
                unique: true,
            },
            playlistDescription: {
                type: Sequelize.STRING,
            },
        });
        //sync with the database 
        await playlistTable.sync().catch(err => console.log(`InitPlaylistTabelError:${err}`));
        return playlistTable;
    },
    async newPlaylist(message, playlistSongTable, playlistName) {
        var description;
        message.channel.send(`please enter some description about playlist ${playlistName}`)
        while (!description) {
            description = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
                .then(collected => {
                    //check if user's responce is valid 
                    return collected.first().content;
                })
                .catch(err => {
                    console.log(err)
                });
        }
        try {
            //log event in console
            console.log(`create playlist:${playlistName},${description}`)
            //create new Tag model in db
            const playlist = await playlistSongTable.create({
                playlist: playlistName,
                playlistDescription: description,
            });
            message.channel.send(`Playlist ${playlistPrefix}${playlist.get('playlist')} added.`);
        }
        catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                message.reply('That playlist already exists.');
            }
            else {
                message.reply('Something went wrong with adding a playlist.');
                console.log(e);
                return;
            }
        }
    },
    async newPlaylistSong(message, playlistSongTable, playlistName, songInfo) {
        const ifalready = await playlistSongTable.findOne({ where: { songName: songInfo.title, playlist: playlistName } });
        if (!ifalready) {
            //Quick & dirty solution for formatting
            const SongUrl = ('https://www.youtube.com/watch?v=' + songInfo.id )
            const newSong = await playlistSongTable.create({
                songName: songInfo.title,
                songUrl: SongUrl,
                songDuration: songInfo.durationFormatted,
                songDescription: songInfo.description,
                playlist: playlistName,
            }).catch(err => {
                console.error(err);
            });
            console.log("ns" + newSong);
            message.channel.send(`added ${newSong.songName} to ${newSong.playlist}.`)
            return newSong;
        }
        else {
            message.channel.send(`that song already exists`)
            return;
        }
    },
}