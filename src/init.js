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
				disableGifts: false,
				timestampFormat: 24, // 12/24
				fontSize: 12
			},
			youtube: {
				enabled: true
			}
		};
	},
	fetch(...args) {
		return new Promise((resolve, reject) => {
			fetch(...args).then((response) => {
				response.json().then((json) => {
					if (response.status === 200) {
						resolve(json);
					}
					else {
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
			}
			else {
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
			}
			else if (hour > 12) {
				hour -= 12;
			}

			timestamp = ('0' + hour).slice(-2);
		}
		else {
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
					twitchGlobalEmotes = items.globalTwitchEmotes.emotes;
					resolve();
				};

				if (typeof items.globalTwitchEmotes === 'undefined' || items.globalTwitchEmotes === null || Date.now() - items.globalTwitchEmotes.lastUpdate > 604800000) {
					Helper.fetch('https://api.twitchemotes.com/api/v4/channels/0').then((data) => {
						items.globalTwitchEmotes = {
							lastUpdate: Date.now(),
							emotes: {}
						};
						for (let emote of data.emotes) {
							if (emote.code.match(/^[a-zA-Z0-9]+$/)) {
								items.globalTwitchEmotes.emotes[emote.code] = emote.id;
							}
						}
						chrome.storage.local.set({ globalTwitchEmotes: items.globalTwitchEmotes }, () => done());
					}).catch(done);
				}
				else {
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
			bttvEmoteList.innerText = '';
			for (let emote in this.emotes) {
				if (this.emotes.hasOwnProperty(emote)) {
					let li = document.createElement('li');
					let img = document.createElement('img');
					let span = document.createElement('span');
					span.innerText = emote;
					img.src = 'https://cdn.betterttv.net/emote/' + this.emotes[emote] + '/3x';
					li.classList.add('emoteCard');
					li.append(img);
					li.append(span);
					bttvEmoteList.append(li);
				}
			}

			let list = BetterStreamChat.settingsDiv.querySelector('#bttvUserList');
			list.innerText = '';
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
				}
				else if (namespace === 'sync') {
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
						}
						else {
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
						chrome.storage.local.set({ bttvUsers, bttvEmotes }, () => resolve());
					});
				}
				else {
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
					word = '<img style="vertical-align: middle" src="https://cdn.betterttv.net/emote/' + this.emotes[word] + '/1x" alt="' + word + '" title="' + word + '" />';
				}
				else if (twitchGlobalEmotes[word]) {
					word = '<img style="vertical-align: middle" src="https://static-cdn.jtvnw.net/emoticons/v1/' + twitchGlobalEmotes[word] + '/1.0" alt="' + word + '" title="' + word + '" />';
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

				bttvUsers[userID] = { username, lastUpdate: Date.now() }; // update
				chrome.storage.local.set({ bttvUsers, bttvEmotes }, () => {
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
				}
				else {
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
			li.innerText = user.username + ' (last update: ' + (new Date(user.lastUpdate)).toLocaleString() + ')';
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
						}
						else if (!newValue && BetterStreamChat.activeInstance) {
							BetterStreamChat.uninstall();
						}
					}
				},
				splitChat: {
					title: 'Split Chat',
					description: 'Alternates backgrounds between messages in chat to improve readability',
					type: 'boolean'
				},
				enabledColors: {
					title: 'Chat colors',
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
					title: 'Hide avatar',
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
				timestampFormat: {
					title: 'Timestamp format',
					type: 'select',
					items: [{ value: 12, label: '01:33:37 (12-hour clock)' }, { value: 24, label: '13:33:37 (24-hour clock)' }]
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
				}
				else if (option.type === 'checkbox') {
					value = option.checked;
				}
				else if (option.dataset.type === 'number' || option.type === 'number') {
					value = parseFloat(option.value);
				}
				else {
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
				this.showMessage('options maybe saved');
			});
		},
		build(category) {
			let html = '';
			let categorySettings = this.availableSettings[category];
			for (let name in categorySettings) {
				if (categorySettings.hasOwnProperty(name)) {
					let setting = categorySettings[name];
					let type = setting.type;
					if (type === 'boolean') {
						html += this.boolean(category + '_' + name, setting.title, setting.description, settings[category][name]);
					}
					else if (type === 'text') {
						html += this.text(category + '_' + name, setting.title, setting.description, settings[category][name]);
					}
					else if (type === 'number') {
						html += this.number(category + '_' + name, setting.title, setting.description, settings[category][name], setting.min, setting.max);
					}
					else if (type === 'select') {
						html += this.select(category + '_' + name, setting.title, setting.description, setting.items, settings[category][name]);
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
	init() {
		const chatQuerySelector = '#items.yt-live-chat-item-list-renderer';

		function init(documentElement, target) {
			if (target !== null) {
				function setAuthorColor(node) {
					let author = node.querySelector('#author-name');
					if (author) {
						author.style.color = Helper.getUserChatColor(author.innerText);
					}
				}

				const observer = new MutationObserver(function (mutations) {
					for (let mutation of mutations) {
						for (let node of mutation.addedNodes) {
							setAuthorColor(node);
						}
					}
				});

				for (let element of documentElement.querySelectorAll('yt-live-chat-text-message-renderer')) {
					setAuthorColor(element);
				}

				const config = { attributes: true, childList: true, characterData: true };
				observer.observe(target, config);
			}
		}

		let target = document.querySelector(chatQuerySelector);
		if (target === null) {
			const bodyObserver = new MutationObserver(function (mutations) {
				let chatFrame = document.querySelector('#chatframe');
				if (chatFrame) {
					bodyObserver.disconnect();
					let documentElement = chatFrame.contentDocument;
					target = documentElement.querySelector(chatQuerySelector);
					init(documentElement, target);
				}
			});

			const config = { childList: true };
			bodyObserver.observe(document.querySelector('body'), config);
		}
		else {
			init(document, target);
		}
	},
	update() {
		// currently do nothing
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
			version: '1.1.2',
			date: '2020-07-10',
			items: [{
				text: 'Maybe fixed the auto scroll bug completely.',
				label: 'optimized',
				issueID: 1
			}]
		}, {
			version: '1.1.1',
			date: '2020-07-10',
			items: [{
				text: 'Auto open settings tab for the current platform.',
				label: 'changed'
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
            soon
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
	            <a href="https://discord.gg/WwTcjzN" target="_blank">Discord</a> | <a href="https://github.com/derpierre65/BetterStreamChat/issues/new?labels=bug" target="_blank">Bug report</a> | <a href="https://github.com/derpierre65/BetterStreamChat/issues/new?labels=enhancement" target="_blank">Feature request</a>
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
			navItem.addEventListener('click', ({ target }) => {
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
		}
		else if (platform === 'youtube') {
			this.activeInstance = YouTube;
		}
		else {
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
		if (node.classList.contains('gift-message') && settings.trovo.disableGifts) {
			node.remove();
		}

		if (node.classList.contains('message-user')) {
			let nickname = node.querySelector('.nick-name');
			let realname = nickname.getAttribute('title');
			if (settings.trovo.enabledColors) {
				nickname.style.color = Helper.getUserChatColor(realname);
			}
			if (settings.trovo.fullName) {
				nickname.innerText = realname;
			}
			if (settings.trovo.timestamp) {
				let span = document.createElement('span');
				let splits = node.id.split('_');
				let date = splits.length === 1 ? new Date() : new Date(parseInt(splits[0]));
				span.style.fontSize = '12px';

				let timestamp = Helper.getTime(date, settings.trovo.timestampFormat, settings.trovo.timestampSeconds);

				span.innerHTML = timestamp + '&nbsp;';
				let contentWrap = node.querySelector('.content-wrap');
				contentWrap.insertBefore(span, contentWrap.firstChild);
			}

			let content = node.querySelector('.content');
			if (content !== null) {
				let texts = node.querySelectorAll('.text');
				for (let el of texts) {
					el.innerHTML = Helper.BTTV.replaceText(el.innerHTML);
				}

				// after inserted the emotes check the highlight words
				let highlightWords = settings.general.highlightWords.trim().split(' ');
				let contentText = content.innerText.toLowerCase();

				if (highlightWords.length > 1 || highlightWords[0].length !== 0) {
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

		if (settings.trovo.enabledColors) {
			for (let el of node.querySelectorAll('.at.text')) {
				let name = el.innerText.substr(1);
				el.style.color = Helper.getUserChatColor(name);
			}
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
			this.pageChangeObserver.observe(document.querySelector('.base-container'), { childList: true });
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
					liveInfo.querySelector('.viewer span').innerText = liveInfo.__vue__.liveInfo.channelInfo.viewers;
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

		if (this.chatoBobserver) {
			this.chatoBobserver.disconnect();
			this.chatoBobserver = null;
		}

		// create new observer if setting-container exists
		let settingsContainer = document.querySelector('.input-panels-container');
		if (settingsContainer) {
			let chatList = document.querySelector('.chat-list-wrap');
			this.chatoBobserver = new MutationObserver((mutations) => {
				for (let mutation of mutations) {
					for (let node of mutation.addedNodes) {
						if (settings.trovo.experimentalScroll) {
							this.handleMessage(node);
						}
						else {
							window.setTimeout(() => this.handleMessage(node), 50); // maybe dirty temp fix for stupid auto scroll
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
					for (let node of mutation.removedNodes) {
						if (node.classList) {
							if (node.classList.contains('read-tip')) {
								this.readMoreObserver.disconnect();
								this.readMoreObserver = null;
							}
						}
					}
					for (let node of mutation.addedNodes) {
						if (node.classList) {
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
				}
			});
			this.settingObserver.observe(settingsContainer, { childList: true });
			this.chatoBobserver.observe(chatList, { attributes: true, childList: true, characterData: true });
		}
	},
	update() {
		let cssCode = `
		.chat-list-wrap .message * {
			font-size: ${settings.trovo.fontSize}px !important;
		}
		.chat-list-wrap .message-user {
			margin: 0;
		}
		.message.gift-message {
			padding: 0;
			margin: 2px 0;
		}
		.message.message-highlighted {
		    background-color: rgba(255, 0, 0, 0.3) !important;
	    }`;

		if (settings.trovo.splitChat) {
			cssCode += `.chat-list-wrap .message:nth-child(2n) {
				background-color: #dcdcdc;
		    }
		    body.base-dark-mode .chat-list-wrap .message:nth-child(2n) {
				background-color: #1f1925;
		    }`;
		}

		if (settings.trovo.hideAvatar) {
			cssCode += `.chat-list-wrap .message .avatar { display:none; }`;
		}

		if (typeof this.style.styleSheet !== 'undefined') {
			this.style.styleSheet.cssText = cssCode;
		}
		else {
			this.style.innerHTML = '';
			this.style.appendChild(document.createTextNode(cssCode));
		}
	}
};

// initialization
let initialize = async () => {

	// do non settings page stuff
	try {
		settings = await Helper.getSettings();
		if (typeof settings === 'undefined') {
			settings = Helper.getDefaultSettings();
		}
	}
	catch (e) {
		console.log('catch', e);
	}

	// init trovo
	if (location.hostname.toLowerCase() === 'trovo.live') {
		BetterStreamChat.init('trovo');
	}
	// init youtube
	else if (location.hostname.toLowerCase().includes('youtube.com')) {
		BetterStreamChat.init('youtube');
	}
	else {
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
}
else {
	document.addEventListener('DOMContentLoaded', initialize);
}