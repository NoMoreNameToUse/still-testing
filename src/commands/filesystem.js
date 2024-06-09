//Load Sequelize, an object-relational-mapper(ORM) for database usage
const Sequelize = require('sequelize');
//Load discord.js Module
const Discord = require('discord.js');
//Load configuration 
const config = require('../../config/config.json');
//Load Operators from sequelize 
const Op = Sequelize.Op;
//Select tag prefix
const tagPrefix = '#'

module.exports = {
    name: 'filesystem',
    usage: '<hello>',
    description: 'get your files up and ready! ',
    aliases: ['fs'],
    args: false,
    guildOnly: false,
    category: 'Utility',
    async execute(message, args, sqliteDB) {
        if (!args.length) return;
        const documentTable = await this.documentTableInit(sqliteDB);
        const tagTable = await this.tagTableInit(sqliteDB);
        const documentTagTable = await this.documentTagTableInit(sqliteDB);
        const subCommand = args.shift().toLowerCase();
        //switch from if/else to switch statement for better preformence 
        switch (subCommand) {
            //Import a file 
            case 'new': case 'touch':
                //get the attachment from the user
                const attachment = message.attachments.map(attachment => { return attachment; });
                if (attachment.length == 0) {
                    message.reply(`you didn't provide an attachment`);
                    return;
                }
                //get the file type and name seperated and put into an array 
                const docName = (attachment[0].name).trim().split('.');
                const docType = docName[docName.length - 1];
                //init the process, ask for description
                await message.channel.send(`Process started!\n please provide some Information about "${attachment[0].name}"`)
                //await user enter description
                const description = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
                    .then(collected => {
                        return collected.first().content;
                    })
                    .catch(err => {
                        console.log(err)
                    });
                console.log(`AskDescriptionAnswer:${description}`)
                //ask for Tags
                await message.channel.send(`description set !\n maybe add some tags for better tracking?`)
                //await user enter tags 
                const Tags = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
                    .then(collected => {
                        return (collected.first().content).trim().split(/ +/).filter(Rawtag => Rawtag.startsWith(tagPrefix)).map(Rawtag => Rawtag.slice(1));
                    })
                    .catch(err => {
                        console.log(err)
                    });
                //for testing
                console.log(`AskTagsAnswer:${Tags}`)
                //get exist tags and compare 
                const existTags = await this.tagInfo(tagTable);
                //create tags when no tags was found 
                if (existTags == 'No tags set.') {
                    await message.channel.send(`There is currently no tag created.`)
                    for (var i = 0; i < Tags.length; i++) {
                        await this.createTag(message, tagTable, Tags[i]);
                    };
                }
                else {
                    //compare tags with existing tags, create none existing tags
                    console.log(`existTags:${existTags}`)
                    var tagDifference = Tags.filter(tag => existTags.indexOf(tag) === -1);
                    console.log(`DiffTag:${tagDifference}`)
                    if (tagDifference != undefined) {
                        for (var i = 0; i < tagDifference.length; i++) {
                            await this.createTag(message, tagTable, tagDifference[i]);
                        };
                    }
                }
                //put document information into db
                newDoc = await this.createDocument(message, documentTable, attachment, docType, description)
                newDocId = newDoc.get('messageId')
                newDocName = newDoc.get('documentName')
                console.log(`${newDocName} created! ID: ${newDocId}`)
                //tag the documents into db 
                for (var i = 0; i < Tags.length; i++) {
                    await this.documentAddTag(documentTagTable, newDocId, Tags[i]).catch(err => { console.log(err) });
                }
                message.channel.send(`successfuly added ${Tags} to the document ${newDocName},document ID:${newDocId}`)
                break;
            case 'ls': case 'show':
                const data = [];
                data.push(`Uploaded Files:`)
                //get all id of uploaded documents into an array 
                const docList = await documentTable.findAll({ attributes: ['messageId'] });
                const docArray = docList.map(t => t.messageId)
                console.log(docList)
                console.log(docArray)
                if (docArray.length) {
                    for (var i = 0; i < docArray.length; i++) {
                        //get brief information from each document
                        const rawDocTags = await documentTagTable.findAll({ where: { taggedDocumentsId: docArray[i] } })
                        const docTags = rawDocTags.map(t => t.tagName).join(', #');
                        const docName = (await documentTable.findOne({ where: { messageId: docArray[i] } })).get('documentName')
                        data.push(`-ID:${docArray[i]}: Name :${docName} with #${docTags}`)
                    };
                    //send the retrived info
                    message.channel.send(data);
                } else {
                    message.channel.send('there is currently no files uploaded');
                }
                break;
            case 'info':
                //get the id of target document
                infoDocId = args.shift().toLowerCase()
                //get brief information from target document and send it
                const info = await documentTable.findOne({ where: { messageId: infoDocId } });
                if (info) {
                    message.channel.send(`Information about ${info.documentName} with ID ${info.messageId}:\n Uploaded by <@${info.uploaderId}> at ${info.createdAt}.\n File type: ${info.documentType} \n Description: ${info.documentDescription}`);
                    const dsAttachment = new Discord.MessageAttachment(info.documentLink);
                    await message.channel.send(dsAttachment)
                    return 
                    
                }
                break;
            case 'search':
                //check if argument is provided 
                if (!args.length) { message.reply('required keywords'); break; }
                //find and get mentiond tags into array 
                const searchTag = args.filter(Rawtag => Rawtag.startsWith(tagPrefix)).map(Rawtag => Rawtag.slice(1));
                //if tags are given, find all documents with those tags and send it 
                if (searchTag.length) {
                    for (var i = 0; i < searchTag.length; i++) {
                        const taggedDocument = await documentTagTable.findAll({ where: { tagName: searchTag[i] } });
                        const documentIdString = taggedDocument.map(t => t.taggedDocumentsId);
                        console.log(documentIdString)
                        for (let e = 0; e < documentIdString.length; e++) {
                            const documents = await documentTable.findOne({ where: { messageId: documentIdString[e] } });
                            const dsAttachment = new Discord.MessageAttachment(documents.get('documentLink'));
                            await message.reply(`Tag detected! Search results:\n Rank: ${e}\n Description: ${documents.get('documentDescription')}\n File type: ${documents.get('documentType')} \n #${searchTag[i]}`);
                            await message.channel.send(dsAttachment);
                        };
                    }
                    break;
                }
                //else check for keyword, get documents info and send it
                else {
                    //keword check
                    const searchArgument = (`%${args.toString()}%`)
                    const searchResult = await documentTable.findAll({
                        where: {
                            [Op.or]: [
                                { documentName: { [Op.like]: searchArgument } },
                                { documentDescription: { [Op.like]: searchArgument } },
                                { documentType: { [Op.like]: searchArgument } }]
                        }
                    }).catch(err => { console.log(`search error: ${err}`) })
                    findResult = searchResult.map(result => { return result; });
                    console.log(searchResult)
                    //send documents 
                    if (findResult.length > 0) {
                        for (var i = 0; i < findResult.length; i++) {
                            const dsAttachment = new Discord.MessageAttachment(findResult[i].get('documentLink'));
                            message.reply(`Search results:\n Rank: ${i}\n Description: ${findResult[i].get('documentDescription')}\n File type: ${findResult[i].get('documentType')}`);
                            message.reply(dsAttachment);
                        }
                    }
                    else {
                        message.reply(`sorry, there seems to be no file that match the search (╯°□°）╯︵ ┻━┻`);
                    }
                }

                break;
            case 'delete': case 'del': case 'remove':
                //get the target document id  
                deleteId = args.shift().toLowerCase();
                //get the target document info  
                const delFileInfo = await documentTable.findOne({ where: { messageId: deleteId } });
                if (delFileInfo) {
                    //if target document found, delete it and return delete information
                    const rowCount = await documentTable.destroy({ where: { messageId: deleteId } });
                    const tagCount = await documentTagTable.destroy({ where: { taggedDocumentsId: deleteId } });
                    message.channel.send(`File  ${delFileInfo.documentName} with ID ${delFileInfo.messageId}(${rowCount}) deleted. ${tagCount} associated tags deleted`);
                }
                else {
                    message.reply('That tag did not exist.');
                    break;
                }
                break;
            case 'tag':
                //check if argument is provided 
                if (!args.length) return;
                const subsubCommand = args.shift().toLowerCase();
                //scwich the subcommand cases 
                switch (subsubCommand) {
                    case 'show': case 'all':
                        //display all tags 
                        const tagString = await this.tagInfo(tagTable);
                        message.channel.send(`List of tags: ${tagString}`)
                        break;
                    case 'new': case 'create':
                        //create new tag
                        if (!args.length) {
                            message.channel.send(`Please write down the name of the Tag that you want to create!`)
                            break;
                        }
                        const Tag = args.shift().toLowerCase();
                        if (Tag.startsWith(tagPrefix) == true) {
                            const newTagName = Tag.slice(tagPrefix.length);
                            await this.createTag(message, tagTable, newTagName, documentTagTable);
                        }
                        else {
                            message.channel.send(`please enter a tag that start with \`${tagPrefix}\`.`)
                        }
                        break;
                    default:
                        message.reply(`please provide a valiad argument!`);
                        return;
                }
                break;
            default:
                message.reply(`please provide a valiad argument!`);
                return;
        }
    },
    //Init the db modle where the document info will be stored 
    async documentTableInit(sqliteDB) {
        const documentTable = sqliteDB.define('document', {
            documentName: {
                unique: false,
                type: Sequelize.STRING
            },
            documentDescription: {
                unique: false,
                type: Sequelize.TEXT
            },
            documentType: {
                unique: false,
                type: Sequelize.STRING
            },
            uploaderId: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: false
            },
            messageId: {
                unique: true,
                type: Sequelize.STRING
            },
            documentLink: {
                unique: false,
                type: Sequelize.STRING
            },
        });
        //sync with the database 
        await documentTable.sync().catch(err => console.log(`InitDocumentTabelError:${err}`));
        return documentTable;
    },
    //Init the db modle where the tags will be stored 
    async tagTableInit(sqliteDB) {
        const tagTable = sqliteDB.define('tagTable', {
            tagName: {
                type: Sequelize.STRING,
                unique: true,
            },
            tagDescription: {
                type: Sequelize.STRING,
            },
        });
        //sync with the database 
        await tagTable.sync().catch(err => console.log(`InitTagTabelError:${err}`));
        return tagTable;
    },
    //Init the db modle where the document tags will be stored  
    async documentTagTableInit(sqliteDB) {
        const documentTagTable = sqliteDB.define('documentTagTable', {
            tagName: {
                type: Sequelize.STRING,
            },
            taggedDocumentsId: {
                type: Sequelize.STRING,
            },
        });
        //sync with the database 
        await documentTagTable.sync().catch(err => console.log(`InitTagTabelError:${err}`));
        return documentTagTable;
    },
    //return a string with the name of all the tags   
    async tagInfo(tagTable) {
        const tagList = await tagTable.findAll({ attributes: ['tagName'] });
        const tagString = tagList.map(t => t.tagName).join(', ') || 'No tags set.';
        return tagString;
    },
    //create a new tag 
    async createTag(message, tagTable, newTagName) {
        await message.channel.send(`tag creating! please give ${newTagName} a discription!`)
        const newTagDescription = await message.channel.awaitMessages(response => response.author.id === message.author.id, { max: 1 })
            .then(collected => {
                return collected.first().content;
            })
            .catch(err => {
                console.log(err)
            });
        try {
            //log event in console
            console.log(`create tag:${newTagName},${newTagDescription}`)
            //create new Tag model in db
            const tag = await tagTable.create({
                tagName: newTagName,
                tagDescription: newTagDescription,
            });
            message.channel.send(`Tag ${tag.get('tagName')} added.`);
        }
        catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                message.reply('That tag already exists.');
            }
            else {
                message.reply('Something went wrong with adding a tag.');
                console.log(e);
            }
        }
    },
    //put document info into db
    async createDocument(message, documentTable, attachment, docType, docDescription) {
        const newdocument = await documentTable.create({
            documentName: attachment[0].name,
            documentDescription: docDescription,
            documentType: docType,
            uploaderId: message.author.id,
            messageId: message.id,
            documentLink: attachment[0].url,
        }).catch(err => {
            console.error(err);
        });
        console.log(newdocument.get('messageId'))
        return newdocument;
    },
    //associate tag with document id 
    async documentAddTag(documentTagTable, docId, addtagName) {
        try {
            const addedTag = await documentTagTable.create({
                tagName: addtagName,
                taggedDocumentsId: docId,
            });
            return addedTag;
        }
        catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                message.reply('That tag already exists.');
            }
            else {
                message.reply('Something went wrong with adding a tag.');
                console.log(e);
            }
        }
    }
};