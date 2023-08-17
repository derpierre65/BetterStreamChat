let defaultColors = ['#FF0000', '#00FF00', '#B22222', '#FF7F50', '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E', '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F'];
let storageType = 'sync';

let twitchGlobalEmotes = {};
let bttvEmotes = {};
let bttvUsers = {};

const Helper = {
    getDefaultSettings() {
        return {
            general: {
                highlightWords: ''
            },
            trovo: {
                enabled: true,
                splitChat: false,
                enabledColors: true,
                experimentalScroll: false,
                fullName: true,
                hideAvatar: true,
                timestamp: true,
                timestampSeconds: false,
                fadeNewMessage: false,
                disableGifts: false,
                removeChatBackground: false,
                timestampFormat: 24, // 12/24
                fontSize: 12
            },
            youtube: {
                enabled: true,
                enabledColors: true,
                hideAvatar: true,
                badgeBeforeName: true,
                hideEngagementMessage: true,
                hidePaidMessages: false,
                hideMembershipMessages: false,
                timestampFormat: 12 // 12/24
            }
        };
    },
    fetch(...args) {
        return new Promise((resolve, reject) => {
            fetch(...args).then((response) => {
                response.json().then((json) => {
                    if (response.status === 200) {
                        resolve(json);
                    } else {
                        reject(json);
                    }
                });
            });
        });
    },
    getSettings() {
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined') {
                chrome.storage[storageType].get((items) => {
                    let defaultSettings = this.getDefaultSettings();
                    items = items || {};
                    // deep Object.assign
                    for (let key in defaultSettings) {
                        if (defaultSettings.hasOwnProperty(key)) {
                            items[key] = Object.assign(defaultSettings[key], items[key] || {});
                        }
                    }
                    resolve(items);
                });
            } else {
                reject('browser not supported?');
            }
        });
    },
    getUserChatColor(str) {
        str = str.toLowerCase().trim();

        if (str === 'derpierre65') {
            return '#1E90FF';
        }

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        return defaultColors[Math.abs(hash % defaultColors.length)];
    },
    getTime(date, format, showSeconds) {
        let timestamp;

        if (format.toString() === '12') {
            let hour = date.getHours();
            if (hour === 0) {
                hour = 12;
            } else if (hour > 12) {
                hour -= 12;
            }

            timestamp = ('0' + hour).slice(-2);
        } else {
            timestamp = ('0' + date.getHours()).slice(-2);
        }

        timestamp += ':' + ('0' + date.getMinutes()).slice(-2);

        if (showSeconds) {
            timestamp += ':' + ('0' + date.getSeconds()).slice(-2);
        }

        return timestamp;
    },
    Twitch: {
        getUserID(username) {
            return Helper.fetch('https://api.twitch.tv/kraken/users?login=' + username, {
                headers: {
                    'Client-ID': 'd25rzn77s7qfk0b16un4su9mxjv0ge1',
                    Accept: 'application/vnd.twitchtv.v5+json'
                }
            }).then((data) => {
                return data.users;
            });
        },
        fetchGlobalEmotes(items) {
            return new Promise((resolve) => {
                let done = () => {
                    try {
                        twitchGlobalEmotes = items.globalTwitchEmotes.emotes;
                    }
                    catch (error) {
                        // do nothing here
                    }

                    resolve();
                };

                if (typeof items === 'undefined' || typeof items.globalTwitchEmotes === 'undefined' || items.globalTwitchEmotes === null || Date.now() - items.globalTwitchEmotes.lastUpdate > 3 * 24 * 3600 * 1000) {
                    Helper
                        .fetch('https://raw.githubusercontent.com/derpierre65/BetterStreamChat/main/data/twitch.json')
                        .then((data) => {
                            items.globalTwitchEmotes = {
                                lastUpdate: Date.now(),
                                emotes: Object.create(null),
                            };

                            for (let emote of data) {
                                if (emote.code.match(/^[a-zA-Z0-9]+$/)) {
                                    items.globalTwitchEmotes.emotes[emote.code] = emote.id;
                                }
                            }

                            chrome.storage.local.set({ globalTwitchEmotes: items.globalTwitchEmotes }, () => done());
                        })
                        .catch(done);
                } else {
                    done();
                }
            });
        }
    },
    BTTV: {
        isBusy: false,
        emotes: {},
        updateSettings() {
            let bttvEmoteList = BetterStreamChat.settingsDiv.querySelector(' #bttvEmoteList');
            bttvEmoteList.textContent = '';
            for (let emote in this.emotes) {
                if (this.emotes.hasOwnProperty(emote)) {
                    let li = document.createElement('li');
                    let img = document.createElement('img');
                    let span = document.createElement('span');
                    span.textContent = emote;
                    img.src = 'https://cdn.betterttv.net/emote/' + this.emotes[emote] + '/3x';
                    li.classList.add('emoteCard');
                    li.append(img);
                    li.append(span);
                    bttvEmoteList.append(li);
                }
            }

            let list = BetterStreamChat.settingsDiv.querySelector('#bttvUserList');
            list.textContent = '';
            for (let userID in bttvUsers) {
                if (bttvUsers.hasOwnProperty(userID)) {
                    this.addUserToList(userID, list);
                }
            }
        },
        loaded() {
            chrome.storage.onChanged.addListener(async function (changes, namespace) {
                if (namespace === 'local') {
                    Helper.BTTV.update();
                } else if (namespace === 'sync') {
                    settings = await Helper.getSettings();
                    BetterStreamChat.update();
                }
            });
        },
        fetchGlobalEmotes(items) {
            return new Promise((resolve) => {
                let bttvEmotes = items.bttvEmotes || {};
                let bttvUsers = items.bttvUsers || {};
                if (typeof bttvUsers.global === 'undefined' || Date.now() - bttvUsers.global.lastUpdate > 604800000) {
                    return fetch('https://api.betterttv.net/3/cached/emotes/global').then((response) => {
                        if (response.status === 200) {
                            return response.json();
                        } else {
                            return Promise.reject();
                        }
                    }).then((data) => {
                        bttvEmotes.global = {};
                        for (let emote of data) {
                            bttvEmotes.global[emote.code] = emote.id;
                        }
                    }).finally(() => {
                        bttvUsers.global = {
                            lastUpdate: Date.now()
                        };
                        items.bttvUsers = bttvUsers;
                        items.bttvEmotes = bttvEmotes;
                        chrome.storage.local.set({bttvUsers, bttvEmotes}, () => resolve());
                    });
                } else {
                    resolve();
                }
            });
        },
        update() {
            return new Promise((resolve) => {
                chrome.storage.local.get((items) => {
                    Helper.Twitch.fetchGlobalEmotes(items).finally(() => {
                        this.fetchGlobalEmotes(items).finally(() => {
                            bttvEmotes = items.bttvEmotes;
                            bttvUsers = items.bttvUsers;

                            let emotes = {};
                            for (let userID in items.bttvEmotes) {
                                if (items.bttvEmotes.hasOwnProperty(userID)) {
                                    for (let emoteCode in items.bttvEmotes[userID]) {
                                        if (items.bttvEmotes[userID].hasOwnProperty(emoteCode)) {
                                            emotes[emoteCode] = items.bttvEmotes[userID][emoteCode];
                                        }
                                    }
                                }
                            }
                            this.emotes = emotes;
                            this.updateSettings();
                            resolve();
                        });
                    });
                });
            });
        },
        replaceText(text) {
            let split = text.split(' ');
            let newText = [];
            for (let word of split) {
                if (this.emotes[word]) {
                    word = `<img style="vertical-align: middle" src="https://cdn.betterttv.net/emote/${this.emotes[word]}/1x" alt="${word}" title="${word}" />`;
                } else if (twitchGlobalEmotes[word]) {
                    word = `<img style="vertical-align: middle" src="https://static-cdn.jtvnw.net/emoticons/v2/${twitchGlobalEmotes[word]}/static/dark/1.0" alt="${word}" title="${word}" />`;
                }

                newText.push(word);
            }

            return newText.join(' ');
        },
        getUserEmotes(userID) {
            return Helper.fetch('https://api.betterttv.net/3/cached/users/twitch/' + userID);
        },
        updateUserChannelEmotes(userID, username) {
            return this.getUserEmotes(userID).then((bttvData) => {
                return this.updateEmotes(userID, bttvData);
            }).then(() => {
                return Helper.BTTV.addUser(userID, username);
            }).catch(() => {
                return Promise.reject('User has no BetterTTV.');
            });
        },
        updateEmotes(userID, bttvData) {
            bttvEmotes[userID] = {};

            let emoteList = [];
            if (Array.isArray(bttvData.channelEmotes)) {
                emoteList = emoteList.concat(bttvData.channelEmotes);
            }
            if (Array.isArray(bttvData.sharedEmotes)) {
                emoteList = emoteList.concat(bttvData.sharedEmotes);
            }

            for (let emote of emoteList) {
                bttvEmotes[userID][emote.code] = emote.id;
            }
        },
        addUser(userID, username) {
            if (typeof userID === 'string') {
                userID = parseInt(userID);
            }

            return new Promise((resolve) => {
                let addUser = typeof bttvUsers[userID] === 'undefined';

                bttvUsers[userID] = {username, lastUpdate: Date.now()}; // update
                chrome.storage.local.set({bttvUsers, bttvEmotes}, () => {
                    if (addUser) {
                        this.addUserToList(userID);
                    }
                    resolve();
                });
            });
        },
        tryAddUser() {
            let userElement = BetterStreamChat.settingsDiv.querySelector('#bttvAddUser');
            let button = BetterStreamChat.settingsDiv.querySelector('#bttvAddUserBtn');
            let username = userElement.value.trim();
            if (!username.length) {
                return;
            }

            if (this.isBusy) {
                return;
            }

            userElement.setAttribute('disabled', 'disabled');
            button.setAttribute('disabled', 'disabled');
            this.isBusy = true;
            let beforeEmotes = Object.keys(this.emotes).length;
            let userID;
            Helper.Twitch.getUserID(username).then((data) => {
                if (data.length) {
                    userID = data[0]._id;
                    username = data[0].display_name;
                    if (typeof bttvUsers[userID] !== 'undefined') {
                        return Promise.reject('User already in list');
                    }

                    return this.updateUserChannelEmotes(userID, data[0].display_name);
                } else {
                    return Promise.reject('Twitch user not found');
                }
            }).then(() => {
                return Helper.BTTV.update();
            }).then(() => {
                let newEmotes = Object.keys(Helper.BTTV.emotes).length - beforeEmotes;
                Helper.Settings.showMessage('User ' + username + ' and ' + newEmotes + ' emotes added.');
            }).catch((err) => {
                Helper.Settings.showMessage(err, 'error');
            }).finally(() => {
                userElement.value = '';
                userElement.removeAttribute('disabled');
                button.removeAttribute('disabled');
                this.isBusy = false;
            });
        },
        addUserToList(userID, list) {
            list = list || BetterStreamChat.settingsDiv.querySelector('#bttvUserList');
            if (userID === 'global') {
                return;
            }

            let user = bttvUsers[userID];
            let li = document.createElement('li');
            li.id = 'bttvUser' + userID;
            li.textContent = user.username + ' (last update: ' + (new Date(user.lastUpdate)).toLocaleString() + ')';
            list.append(li);
        }
    },
    Settings: {
        messageTimeout: null,
        availableSettings: {
            general: {
                highlightWords: {
                    title: 'Highlight words',
                    description: 'Use spaces in the field to specify multiple keywords.',
                    type: 'text'
                }
            },
            trovo: {
                enabled: {
                    title: 'Trovo settings',
                    type: 'boolean',
                    onChange: (newValue) => {
                        if (newValue && !BetterStreamChat.activeInstance) {
                            BetterStreamChat.install('trovo');
                        } else if (!newValue && BetterStreamChat.activeInstance) {
                            BetterStreamChat.uninstall();
                        }
                    }
                },
                splitChat: {
                    title: 'Split Chat',
                    description: 'Alternates backgrounds between messages in chat to improve readability',
                    type: 'boolean'
                },
                removeChatBackground: {
                    title: 'Remove Chat Background',
                    description: 'Remove the custom chat background in chat.',
                    type: 'boolean',
                },
                enabledColors: {
                    title: 'User Chat color',
                    description: 'Enable different chat colors for users.',
                    type: 'boolean'
                },
                experimentalScroll: {
                    title: 'Experimental Scroll Fix',
                    description: 'This is the future scroll fix for the trovo scroll issue, you can test the new fix with this option.',
                    type: 'boolean'
                },
                fullName: {
                    title: 'Full name',
                    description: 'Show complete username in chat.',
                    type: 'boolean'
                },
                hideAvatar: {
                    title: 'Hide avatars',
                    description: '',
                    type: 'boolean'
                },
                timestamp: {
                    title: 'Timestamp',
                    description: 'Show the timestamp before the nickname.',
                    type: 'boolean'
                },
                timestampSeconds: {
                    title: 'Timestamp seconds',
                    description: 'Show the seconds in timestamp.',
                    type: 'boolean'
                },
                disableGifts: {
                    title: 'Disable gift messages',
                    type: 'boolean'
                },
                fadeNewMessage: {
                    title: 'Fade new messages',
                    description: 'This option can enhance readability, but it is maybe bad for streams with many participants.',
                    type: 'boolean'
                },
                timestampFormat: {
                    title: 'Timestamp format',
                    type: 'select',
                    items: [{value: 12, label: '01:33:37 (12-hour clock)'}, {
                        value: 24,
                        label: '13:33:37 (24-hour clock)'
                    }]
                },
                // Show real viewer number
                fontSize: {
                    title: 'Font size',
                    type: 'number',
                    min: 6,
                    max: 40
                }
            },
            youtube: {
                enabled: {
                    title: 'YouTube settings',
                    type: 'boolean'
                },
                enabledColors: {
                    title: 'Chat colors',
                    description: 'Enable different chat colors for users.',
                    type: 'boolean'
                },
                hideAvatar: {
                    title: 'Hide avatars',
                    description: '',
                    type: 'boolean'
                },
                hidePaidMessages: {
                    title: 'Hide paid messages',
                    description: '',
                    type: 'boolean'
                },
                hideMembershipMessages: {
                    title: 'Hide membership messages',
                    description: '',
                    type: 'boolean'
                },
                hideEngagementMessage: {
                    title: 'Hide engagement message',
                    description: '',
                    type: 'boolean'
                },
                badgeBeforeName: {
                    title: 'Move badge before username',
                    description: '',
                    type: 'boolean'
                },
                timestampFormat: {
                    title: 'Timestamp format',
                    description: 'Timestamp must be enabled (24 hour clock remove the AM/PM).',
                    type: 'select',
                    items: [
                        {value: 12, label: '01:37 (12-hour clock)'},
                        {value: 24, label: '13:37 (24-hour clock)'}
                    ]
                }
            }
        },
        showMessage(message, type = 'success') {
            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }

            let statusElement = BetterStreamChat.settingsDiv.querySelector('#status');
            let textElement = statusElement.querySelector('p');
            textElement.innerHTML = message;
            textElement.classList.remove(...statusElement.classList);
            textElement.classList.add(type);
            statusElement.classList.add('active');
            let hide = () => {
                statusElement.removeEventListener('click', hide);
                statusElement.classList.remove('active');
                this.messageTimeout = null;
            };
            statusElement.addEventListener('click', hide);
            this.messageTimeout = setTimeout(hide, 2000);
        },
        _basic(title, description, formField) {
            return `<div class="option">
				<div class="labelField">
		            <span class="title">${title}</span><br />
		            <span class="description">${description || ''}</span>
				</div>
		        <div class="formField">${formField}</div>
			</div>`;
        },
        save(optionElements) {
            let newSettings = JSON.parse(JSON.stringify(settings));
            for (let option of optionElements) {
                if (!option.dataset.name) {
                    continue;
                }

                let split = option.dataset.name.split('_');
                let value = null;
                if (option.type === 'radio') {
                    value = option.checked && option.value === '1';
                } else if (option.type === 'checkbox') {
                    value = option.checked;
                } else if (option.dataset.type === 'number' || option.type === 'number') {
                    value = parseFloat(option.value);
                } else {
                    value = option.value;
                }

                if (!newSettings[split[0]]) {
                    newSettings[split[0]] = {};
                }

                newSettings[split[0]][split[1]] = value;

                let onChange = this.availableSettings[split[0]][split[1]].onChange;
                if (typeof onChange === 'function') {
                    onChange(value);
                }
            }

            chrome.storage[storageType].set(newSettings, () => {
                this.showMessage('Options maybe saved.');
            });
        },
        build(category) {
            let html = '';
            let categorySettings = this.availableSettings[category];
            for (let name in categorySettings) {
                if (categorySettings.hasOwnProperty(name)) {
                    let setting = categorySettings[name];
                    let type = setting.type;
                    let fieldName = category + '_' + name;
                    if (type === 'boolean') {
                        html += this.boolean(fieldName, setting.title, setting.description, settings[category][name]);
                    } else if (type === 'text') {
                        html += this.text(fieldName, setting.title, setting.description, settings[category][name]);
                    } else if (type === 'number') {
                        html += this.number(fieldName, setting.title, setting.description, settings[category][name], setting.min, setting.max);
                    } else if (type === 'select') {
                        html += this.select(fieldName, setting.title, setting.description, setting.items, settings[category][name]);
                    }
                }
            }

            return html;
        },
        boolean(name, title, description, defaultValue = false, yesButton = 'On', noButton = 'Off') {
            return this._basic(title, description, `<ol class="flexibleButtonGroup optionTypeBoolean">
				<li>
					<input type="radio" id="boolean_${name}" name="boolean_${name}" value="1" class="optionField" data-name="${name}" ${defaultValue ? 'checked' : ''}>
					<label for="boolean_${name}" class="green"><span class="icon icon16 fa-check"></span> ${yesButton}</label>
				</li>
				<li>
					<input type="radio" id="boolean_${name}_no" name="boolean_${name}" value="0" class="optionField" data-name="${name}" ${!defaultValue ? 'checked' : ''}>
					<label for="boolean_${name}_no" class="red"><span class="icon icon16 fa-times"></span> ${noButton}</label>
				</li>
			</ol>`);
        },
        text(name, title, description, defaultValue = '') {
            return this._basic(title, description, `<input type="text" class="optionField" data-name="${name}" value="${defaultValue}" />`);
        },
        number(name, title, description, defaultValue = '', min = 0, max = 0) {
            return this._basic(title, description, `<input type="number" class="optionField" data-name="${name}" value="${defaultValue}" ${min ? 'min="' + min + '" ' : ''}${max ? 'max="' + max + '"' : ''}/>`);
        },
        select(name, title, description, items = [], defaultValue = '') {
            let selectOptions = '';
            defaultValue = defaultValue.toString();
            for (let item of items) {
                selectOptions += `<option value="${item.value}"${item.value.toString() === defaultValue ? ' selected' : ''}>${item.label}</option>`;
            }
            return this._basic(title, description, `<select class="optionField" data-name="${name}">${selectOptions}</select>`);
        }
    }
};

