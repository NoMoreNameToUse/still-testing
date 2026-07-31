//Load yt-dlp-exec for audio streaming (replaces ytdl-core)
const ytdlp = require("yt-dlp-exec");
//using ffmpeg from https://www.ffmpeg.org/

//discord.js v14 compliant
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  getVoiceConnection,
  AudioPlayerStatus,
} = require("@discordjs/voice");

//using ffmpeg from https://www.ffmpeg.org/
const Sequelize = require("sequelize");
//Define prefix of Playlist
const playlistPrefix = "#";
//Load Operators from sequelize
const Op = Sequelize.Op;
const myArray = [];

module.exports = myArray;
module.exports = {
  name: "music",
  usage:
    "\n    -**play**:\n      %<music>(m) <play>(p) <name of the song>\n    -**search**:\n      %<music>(m) <search>(s) <name of the song>\n    -**queue**:\n      %<music>(m) <queue>(q)\n    -**now playing**:\n      %<music>(m) <np>\n    -**create playlist/add new song**:\n      %<music>(m) <playlistadd>(pa) #<playlistname>\n    -**show playlists**:\n      %<music>(m) <playlistinfo>(pli)  (or #<playlistName> for more Information)\n    -**play playlist**:\n      %<music>(m) <play>(p) <playlist>(pl) #<[targetplaylist]>\n    -**skip song**:\n      %<music>(m) <skip>\n    -**stop playing**:\n      %<music>(m) <stop>\n    -**delete song in playlist**:\n      %<music>(m) <playlistsongdelete>(psd) #<playlistName> <songid> (get id using playlistsonginfo command)",
  description:
    "like every other music bot. ytdl and youtube-sr based",
  args: false,
  guildOnly: true,
  aliases: ["m"],
  category: "Utility",


  async execute(message, args, sqliteDB) {
    //init musicSearchState
    if (typeof this.musicSearchState == "undefined") {
      this.musicSearchState = false;
    }
    //init song queue
    if (typeof this.songQueue == "undefined") {
      this.songQueue = [];

    }
    //check in there is already a search running
    if (this.musicSearchState == true) return;
    //get the subcommand
    const subcommand = args.shift().toLowerCase();
    //init DB
    const playlistSongTable = await this.playlistSongTableInit(sqliteDB);
    const playlistTable = await this.playlistTableInit(sqliteDB);

    //check if the bot have the perms to join and play 
    const voiceChannel = message.member.voice.channel;
    if(voiceChannel == null){
      message.channel.send(
        "you need to be in a voice channel!"
      );
      return;
    }
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return;
    }
    switch (subcommand) {
      case "play":
      case "p":
        //get song name
        const subsubcommand = args[0];
        if (
          subsubcommand == "playlist" ||
          subsubcommand == "pl" ||
          subsubcommand == "plist"
        ) {
          //check if a command/songName is given
          if (!args[1]) {
            message.channel.send(
              "you need to give me a song name in order to let me play it!"
            );
            return;
          }
          //check if user want to play a playlist
          if (args[1].startsWith(playlistPrefix) == true) {
            const playlistName = args[1].substring(playlistPrefix.length);
            const playlist = await playlistTable.findOne({
              where: { playlist: playlistName },
            });
            if (!playlist) {
              message.channel.send(
                "there is no such playlist. please try again."
              );
              return;
            } else {
              //push the song form db into queue
              const oldSongQueue = this.songQueue.length;
              const playlistSongs = (
                await playlistSongTable.findAll({
                  where: { playlist: playlistName },
                })
              ).map((t) => t.songName);
              const data = [];
              data.push(
                `**loading playlist** \`${playlistPrefix}${playlistName}\``
              );
              for (let i = 0; playlistSongs[i] !== undefined; i++) {
                const song = await playlistSongTable.findOne({
                  where: { songName: playlistSongs[i] },
                });
                const songs = {
                  url: song.songUrl,
                  title: song.songName,
                  duration: song.songDuration,
                };
                this.songQueue.push(songs);
                data.push(`-${song.songName}, [${song.songDuration}]`);
              }
              data.push(`successfuly loaded playlist into queue`);
              message.channel.send(data.join("\n"));
              //play the song if there is no song playing.
              if (oldSongQueue == false) {
                const connection = await this.getReadyConnection(
                  message,
                  voiceChannel
                );
                if (connection) {
                  message.channel.send(
                    `Joined channel \`${message.member.voice.channel.name}\``
                  );
                } else {
                  message.channel.send("error joining channel");
                  return;
                }
                await this.play(message, voiceChannel, connection);
              } else {
                message.channel.send("queued songs");
              }
            }
          } else {
            message.channel.send(
              `please enter a playlist that starts with ${playlistPrefix}.`
            );
          }
        } else {
          const playArgument = args.join(" ");
          if (playArgument) {
            //check if the bot have the perms to join and play 
            const voiceChannel = message.member.voice.channel;
            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                return;
            }
            //get ytsr search results
            let searchResult = await this.searchyt(
              message,
              playArgument,
              false
            );
            if (!searchResult[0]) {
              message.channel.send(`failed to find song \`${playArgument}\``);
              return;
            }
            //get the info of the song
            var songInfo = {
              url: searchResult[0].id,
              title: searchResult[0].title,
              duration: searchResult[0].durationFormatted,
            };
            this.songQueue.push(songInfo);
            //if there is no music in the queue, play the song. Else queue the song
            if (this.songQueue[1] == undefined) {
              const connection = await this.getReadyConnection(
                message,
                voiceChannel
              );
              if (!connection) {
                return;
              }

              message.channel.send(
                `Joined channel \`${message.member.voice.channel.name}\``
              );

              await this.play(message, voiceChannel, connection);
            } else {
              message.channel.send(`queued ${songInfo.title}`);
            }
          }
        }
        break;
      case "stop":
        //not working for now
        if (message.member.voice.channel == null)
        return message.channel.send(
          "You have to be in a voice channel to stop the music!"
        );
        const connection = getVoiceConnection(message.guild.id);
        this.songQueue = [];
        if (connection) {
          connection.destroy();
        }
        break;
      case "search":
      case "s":
        //get search argument
        const searchArgument = args.join(" ");
        if (searchArgument) {
          //check channel and perms, return voicechannel for later connection
          let voiceChannel = await this.reqCheck(message);
          if (!voiceChannel) break;
          //get ytsr search results
          let searchResult = await this.searchyt(message, searchArgument, true);
          //failure message already sent by searchyt, nothing to choose from
          if (searchResult.length == 0) break;

          //set the search state to true to prevent command overlapping
          this.musicSearchState = true;
          //wait for the user to chose the version to play
          const searchLimit = (await this.getsearchoptions()).limit;
          //create userchoice and wait for user to choose a version of the song
          let Userchoice;
          const collectorFilter  = (response) => {
            // You can apply a filter to determine which messages you want to collect.
            // For example, you can check if the response is from a specific user.
            return response.author.id === message.author.id;
          };
          while (!Userchoice) {
            Userchoice = await message.channel
              .awaitMessages({
                filter: collectorFilter,
                 max:1 , time: 30000, errors: ['time']}
              )
              .then((collected) => {
                //check if user want to cancel search
                if (collected.first().content == "cancel") {
                  message.channel.send(
                    ":white_check_mark: successfuly canceled"
                  );
                  return "cancel";
                }
                //check if user's responce is valid
                const number = parseInt(collected.first().content);
                if (number <= searchLimit && number !== 0) {
                  return parseInt(collected.first().content);
                } else {
                  message.channel.send(
                    `please enter a valid number under or equal to ${searchLimit}`
                  );
                  return;
                }
              })
              .catch((err) => {
                console.log(err);
              });
          }
          //set the search state to false to reenable music command
          this.musicSearchState = false;
          //check if user canceled the search
          if (Userchoice == "cancel") break;
          //set the song info
          var songInfo = {
            url: searchResult[Userchoice - 1].id,
            title: searchResult[Userchoice - 1].title,
            duration: searchResult[Userchoice - 1].durationFormatted,
          };
          this.songQueue.push(songInfo);
          //if there is no music in the queue, play the song. Else queue the song
          console.log(this.songQueue);
          if (this.songQueue[1] == undefined) {
            const connection = await this.getReadyConnection(
              message,
              voiceChannel
            );
            if (!connection) {
              return;
            }

            message.channel.send(
              `Joined channel \`${message.member.voice.channel.name}\``
            );
            await this.play(message, voiceChannel, connection);
          } else {
            message.channel.send(`queued ${songInfo.title}`);
          }
        } else {
          message.channel.send(
            "you need to give me a song name in order to let me play it!"
          );
        }
        break;
      case "queue":
      case "q":
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
            data.push(
              `Queue Position ${num}: \`${currentQueue[i].title}\`  [${currentQueue[i].duration}]`
            );
          }
          message.channel.send(data.join("\n"));
        }
        break;
      case "np":
        //check if there is a song in the queue
        if (this.songQueue[0] == undefined) {
          message.channel.send("there is currently no song playing!");
        } else {
          //display the first song in the queue
          const currentQueue = this.songQueue;
          message.channel.send(
            `Now Playing:\n  \`${currentQueue[0].title}\`  [${currentQueue[0].duration}]`
          );
          message.channel.send(currentQueue[0].url);
        }
        break;
      case "playlistadd":
      case "padd":
      case "pa":
        var givenPlaylists = args
          .filter((RawPlaylist) => RawPlaylist.startsWith(playlistPrefix))
          .map((RawPlaylist) => RawPlaylist.slice(1))[0];
        if (!givenPlaylists) {
          message.channel.send(
            `please enter a playist name with prefix \`${playlistPrefix}\`.`
          );
          const collectorFilter  = (response) => {
            // You can apply a filter to determine which messages you want to collect.
            // For example, you can check if the response is from a specific user.
            return response.author.id === message.author.id;
          };
          while (!givenPlaylists) {
            givenPlaylists = await message.channel
              .awaitMessages(
                {filter: collectorFilter,
                  max:1 , time: 30000, errors: ['time']}
              )
              .then((collected) => {
                //check if user want to cancel search
                if (collected.first().content == "cancel") {
                  message.channel.send(
                    ":white_check_mark: successfuly canceled"
                  );
                  return "cancel";
                }
                //check if user's responce is valid
                if (
                  collected.first().content.startsWith(playlistPrefix) == true
                ) {
                  return collected
                    .first()
                    .content.substring(playlistPrefix.length);
                } else {
                  message.channel.send(
                    `please enter a playlist name with prefix${playlistPrefix}`
                  );
                  return;
                }
              })
              .catch((err) => {
                console.log(err);
              });
          }
        }
        if (givenPlaylists == "cancel") return;
        const dbPlaylist = await playlistTable.findOne({
          where: { playlist: givenPlaylists },
        });
        if (dbPlaylist == undefined) {
          await this.newPlaylist(message, playlistTable, givenPlaylists);
        }
        let searchName;
        
        while (searchName !== "leave") {
          message.channel.send(
            "enter a song name to search and add it into the playlist. Type leave to exit."
          );
          searchName = await message.channel
            .awaitMessages(
              (response) => response.author.id === message.author.id,
              { max: 1 }
            )
            .then((collected) => {
              //check if user want to cancel search
              if (collected.first().content == "leave") {
                message.channel.send(":white_check_mark: exit");
              }
              return collected.first().content;
            })
            .catch((err) => {
              console.log(err);
            });
          if (searchName == "leave") break;
          const searchResult = await this.searchyt(message, searchName, true);
          //failure message already sent by searchyt, nothing to choose from
          if (searchResult.length == 0) break;
          this.musicSearchState = true;
          //wait for the user to chose the version to play
          const searchLimit = (await this.getsearchoptions()).limit;
          //create userchoice and wait for user to choose a version of the song
          let Userchoice;
          const filter = (response) => {
            // You can apply a filter to determine which messages you want to collect.
            // For example, you can check if the response is from a specific user.
            return response.author.id === message.author.id;
          };
          while (!Userchoice) {
            Userchoice = message.channel
              .awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }
              )
              .then((collected) => {
                //check if user want to cancel search
                if (collected.first().content == "cancel") {
                  message.channel.send(
                    ":white_check_mark: successfuly canceled"
                  );
                  return "cancel";
                }
                //check if user's responce is valid
                const number = parseInt(collected.first().content);
                if (number <= searchLimit && number !== 0) {
                  return parseInt(collected.first().content);
                } else {
                  message.channel.send(
                    `please enter a valid number under or equal to ${searchLimit}`
                  );
                  return;
                }
              })
              .catch((err) => {
                console.log(err);
              });
          }
          //set the search state to false to reenable music command
          this.musicSearchState = false;
          //check if user canceled the search
          if (Userchoice !== "cancel") {
            //set the song info
            const psongInfo = searchResult[Userchoice - 1];
            await this.newPlaylistSong(
              message,
              playlistSongTable,
              givenPlaylists,
              psongInfo
            );
          }
        }
        break;
      case "playlistinfo":
      case "playlisti":
      case "pli":
        let Playlist = args
          .filter((RawPlaylist) => RawPlaylist.startsWith(playlistPrefix))
          .map((RawPlaylist) => RawPlaylist.slice(1))[0];
        const data = [];
        if (Playlist == undefined) {
          const playlistList = await playlistTable.findAll({
            attributes: ["playlist"],
          });
          const playlistArray = playlistList.map((t) => t.playlist);
          if (playlistArray.length) {
            for (var i = 0; playlistArray[i] !== undefined; i++) {
              const playlistListTable = await playlistTable.findOne({
                where: { playlist: playlistArray[i] },
              });
              data.push(
                `- Playlist :\`${playlistPrefix}${playlistListTable.playlist}\`\n   Description:  ${playlistListTable.playlistDescription}`
              );
            }
            //send the retrived info
            console.log(data);
            message.channel.send(data.join("\n"));
          } else {
            message.channel.send(
              "there is currently no songs in any playlist."
            );
          }
        } else {
          data.push(`Songs in playlist\`${playlistPrefix}${Playlist}\`:`);
          //get all id of uploaded documents into an array
          const songList = await playlistSongTable.findAll({
            where: { playlist: Playlist },
          });
          const songArray = songList.map((t) => t.songName);
          console.log(songArray);
          if (songArray.length) {
            for (var i = 0; songArray[i] !== undefined; i++) {
              const song = await playlistSongTable.findOne({
                where: { songName: songArray[i] },
              });
              //get brief inforOnemation from each document
              data.push(
                `-${song.songName}  \*${song.songDuration}\*  id:  ${song.id}.`
              );
            }
            //send the retrived info
            console.log(data);
            message.channel.send(data.join("\n"));
          } else {
            message.channel.send("QAQ can't find the Playlist");
          }
        }
        break;
      case "skip":
        if (this.songQueue[0] == undefined) {
          message.reply(`there is no song to skip!`);
        } else {
          this.songQueue.shift();
          const connection = await this.getReadyConnection(message, voiceChannel);
          if (!connection) {
            return;
          }
          await this.play(message, voiceChannel, connection);
        }
        break;
      case "shuffle":
        //shuffle the queue
        if (this.songQueue[2] == undefined) {
          message.channel.send("there are not enough songs for a shuffle");
        } else {
          const nowPlaying = this.songQueue.shift();
          let shuffleQueue = this.songQueue;
          this.songQueue = [];
          this.songQueue.push(nowPlaying);
          //Randomize the songs in the shuffleArray
          for (let i = shuffleQueue.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [shuffleQueue[i], shuffleQueue[j]] = [
              shuffleQueue[j],
              shuffleQueue[i],
            ];
          }
          for (let i = 0; i < shuffleQueue.length; i++) {
            this.songQueue.push(shuffleQueue[i]);
          }
          message.channel.send(":ok_hand: shuffled queue");
        }
        break;
      case "playlistsongdelete":
      case "psd":
        let deletePlaylist = args.shift().toLowerCase();
        let deleteSongId = args.join(" ");
        if (!deletePlaylist.startsWith(playlistPrefix)) {
          message.channel.send(
            `please enter a playlist with prefix \`${playlistPrefix}\``
          );
          break;
        }
        deletePlaylist = deletePlaylist.substr(playlistPrefix.length);
        //get the target song info
        const delSongInfo = await playlistSongTable.findOne({
          where: {
            id: deleteSongId,
            playlist: deletePlaylist,
          },
        });
        if (delSongInfo) {
          //if target sonf is found, delete it and return delete information
          const rowCount = await playlistSongTable.destroy({
            where: {
              songName: delSongInfo.songName,
              playlist: delSongInfo.playlist,
            },
          });
          message.channel.send(
            `deleted ${delSongInfo.songName} in playlist ${playlistPrefix}${delSongInfo.playlist}`
          );
        } else {
          message.reply("can't find the song/playlist");
          break;
        }
        break;
      case "playlistdelete":
      case "pd":
        const delPlaylist = args
          .filter((RawPlaylist) => RawPlaylist.startsWith(playlistPrefix))
          .map((RawPlaylist) => RawPlaylist.slice(1))[0];
        console.log(delPlaylist);
        const delPlaylistInfo = await playlistTable.findOne({
          where: { playlist: delPlaylist },
        });
        if (delPlaylistInfo) {
          //if target document found, delete it and return delete information
          const rowCount = await playlistTable.destroy({
            where: { playlist: delPlaylistInfo.playlist },
          });
          console.log(rowCount);
          message.channel.send(
            `deleted playlist: \`${playlistPrefix}${delPlaylistInfo.playlist}\``
          );
        } else {
          message.reply("can't find the song/playlist");
          break;
        }
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
      message.channel.send(
        "I need the permissions `'connect'` and `'speak'` to join and play music in your voice channel!"
      );
      return;
    }
    return voiceChannel;
  },
  async getReadyConnection(message, voiceChannel) {
    let connection = getVoiceConnection(voiceChannel.guild.id);

    if (
      connection &&
      connection.joinConfig &&
      connection.joinConfig.channelId !== voiceChannel.id
    ) {
      connection.destroy();
      connection = undefined;
    }

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
    }

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15000);
      return connection;
    } catch (error) {
      console.log("Voice connection not ready within 15s.", error);
      if (connection) {
        connection.destroy();
      }
      await message.channel.send(
        "Failed to establish the voice connection. Please try the command again in a moment."
      );
      return null;
    }
  },
  //set the play option. will be changed in future updates to db
  async getsearchoptions() {
    const searchoptions = {
      limit: 8,
      volume: 5,
    };
    return searchoptions;
  },
  //format a duration given in seconds into m:ss (or h:mm:ss)
  formatDuration(seconds) {
    if (seconds == null || isNaN(seconds)) return "LIVE";
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  },
  //search given song name or whatever in youtube using yt-dlp
  async searchyt(message, playArgument, state) {
    var options = await this.getsearchoptions();
    const limit = options.limit;

    //Search via yt-dlp (same engine used for playback). Unlike youtube-sr,
    //a single malformed result does not crash the whole search.
    let searchResult = [];
    try {
      const { stdout } = await ytdlp.exec(
        `ytsearch${limit}:${playArgument}`,
        {
          dumpJson: true,
          flatPlaylist: true,
          noWarnings: true,
          ignoreErrors: true,
        },
        { stdio: ["ignore", "pipe", "ignore"] }
      );
      searchResult = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .map((video) => ({
          id: video.id,
          title: video.title,
          durationFormatted: this.formatDuration(video.duration),
        }));
    } catch (err) {
      console.log(err);
    }
    console.log("searchresult");
    console.log(searchResult);

    const data = [];
    //check if need to list all the songs
    if (state == true) {
      if (searchResult.length == 0) {
        message.channel.send(`failed to find song \`${playArgument}\``);
        return searchResult;
      }
      data.push(`**Search results:**\n`);
      for (let i = 0; i < searchResult.length; i++) {
        const num = i + 1;
        data.push(
          `\`${num}\`.  -  ${searchResult[i].title}  [${searchResult[i].durationFormatted}]`
        );
      }
      data.push("\nType a number to chose a song, Type `cancel` to exit");
      message.channel.send(data.join("\n"));
    }

    return searchResult;
  },
  //play the song using ytdl
  async play(message, voiceChannel, connection) {
    //leave if there is no more song in the queue
    if (this.songQueue[0] == undefined) {
      connection.destroy();
      return;
    }
    try {
      //get the first song in the queue and play it
      const songPlay = this.songQueue[0];
      const ytdlpProc = ytdlp.exec(songPlay.url, {
        format: "bestaudio",
        quiet: true,
        output: "-",
      }, { stdio: ["ignore", "pipe", "ignore"] });
      const resource = createAudioResource(ytdlpProc.stdout);
      const audioPlayer = createAudioPlayer();
      connection.subscribe(audioPlayer);
      audioPlayer.play(resource);
      console.log(connection)
      audioPlayer.on('error', error => {
          console.error(error);
      });
      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        this.songQueue.shift();
        this.play(message, voiceChannel, connection);
        });



      message.channel.send(`now playing \:notes: \`${songPlay.title}\``);
      console.log(`playing: ${songPlay.title}`);
    } catch (err) {
      console.log(err);
      return;
    }
  },
  async playlistSongTableInit(sqliteDB) {
    const playlistSongTable = sqliteDB.define("playlistSongTable", {
      songName: {
        unique: false,
        type: Sequelize.STRING,
      },
      songUrl: {
        unique: false,
        type: Sequelize.STRING,
      },
      songDuration: {
        unique: false,
        type: Sequelize.STRING,
      },
      songDescription: {
        type: Sequelize.STRING,
        unique: false,
      },
      playlist: {
        unique: false,
        type: Sequelize.STRING,
      },
    });
    //sync with the database
    await playlistSongTable
      .sync()
      .catch((err) => console.log(`InitplaylistSongTabelError:${err}`));
    return playlistSongTable;
  },
  async playlistTableInit(sqliteDB) {
    const playlistTable = sqliteDB.define("playlistTable", {
      playlist: {
        type: Sequelize.STRING,
        unique: true,
      },
      playlistDescription: {
        type: Sequelize.STRING,
      },
    });
    //sync with the database
    await playlistTable
      .sync()
      .catch((err) => console.log(`InitPlaylistTabelError:${err}`));
    return playlistTable;
  },
  async newPlaylist(message, playlistSongTable, playlistName) {
    var description;
    message.channel.send(
      `please enter some description about playlist ${playlistName}`
    );
    while (!description) {
      description = await message.channel
        .awaitMessages((response) => response.author.id === message.author.id, {
          max: 1,
        })
        .then((collected) => {
          //check if user's responce is valid
          return collected.first().content;
        })
        .catch((err) => {
          console.log(err);
        });
    }
    try {
      //log event in console
      console.log(`create playlist:${playlistName},${description}`);
      //create new Tag model in db
      const playlist = await playlistSongTable.create({
        playlist: playlistName,
        playlistDescription: description,
      });
      message.channel.send(
        `Playlist ${playlistPrefix}${playlist.get("playlist")} added.`
      );
    } catch (e) {
      if (e.name === "SequelizeUniqueConstraintError") {
        message.reply("That playlist already exists.");
      } else {
        message.reply("Something went wrong with adding a playlist.");
        console.log(e);
        return;
      }
    }
  },
  async newPlaylistSong(message, playlistSongTable, playlistName, songInfo) {
    const ifalready = await playlistSongTable.findOne({
      where: { songName: songInfo.title, playlist: playlistName },
    });
    if (!ifalready) {
      //Quick & dirty solution for formatting
      const SongUrl = "https://www.youtube.com/watch?v=" + songInfo.id;
      const newSong = await playlistSongTable
        .create({
          songName: songInfo.title,
          songUrl: SongUrl,
          songDuration: songInfo.durationFormatted,
          songDescription: songInfo.description,
          playlist: playlistName,
        })
        .catch((err) => {
          console.error(err);
        });
      console.log("ns" + newSong);
      message.channel.send(`added ${newSong.songName} to ${newSong.playlist}.`);
      return newSong;
    } else {
      message.channel.send(`that song already exists`);
      return;
    }
  },
};
