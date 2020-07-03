let defaultColors = ['#FF0000', '#0000FF', '#00FF00', '#B22222', '#FF7F50', '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E', '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F'];
let storageType = 'sync';

const Helper = {
	getDefaultSettings() {
		return {
			trovo: {
				fullName: true,
				hideAvatar: true,
				timestamp: true,
				timestampSeconds: false,
				disableGifts: false,
				timestampFormat: 24, // 12/24
				fontSize: 12
			}
		};
	},
	getSettings() {
		return new Promise((resolve, reject) => {
			if (typeof chrome !== 'undefined') {
				chrome.storage[storageType].get(this.getDefaultSettings(), resolve);
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

		if (format === 12) {
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
	BTTV: {
		emotes: {},
		loaded() {
			// do nothing - callback for option page
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
					this.fetchGlobalEmotes(items).finally(() => {
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
						resolve();
					});
				});
			});
		},
		replaceText(text) {
			let split = text.split(' ');
			let newText = [];
			for (let word of split) {
				if (this.emotes[word]) {
					word = '<img src="https://cdn.betterttv.net/emote/' + this.emotes[word] + '/1x" alt="' + word + '" title="' + word + '" />';
				}

				newText.push(word);
			}

			return newText.join(' ');
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
	}
};

// trovo stuff
const Trovo = {
	async init() {
		function handleMessage(node) {
			if (settings.trovo.hideAvatar) {
				let avatar = node.querySelector('.avatar');
				if (avatar) {
					avatar.remove();
				}
			}
			if (node.classList.contains('message-user')) {
				let nickname = node.querySelector('.nick-name');
				let realname = nickname.getAttribute('title');
				nickname.style.color = Helper.getUserChatColor(realname);
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
				}
			}

			for (let el of node.querySelectorAll('.at.text')) {
				let name = el.innerText.substr(1);
				el.style.color = Helper.getUserChatColor(name);
			}
		}

		const observer = new MutationObserver(function (mutations) {
			for (let mutation of mutations) {
				for (let node of mutation.addedNodes) {
					window.setTimeout(() => handleMessage(node), 50); // maybe dirty temp fix for stupid auto scroll
				}
			}
		});

		observer.observe(document.querySelector('.chat-list-wrap'), { attributes: true, childList: true, characterData: true });

		let style = document.createElement('style');
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
		`;

		if (settings.trovo.disableGifts) {
			cssCode += `.chat-list-wrap li.message.gift-message {
				display: none;
			}`;
		}

		style.type = 'text/css';
		if (typeof style.styleSheet !== 'undefined') {
			style.styleSheet.cssText = cssCode;
		}
		else {
			style.appendChild(document.createTextNode(cssCode));
		}
		document.body.append(style);

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
	}
};

// initialization
let initialize = () => {
	let settingsPage = false;

	// update emote list
	Helper.BTTV.update().then(() => {
		Helper.BTTV.loaded();
	});

	const start = () => {
		// init trovo
		if (location.hostname.toLowerCase() === 'trovo.live') {
			Trovo.init();
		}
		// init youtube
		else if (location.hostname.toLowerCase().includes('youtube.com')) {
			YouTube.init();
		}
		else {
			settingsPage = true;

			function saveOptions() {
				let settings = {
					trovo: {
						fullName: document.getElementById('trovoFullName').checked,
						hideAvatar: document.getElementById('trovoHideAvatar').checked,
						timestamp: document.getElementById('trovoShowTimestamp').checked,
						timestampSeconds: document.getElementById('trovoShowTimestampSeconds').checked,
						disableGifts: document.getElementById('trovoDisableGifts').checked,
						fontSize: document.getElementById('trovoFontSize').value,
						timestampFormat: parseInt(document.getElementById('trovoTimestampFormat').value)
						// showRealViewers: document.getElementById('trovoShowRealViewers').checked
					}
				};

				chrome.storage[storageType].set(settings, function () {
					Settings.showMessage('options maybe saved');
				});
			}

			function restoreOptions() {
				Helper.getSettings().then((items) => {
					document.getElementById('trovoFullName').checked = items.trovo.fullName;
					document.getElementById('trovoHideAvatar').checked = items.trovo.hideAvatar;
					document.getElementById('trovoShowTimestamp').checked = items.trovo.timestamp;
					document.getElementById('trovoShowTimestampSeconds').checked = items.trovo.timestampSeconds;
					document.getElementById('trovoDisableGifts').checked = items.trovo.disableGifts;
					document.getElementById('trovoFontSize').value = items.trovo.fontSize;
					document.getElementById('trovoTimestampFormat').value = items.trovo.timestampFormat;
					// document.getElementById('trovoShowRealViewers').checked = items.trovo.showRealViewers;
				});
			}

			restoreOptions();
			document.getElementById('save').addEventListener('click', saveOptions);
		}
	};

	// do non settings page stuff
	if (!settingsPage) {
		(async function () {
			chrome.storage.onChanged.addListener(async function (changes, namespace) {
				if (namespace === 'local') {
					Helper.BTTV.update(); // update emotes
				}
				else if (namespace === 'sync') {
					settings = await Helper.getSettings();
				}
			});

			try {
				settings = await Helper.getSettings();
				if (typeof settings === 'undefined') {
					settings = Helper.getDefaultSettings();
				}
			}
			catch (e) {
				console.log('catch', e);
			}

			start();
		})();
	}
};

if (location.hostname.toLowerCase().includes('.')) {
	initialize();
}
else {
	document.addEventListener('DOMContentLoaded', initialize);
}