let settings = Helper.getDefaultSettings();

// youtube stuff
const YouTube = {
    style: null,
    handleMessage(node) {
        if (settings.youtube.enabledColors) {
            let author = node.querySelector('#author-name');
            if (author) {
                author.style.color = Helper.getUserChatColor(author.textContent);
            }
        }

        let message = node.querySelector('#message');
        if (message) {
            message.innerHTML = Helper.BTTV.replaceText(message.innerHTML);
        }

        let timestamp = node.querySelector('#timestamp');
        if (settings.youtube.timestampFormat.toString() === '24' && timestamp) {
            let timestampText = timestamp.textContent;
            if (timestamp.textContent.toLowerCase().includes('pm')) {
                let split = timestamp.textContent.split(':');
                split[0] = (parseInt(split[0]) + 12).toString();
                timestampText = split.join(':');
            }

            timestamp.textContent = timestampText.replace(' PM', '').replace(' AM', '');
        }
    },
    init() {
        const chatQuerySelector = '#items.yt-live-chat-item-list-renderer';
        const init = (documentElement, target) => {
            if (target !== null) {
                this.document = documentElement;

                const observer = new MutationObserver((mutations) => {
                    for (let mutation of mutations) {
                        for (let node of mutation.addedNodes) {
                            this.handleMessage(node);
                        }
                    }
                });

                for (let element of this.document.querySelectorAll('yt-live-chat-text-message-renderer')) {
                    this.handleMessage(element);
                }

                const config = {attributes: true, childList: true, characterData: true};
                observer.observe(target, config);

                let isSetupSettingOptionDone = false;
                const setupSettingOption = () => {
                    if (isSetupSettingOptionDone) return;
                    const node = this.document.querySelector('yt-live-chat-app iron-dropdown.yt-live-chat-app, yt-live-chat-app tp-yt-iron-dropdown.yt-live-chat-app');
                    if (!node) return;
                    isSetupSettingOptionDone = true;
                    const paperItemTag = node.nodeName.toLowerCase() === 'iron-dropdown' ? 'paper-item' : 'tp-yt-paper-item';
                    const settingOption = this.document.createElement('div');
                    settingOption.style.cursor = 'pointer';
                    settingOption.innerHTML = `<${paperItemTag} class="style-scope" role="option" tabindex="0" aria-disabled="false">BetterStreamChat</${paperItemTag}>`;
                    node.querySelector('#items').appendChild(settingOption);
                    settingOption.addEventListener('click', () => {
                        BetterStreamChat.settingsDiv.style.display = 'block';
                        this.document.body.click(); // click on body to close the settings container lol
                    });
                    const popupRenderer = node.querySelector('ytd-menu-popup-renderer');
                    popupRenderer.style.removeProperty('max-height');
                }
                if (this.style && this.style.isConnected === false) this.style = null;

                if (this.style === null) {
                    setupSettingOption();
                    let settingObserver = new MutationObserver((mutations) => {
                        for (let mutation of mutations) {
                            for (let node of mutation.addedNodes) {
                                const nodeName = node.nodeName.toLowerCase()
                                if ((nodeName === 'iron-dropdown' || nodeName === 'tp-yt-iron-dropdown') && node.classList.contains('yt-live-chat-app')) {
                                    // i dont know why, but without the timeout the element doesn't appear :(
                                    setTimeout(setupSettingOption, 50);

                                    settingObserver.disconnect();
                                    return;
                                }
                            }
                        }
                    });
                    settingObserver.observe(this.document.querySelector('yt-live-chat-app'), {childList: true});

                    this.style = this.document.createElement('style');
                    this.style.type = 'text/css';
                    this.document.body.append(this.style);
                    this.update();
                }
            }
        };

        let target = document.querySelector(chatQuerySelector);
        // normal stream chat
        if (target === null) {
            let interval = setInterval(() => {
                let chatFrame = document.querySelector('#chatframe');
                if (chatFrame) {
                    let documentElement = chatFrame.contentDocument;
                    target = documentElement.querySelector(chatQuerySelector);

                    if (target !== null) {
                        clearInterval(interval);
                        init(documentElement, target);
                    }
                }
            }, 250);
        }
        // popout stream chat
        else {
            init(document, target);
        }
    },
    update() {
        let cssCode = ``;

        if (settings.youtube.hideMembershipMessages) {
            cssCode += `#items yt-live-chat-membership-item-renderer { display:none !important; }`;
        }

        if (settings.youtube.hidePaidMessages) {
            cssCode += '#items yt-live-chat-paid-message-renderer { display:none !important; }';
        }

        if (settings.youtube.hideAvatar) {
            cssCode += '#items yt-live-chat-text-message-renderer yt-img-shadow#author-photo { display:none !important; }';
        }

        if (settings.youtube.badgeBeforeName) {
            cssCode += `#items yt-live-chat-author-chip #author-name {order:2;}
				#items yt-live-chat-author-chip #chat-badges {order:1;margin-right:2px;}`;
        }

        if (settings.youtube.hideEngagementMessage) {
            cssCode += '#items yt-live-chat-viewer-engagement-message-renderer { display:none !important;}';
        }

        if (typeof this.style.styleSheet !== 'undefined') {
            this.style.styleSheet.cssText = cssCode;
        } else {
            this.style.innerHTML = '';
            this.style.appendChild(this.document.createTextNode(cssCode));
        }
    }
};

const BetterStreamChat = {
    activeInstance: null,
    settingsDiv: null,
    async init(platform) {
        document.body.classList.add(platform);

        //<editor-fold desc="changelog">
        let changelogLabels = {
            added: '<span class="label green">Added</span>',
            optimized: '<span class="label orange">Optimized</span>',
            changed: '<span class="label orange">Changed</span>',
            fixed: '<span class="label red">Fixed</span>',
            removed: '<span class="label red">Removed</span>'
        };
        let changelogList = [{
            version: '1.3.5',
            date: '2022-10-09',
            items: [{
                text: 'Fixed fade chat option (Trovo).',
                label: 'fixed'
            }]
        }, {
            version: '1.3.4',
            date: '2022-10-09',
            items: [{
                text: 'Twitch emotes are working again.',
                label: 'fixed'
            }, {
                text: 'Fixed chat padding if avatar is disabled (Trovo).',
                label: 'fixed'
            }, {
                text: 'Fixed delete gift message option (Trovo)',
                label: 'fixed'
            }]
        }, {
            version: '1.3.2',
            date: '2022-10-08',
            items: [{
                text: 'Fixed trovo Chat and settings menu',
                label: 'fixed'
            }, {
                text: 'Fixed highlighted messages in trovo chat',
                label: 'fixed'
            }]
        }, {
            version: '1.3.1',
            date: '2022-03-13',
            items: [{
                text: 'Added new option "Remove Chat Background" to remove custom chat backgrounds.',
                label: 'added'
            },{
                text: 'Fixed Timestamp for Trovo',
                label: 'fixed'
            }, {
                text: 'Fixed Trovo Chat',
                label: 'fixed'
            }]
        },{
            version: '1.2.2',
            date: '2020-08-07',
            items: [{
                text: 'Added the BetterStreamChat settings menu to the YouTube Chat Menu.',
                label: 'added'
            }]
        }, {
            version: '1.2.1',
            date: '2020-08-06',
            items: [{
                text: 'Trovo chat messages not handled by addon.',
                label: 'fixed'
            }]
        }, {
            version: '1.2.0',
            date: '2020-08-06',
            items: [{
                text: 'Twitch emotes on YouTube.',
                label: 'added'
            }, {
                text: 'New option to enable colors on YouTube.',
                label: 'added'
            }, {
                text: 'New option to hide avatars on YouTube.',
                label: 'added'
            }, {
                text: 'New option to hide paid messages on YouTube.',
                label: 'added'
            }, {
                text: 'New option to hide membership messages on YouTube.',
                label: 'added'
            }, {
                text: 'New option to hide engagement message on YouTube.',
                label: 'added'
            }, {
                text: 'New option to move the user badges before the username on YouTube.',
                label: 'added'
            }, {
                text: 'New option to change the timestamp on YouTube.',
                label: 'added'
            }, {
                text: 'Sometime the addon wasn\'t loaded on YouTube.',
                label: 'fixed'
            }, {
                text: 'Browser addon settings page (full integrated into Trovo/YouTube).',
                label: 'removed'
            }]
        }, {
            version: '1.1.2',
            date: '2020-07-10',
            items: [{
                text: 'New option for a message fade in effect.',
                label: 'added',
                issueID: 9
            }, {
                text: 'Maybe fixed the auto scroll bug completely.',
                label: 'optimized',
                issueID: 1
            }]
        }, {
            version: '1.1.1',
            date: '2020-07-10',
            items: [{
                text: 'Auto open settings tab for the current platform.',
                label: 'changed',
                issueID: 8
            }, {
                text: 'Fixed addon loading in Popout Chat in Trovo.',
                label: 'fixed'
            }]
        }, {
            version: '1.1.0',
            date: '2020-07-09',
            items: [{
                text: 'Option to disable BetterStreamChat on YouTube.',
                label: 'added'
            }, {
                text: 'Changed the settings menu and integrated to page.',
                label: 'changed'
            }, {
                text: 'The BetterStreamChat options are applied when switching the channel.',
                label: 'fixed',
                issueID: 3
            }, {
                text: 'Fixed the emote alignment.',
                label: 'fixed'
            }]
        }, {
            version: '1.0.10',
            date: '2020-07-03',
            items: [{
                text: 'Option with new experimental scroll fix (can be enabled in options)',
                label: 'added',
                issueID: 1
            }, {
                text: 'Twitch global emotes',
                label: 'added'
            }, {
                text: 'Fixed empty highlight words',
                label: 'fixed'
            }]
        }, {
            version: '1.0.9',
            date: '2020-07-03',
            items: [{
                text: 'New option for highlight words',
                label: 'added'
            }, {
                text: 'New option to enable the chat colors',
                label: 'added',
                issueID: 5
            }, {
                text: 'New option to add alternates backgrounds between messages in chat to improve readability (Split Chat)',
                label: 'added'
            }, {
                text: 'Removed color #0000FF',
                label: 'removed',
                issueID: 4
            }]
        }, {
            version: '1.0.8',
            date: '2020-07-03',
            items: [{
                text: 'New Option to add BTTV emotes from specific channel',
                label: 'added'
            }, {
                text: 'Static BTTV emotes',
                label: 'removed'
            }]
        }, {
            version: '1.0.7',
            date: '2020-07-01',
            items: [{
                text: 'Changed storage back to sync',
                label: 'fixed'
            }]
        }, {
            version: '1.0.6',
            date: '2020-07-01',
            items: [{
                text: 'New option to Hide gift messages',
                label: 'added'
            }]
        }, {
            version: '1.0.5',
            date: '2020-07-01',
            items: [{
                text: 'New option to change the time format (12 or 24 hour clock)',
                label: 'added'
            }]
        }, {
            version: '1.0.4',
            date: '2020-06-29',
            items: [{
                text: 'Tooltip to the BTTV emotes',
                label: 'added'
            }, {
                text: 'Maybe fixed the Trovo autoscroll bug',
                label: 'fixed'
            }]
        }, {
            version: '1.0.3',
            date: '2020-06-28',
            items: [{
                text: 'New option to change the font size',
                label: 'added'
            }]
        }, {
            version: '1.0.2',
            date: '2020-06-28',
            items: [{
                text: 'Some code optimization',
                label: 'optimized'
            }]
        }, {
            version: '1.0.1',
            date: '2020-06-28',
            items: [{
                text: 'Preview icons for chrome store.',
                label: 'added'
            }]
        }, {
            version: '1.0.0',
            date: '2020-06-28',
            items: [{
                text: 'Initial release'
            }]
        }];
        //</editor-fold>
        let changelogHtml = '';
        for (let changelog of changelogList) {
            changelogHtml += `<h2>${changelog.version} (${changelog.date})</h2><ul>`;
            for (let item of changelog.items) {
                if (item.label) {
                    let labelHtml = '';
                    let labels = item.label.split(' ');
                    for (let label of labels) {
                        labelHtml += changelogLabels[label];
                    }
                    item.text = labelHtml + ' ' + item.text;
                }

                if (item.issueID) {
                    item.text += ` (<a target="_blank" href="https://github.com/derpierre65/BetterStreamChat/issues/${item.issueID}">#${item.issueID}</a>)`;
                }
                changelogHtml += '<li>' + item.text + '</li>';
            }
            changelogHtml += '</ul>';
        }

        //<editor-fold desc="settings div">
        let settingsDiv = document.createElement('div');
        this.settingsDiv = settingsDiv;
        settingsDiv.style.display = 'none';
        settingsDiv.id = 'bscSettingsPanel';
        settingsDiv.innerHTML = `<div id="status"><p></p></div><header>
	        <ul class="nav">
	            <li><a data-tab="about">About</a></li>
	            <li><a data-tab="general">General</a></li>
	            <li><a data-tab="bttvSettings">BTTV</a></li>
	            <li class="${platform === 'trovo' ? 'active' : ''}"><a data-tab="trovoSettings">Trovo</a></li>
	            <li class="${platform === 'youtube' ? 'active' : ''}"><a data-tab="youtubeSettings">YouTube</a></li>
	            <li><a data-tab="changelog">Changelog</a></li>
	            <!--<li><a data-tab="backup">Backup/Import</a></li>-->
	        </ul>
	        <span class="close">×</span>
	    </header>
	    <main class="text" data-tab="about">
            soon<br><br>
		</main>
		<main data-tab="general">
			${Helper.Settings.build('general')}
		</main>
		<main class="text" data-tab="bttvSettings">
			<h2>Channels</h2>
			<ul id="bttvUserList"></ul>

			<h4 style="margin-top:10px;">Add new channel (Twitch username)</h4>
			<div>
				<input type="text" id="bttvAddUser" />
				<button id="bttvAddUserBtn">+</button>
			</div>

			<small>ability to update/remove user coming soon</small>
			
			<h2>Available BetterTTV emotes</h2>
			<ul id="bttvEmoteList"></ul>
		</main>
		<main class="${platform === 'trovo' ? 'active' : ''}" data-tab="trovoSettings">
			${Helper.Settings.build('trovo')}
		</main>
		<main class="${platform === 'youtube' ? 'active' : ''}" data-tab="youtubeSettings">
			${Helper.Settings.build('youtube')}
		</main>
	    <main class="text" data-tab="changelog">
	        <h1>Changelog</h1>
	        ${changelogHtml}
		</main>
		<footer>
	        <span>BetterStreamChat ${changelogList[0].version} (${changelogList[0].date})</span>
	        <span style="float:right;">
	            <a href="https://discord.gg/Zg4VQXZ7MG" target="_blank">Discord</a> | 
	            <a href="https://github.com/derpierre65/BetterStreamChat/issues/new?labels=bug" target="_blank">Bug report</a> |
			    <a href="https://github.com/derpierre65/BetterStreamChat/issues/new?labels=enhancement" target="_blank">Feature request</a>
	        </span>
	    </footer>`;
        document.body.append(settingsDiv);
        //</editor-fold>

        // bttv events
        settingsDiv.querySelector('#bttvAddUserBtn').addEventListener('click', () => {
            Helper.BTTV.tryAddUser();
        });
        settingsDiv.querySelector('#bttvAddUser').addEventListener('keyup', (event) => {
            if (event.key !== 'Enter') {
                return;
            }

            Helper.BTTV.tryAddUser();
        });

        // close event
        settingsDiv.querySelector('.close').addEventListener('click', () => settingsDiv.style.display = 'none');

        // navigation
        for (let navItem of settingsDiv.querySelectorAll('ul.nav > li > a')) {
            navItem.addEventListener('click', ({target}) => {
                let links = settingsDiv.querySelectorAll('ul.nav > li');
                let tabs = settingsDiv.querySelectorAll('main');
                for (let element of [...tabs, ...links]) {
                    element.classList.remove('active');
                }

                target.parentNode.classList.add('active');
                settingsDiv.querySelector('main[data-tab="' + target.dataset.tab + '"]').classList.add('active');
            });
        }

        // change event
        for (let option of settingsDiv.querySelectorAll('.optionField')) {
            option.addEventListener('change', (event) => {
                Helper.Settings.save([event.target]);
            });
        }

        // load bttv/twitch emotes
        await Helper.BTTV.update();
        Helper.BTTV.loaded();

        let isEnabled = settings[platform].enabled;
        if (!isEnabled) {
            return;
        }

        this.install(platform);
    },
    install(platform) {
        if (platform === 'trovo') {
            this.activeInstance = Trovo;
        } else if (platform === 'youtube') {
            this.activeInstance = YouTube;
        } else {
            return;
        }

        this.activeInstance.init();
    },
    uninstall() {
        this.activeInstance.uninstall();
        this.activeInstance = null;
    },
    update() {
        if (this.activeInstance) {
            this.activeInstance.update();
        }
    }
};

// trovo stuff
const Trovo = {
    style: null,
    settingObserver: null,
    chatObserver: null,
    pageChangeObserver: null,
    readMoreObserver: null,
    handleMessage(node) {
        if (settings.trovo.disableGifts && (node.classList.contains('gift-message') || node.querySelector('.gift-message'))) {
            node.remove();
            return;
        }

        node = node.classList.contains('message-user') ? node : node.querySelector('.message-user')

        if (node) {
            let nickname = node.querySelector('.nick-name');
            let realname = nickname.getAttribute('title');
            if (settings.trovo.enabledColors) {
                nickname.style.color = Helper.getUserChatColor(realname);
            }
            if (settings.trovo.fullName) {
                nickname.textContent = realname;
            }
            if (settings.trovo.timestamp) {
                let span = document.createElement('span');
                let splits = node.id.split('_');
                let date = splits.length === 1 ? new Date() : new Date(parseInt(splits[0].substr(0, 13)));
                span.style.fontSize = '12px';

                let timestamp = Helper.getTime(date, settings.trovo.timestampFormat, settings.trovo.timestampSeconds);

                span.innerHTML = timestamp + '&nbsp;';
                let contentWrap = node.querySelector('.content-wrap');
                contentWrap.firstElementChild.insertAdjacentElement('afterend', span);
            }

            let content = node.querySelector('.content');
            if (content !== null) {
                let texts = node.querySelectorAll('.text');
                for (let el of texts) {
                    el.innerHTML = Helper.BTTV.replaceText(el.innerHTML);
                }

                // after inserted the emotes check the highlight words
                let highlightWords = settings.general.highlightWords.trim().split(' ').filter((word) => word);
                let contentText = content.textContent.toLowerCase();

                if (highlightWords.length >= 1) {
                    for (let idx = 0; idx < highlightWords.length; idx++) {
                        highlightWords[idx] = highlightWords[idx].toLowerCase().trim();
                    }

                    for (let word of highlightWords) {
                        if (word.length && contentText.includes(word)) {
                            node.classList.add('message-highlighted');
                            break;
                        }
                    }
                }
            }
        }

        if (node && settings.trovo.enabledColors) {
            for (let el of node.querySelectorAll('.at.text')) {
                let name = el.textContent.substring(1);
                el.style.color = Helper.getUserChatColor(name);
            }
        }

        // set message css class from settings
        if (node && settings.trovo.fadeNewMessage) {
            // find message-comp div
            let messageComponent = node;
            while (messageComponent && !messageComponent.classList.contains('message-comp')) {
                messageComponent = messageComponent.parentElement;
            }

            messageComponent.classList.add('bsc-fade');
        }
    },
    async init() {
        // check if page was changed
        let baseContainer = document.querySelector('.base-container');
        if (baseContainer) {
            let oldHref = document.location.href;
            this.pageChangeObserver = new MutationObserver((mutations) => {
                // dont know if length === 2 is so nice TODO improve
                if (mutations.length === 2 && document.location.href !== oldHref) {
                    oldHref = document.location.href;
                    this.applySettings();
                }
            });
            this.pageChangeObserver.observe(document.querySelector('.base-container'), {childList: true});
        }

        this.style = document.createElement('style');
        this.style.type = 'text/css';
        document.body.append(this.style);
        this.update();
        this.applySettings();

        // update viewer count every 5s
        /*window.setInterval(() => {
            console.log('update interval');
            try {
                let liveInfo = document.querySelector('#live-fullscreen .li-wrap');
                console.log(liveInfo, liveInfo.__vue__);
                if (liveInfo && liveInfo.__vue__) {
                    console.log('lol');
                    liveInfo.querySelector('.viewer span').textContent = liveInfo.__vue__.liveInfo.channelInfo.viewers;
                }
            }
            catch (e) {
                console.log('error queryselector');
            }
        }, 5000);*/
    },
    uninstall() {
        if (this.settingObserver) {
            this.settingObserver.disconnect();
            this.settingObserver = null;
        }
        if (this.chatObserver) {
            this.chatObserver.disconnect();
            this.chatObserver = null;
        }
        if (this.readMoreObserver) {
            this.readMoreObserver.disconnect();
            this.readMoreObserver = null;
        }

        this.pageChangeObserver.disconnect();
        this.pageChangeObserver = null;

        this.style.remove();
        this.style = null;
    },
    applySettings() {
        if (this.settingObserver) {
            this.settingObserver.disconnect();
            this.settingObserver = null;
        }

        if (this.chatObserver) {
            this.chatObserver.disconnect();
            this.chatObserver = null;
        }

        // create new observer if setting-container exists
        const inputPanelContainerSelector = '.input-panels-container';
        const settingsContainer = document.querySelector(inputPanelContainerSelector);
        if (settingsContainer) {
            let chatList = document.querySelector('.chat-list-wrap');
            this.chatObserver = new MutationObserver((mutations) => {
                for (let mutation of mutations) {
                    for (let node of mutation.addedNodes) {
                        if (!node.classList || !node.classList.contains('message-comp')) {
                            continue;
                        }

                        if (settings.trovo.experimentalScroll) {
                            this.handleMessage(node);
                        }
                        else {
                            // dirty fix for stupid auto scroll
                            window.setTimeout(() => this.handleMessage(node), 50);
                        }
                    }
                }

                if (settings.trovo.experimentalScroll) {
                    if (chatList.scrollHeight - chatList.scrollTop - chatList.offsetHeight === 0) {
                        let readMoreButton = document.querySelector('.read-tip');
                        if (readMoreButton) {
                            readMoreButton.click();
                        }
                    }
                }
            });
            this.settingObserver = new MutationObserver((mutations) => {
                for (let mutation of mutations) {
                    if (this.readMoreObserver) {
                        for (let node of mutation.removedNodes) {
                            if (!node.classList) {
                                continue;
                            }

                            if (node.classList.contains('read-tip')) {
                                this.readMoreObserver.disconnect();
                                this.readMoreObserver = null;
                            }
                        }
                    }

                    for (let node of mutation.addedNodes) {
                        if (!node.classList) {
                            continue;
                        }

                        if (node.classList.contains('read-tip')) {
                            if (this.readMoreObserver === null) {
                                // read tip changed
                                this.readMoreObserver = new MutationObserver((mutations) => {
                                    let scrollPosition = chatList.scrollHeight - chatList.scrollTop - chatList.offsetHeight;
                                    if (scrollPosition === 0 || scrollPosition < chatList.lastChild.offsetHeight) {
                                        let moreMessageElement = document.querySelector('.read-tip');
                                        if (moreMessageElement) {
                                            moreMessageElement.click();
                                        }
                                    }
                                });
                                this.readMoreObserver.observe(node, { attributes: true });
                            }
                        }

                        if (node.classList.contains('transition-slide-up-enter')) {
                            let menuDiv = document.createElement('div');
                            let spacerDiv = document.createElement('div');
                            spacerDiv.innerHTML = '<hr />';
                            menuDiv.innerHTML = '<div class="setting-row cursor-pointer"><span style="margin-left: 24px;">BetterStreamChat</span></div>';
                            let settingsContainer = document.querySelector('.setting-container');
                            if (settingsContainer) {
                                settingsContainer.append(spacerDiv);
                                settingsContainer.append(menuDiv);
                                menuDiv.addEventListener('click', () => {
                                    BetterStreamChat.settingsDiv.style.display = 'block';
                                    document.body.click(); // click on body to close the settings container lol
                                });
                            }
                        }
                    }
                }
            });
            this.settingObserver.observe(settingsContainer, { childList: true });
            this.chatObserver.observe(chatList, { childList: true, subtree: true });
        }
        else {
            const applySettingsInterval = window.setInterval(() => {
                if (document.querySelector(inputPanelContainerSelector)) {
                    window.clearInterval(applySettingsInterval);
                    this.applySettings();
                }
            }, 50);
        }
    },
    update() {
        let cssCode = `.chat-list-wrap .message * {
			font-size: ${settings.trovo.fontSize}px !important;
		}
		.chat-list-wrap .message-user {
			margin: 0;
		}
		.message-comp .gift-message {
			padding: 0;
			margin: 2px 0;
		}
		.message-comp .message-highlighted {
		    background-color: rgba(255, 0, 0, 0.3) !important;
	    }`;

        if (settings.trovo.splitChat) {
            cssCode += `.chat-list .message-comp:nth-child(2n) {
				background-color: #dcdcdc;
		    }
		    body.base-dark-mode .chat-list .message-comp:nth-child(2n) {
				background-color: #1f1925;
		    }`;
        }

        if (settings.trovo.hideAvatar) {
            cssCode += `.chat-list .message-comp .avatar {
                display:none;
            }
            .chat-list .message {
                padding-left:0 !important;
            }`;
        }

        if (settings.trovo.fadeNewMessage) {
            cssCode += `body.trovo .message-comp {
                opacity: 0;
            }
            body.trovo .message-comp.bsc-fade {
                opacity: 1;
                animation-name: BetterStreamChatFadeInOpacity;
                animation-iteration-count: 1;
                animation-timing-function: linear;
                animation-duration: 100ms;
            }`;
        }

        if (settings.trovo.removeChatBackground) {
            cssCode += '.chat-list-wrap { background-image: none; }';
        }

        if (typeof this.style.styleSheet !== 'undefined') {
            this.style.styleSheet.cssText = cssCode;
        } else {
            this.style.innerHTML = '';
            this.style.appendChild(document.createTextNode(cssCode));
        }
    }
};

// initialization
let initialize = async () => {
    console.log('[BetterStreamChat] Initializing...');
    // do non settings page stuff
    try {
        settings = await Helper.getSettings();
        if (typeof settings === 'undefined') {
            settings = Helper.getDefaultSettings();
        }
    } catch (error) {
        console.log('[BetterStreamChat] Settings initialize failed:', error);
    }

    // init trovo
    if (location.hostname.toLowerCase() === 'trovo.live') {
        BetterStreamChat.init('trovo');
    }
    // init youtube
    else if (location.hostname.toLowerCase().includes('youtube.com')) {
        BetterStreamChat.init('youtube');
    } else {
        for (let option of document.querySelectorAll('.optionField')) {
            let property = option.type === 'checkbox' ? 'checked' : 'value';
            let split = option.dataset.name.split('_');
            option[property] = settings[split[0]][split[1]];
        }

        for (let element of document.querySelectorAll('.enableOption')) {
            let changedEvent = () => {
                if (element.dataset.name) {
                    let streamPlatform = element.dataset.name.split('_')[0];
                    document.querySelector(`#${streamPlatform}Settings`).style.display = element.checked ? 'block' : 'none';
                }
            };
            element.addEventListener('change', changedEvent);
            changedEvent();
        }

        document.body.style.display = '';

        document.getElementById('save').addEventListener('click', () => {
            Helper.Settings.save(document.querySelectorAll('.optionField'));
        });
    }
};

if (location.hostname.toLowerCase().includes('.')) {
    initialize();
} else {
    document.addEventListener('DOMContentLoaded', initialize);
}
