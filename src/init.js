let defaultColors = ['#FF0000', '#0000FF', '#00FF00', '#B22222', '#FF7F50', '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E', '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F'];

const Helper = {
	getSettings() {
		return new Promise((resolve, reject) => {
			if (typeof browser !== 'undefined') {
				browser.storage.sync.get({
					trovoFullName: true,
					trovoHideAvatar: true,
					trovoShowTimestamp: true,
					trovoShowTimestampSeconds: true
				}).then(resolve, reject);
			}
			else if (typeof chrome !== 'undefined') {
				chrome.storage.sync.get({
					trovoFullName: true,
					trovoHideAvatar: true,
					trovoShowTimestamp: true,
					trovoShowTimestampSeconds: true
				}, function (items) {
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
	}
};

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

const BTTV = {
	emotes: {
		'PedoBear': '54fa928f01e468494b85b54f',
		'RebeccaBlack': '54fa92ee01e468494b85b553',
		':tf:': '54fa8f1401e468494b85b537',
		'CiGrip': '54fa8fce01e468494b85b53c',
		'DatSauce': '54fa903b01e468494b85b53f',
		'ForeverAlone': '54fa909b01e468494b85b542',
		'GabeN': '54fa90ba01e468494b85b543',
		'HailHelix': '54fa90f201e468494b85b545',
		'HerbPerve': '54fa913701e468494b85b546',
		'iDog': '54fa919901e468494b85b548',
		'rStrike': '54fa930801e468494b85b554',
		'ShoopDaWhoop': '54fa932201e468494b85b555',
		'SwedSwag': '54fa9cc901e468494b85b565',
		'M&Mjc': '54fab45f633595ca4c713abc',
		'bttvNice': '54fab7d2633595ca4c713abf',
		'TopHam': '54fa934001e468494b85b556',
		'TwaT': '54fa935601e468494b85b557',
		'WatChuSay': '54fa99b601e468494b85b55d',
		'SavageJerky': '54fb603201abde735115ddb5',
		'Zappa': '5622aaef3286c42e57d8e4ab',
		'tehPoleCat': '566ca11a65dbbdab32ec0558',
		'AngelThump': '566ca1a365dbbdab32ec055b',
		'HHydro': '54fbef6601abde735115de57',
		'TaxiBro': '54fbefeb01abde735115de5b',
		'BroBalt': '54fbf00a01abde735115de5c',
		'ButterSauce': '54fbf02f01abde735115de5d',
		'BaconEffect': '54fbf05a01abde735115de5e',
		'SuchFraud': '54fbf07e01abde735115de5f',
		'CandianRage': '54fbf09c01abde735115de61',
		'She\'llBeRight': '54fbefc901abde735115de5a',
		'D:': '55028cd2135896936880fdd7',
		'VisLaud': '550352766f86a5b26c281ba2',
		'KaRappa': '550b344bff8ecee922d2a3c1',
		'YetiZ': '55189a5062e6bd0027aee082',
		'miniJulia': '552d2fc2236a1aa17a996c5b',
		'FishMoley': '566ca00f65dbbdab32ec0544',
		'Hhhehehe': '566ca02865dbbdab32ec0547',
		'KKona': '566ca04265dbbdab32ec054a',
		'PoleDoge': '566ca09365dbbdab32ec0555',
		'sosGame': '553b48a21f145f087fc15ca6',
		'CruW': '55471c2789d53f2d12781713',
		'RarePepe': '555015b77676617e17dd2e8e',
		'iamsocal': '54fbef8701abde735115de58',
		'haHAA': '555981336ba1901877765555',
		'FeelsBirthdayMan': '55b6524154eefd53777b2580',
		'RonSmug': '55f324c47f08be9f0a63cce0',
		'KappaCool': '560577560874de34757d2dc0',
		'FeelsBadMan': '566c9fc265dbbdab32ec053b',
		'BasedGod': '566c9eeb65dbbdab32ec052b',
		'bUrself': '566c9f3b65dbbdab32ec052e',
		'ConcernDoge': '566c9f6365dbbdab32ec0532',
		'FeelsGoodMan': '566c9fde65dbbdab32ec053e',
		'FireSpeed': '566c9ff365dbbdab32ec0541',
		'NaM': '566ca06065dbbdab32ec054e',
		'SourPls': '566ca38765dbbdab32ec0560',
		'LuL': '567b00c61ddbe1786688a633',
		'SaltyCorn': '56901914991f200c34ffa656',
		'FCreep': '56d937f7216793c63ec140cb',
		'monkaS': '56e9f494fff3cc5c35e5287e',
		'VapeNation': '56f5be00d48006ba34f530a4',
		'ariW': '56fa09f18eff3b595e93ac26',
		'notsquishY': '5709ab688eff3b595e93c595',
		'FeelsAmazingMan': '5733ff12e72c3c0814233e20',
		'DuckerZ': '573d38b50ffbf6cc5cc38dc9',
		'SqShy': '59cf182fcbe2693d59d7bf46',
		'Wowee': '58d2e73058d8950a875ad027',
		'WubTF': '5dc36a8db537d747e37ac187',
		'cvR': '5e76d2ab8c0f5c3723a9a87d',
		'cvL': '5e76d2d2d112fc372574d222',
		'cvHazmat': '5e76d338d6581c3724c0f0b2',
		'cvMask': '5e76d399d6581c3724c0f0b8',
		'OMEGALUL': '583089f4737a8e61abb0186b',
		'Clap': '55b6f480e66682f576dd94f5',
		'PepeHands': '5c20e3432b99ae62dd04331b',
		'KEKW': '5ea831f074046462f768097a',
		'Pepega': '5aca62163e290877a25481ad',
		'pepeJAM': '5b77ac3af7bddc567b1d5fb2',
		'EZ': '5590b223b344e2c42a9e28e3',
		'POGGERS': '58ae8407ff7b7276f8e594f2',
		'PogU': '5ea3bdb7ce7cbf62fe15ca16',
		'pepeD': '5b1740221c5a6065a7bad4b5',
		'5Head': '5d6096974932b21d9c332904',
		'PepePls': '55898e122612142e6aaa935b',
		'weirdChamp': '5d20a55de1cfde376e532972',
		'monkaW': '5981e885eaab4f3320e73b18',
		'AYAYA': '58493695987aab42df852e0f',
		'gachiHYPER': '59143b496996b360ff9b807c',
		'pepeLaugh': '59b73909b27c823d5b1f6052',
		'PepeLaugh': '5c548025009a2e73916b3a37',
		'blobDance': '5ada077451d4120ea3918426',
		'PepegaAim': '5d0d7140ca4f4b50240ff6b4',
		'gachiBASS': '57719a9a6bdecd592c3ad59b',
		'LULW': '5e741594d112fc372574ac49',
		'peepoClap': '5d38aaa592fc550c2d5996b8',
		'ricardoFlick': '5bc2143ea5351f40921080ee',
		'TriDance': '5d1e70f498539c4801cc3811',
		'PepoDance': '5a6edb51f730010d194bdd46',
		'HYPERS': '5980af4e3a1ac5330e89dc76',
		'RainbowPls': '5b35cae2f3a33e2b6f0058ef',
		'peepoLeave': '5e14ca013267f72103fd8462',
		'monkaHmm': '5aa16eb65d4a424654d7e3e5',
		'sumSmash': '5af84b9e766af63db43bf6b9',
		'peepoHappy': '5a16ee718c22a247ead62d4a',
		'peepoArrive': '5d922afbc0652668c9e52ead',
		'PETTHEPEEPO': '5ec059009af1ea16863b2dec',
		'pressF': '5c857788f779543bcdf37124',
		'pepeDS': '5b444de56b9160327d12534a',
		'Dance': '5aa1d0e311237146531078b0',
		'monkaTOS': '5a7fd054b694db72eac253f4',
		'weSmart': '589771dc10c0975495c578d1',
		'PauseChamp': '5cd6b08cf1dac14a18c4b61f',
		'ppOverheat': '5b3e953a2c8a38720760c7f7',
		'Sadge': '5e0fa9d40550d42106b8a489',
		'COGGERS': '5ab6f0ece1d6391b63498774',
		'WaitWhat': '55cbeb8f8b9c49ef325bf738',
		'WeirdChamp': '5d9198fbd2458468c1f4adb7',
		'FeelsRainMan': '57850b9df1bf2c1003a88644',
		'pugPls': '5de88ccef6e95977b50e6eb1',
		'pepeJAMJAM': '5c36fba2c6888455faa2e29f',
		'SALAMI': '5e1dc85f8af14b5f1b43b639',
		'POGSLIDE': '5aea37908f767c42ce1e0293',
		'peepoPooPoo': '5c3427a55752683d16e409d1',
		'peepoRun': '5bc7ff14664a3b079648dd66',
		'PartyParrot': '59f06613ba7cdd47e9a4cad2',
		'bongoTap': '5ba6d5ba6ee0c23989d52b10',
		'WAYTOODANK': '5ad22a7096065b6c6bddf7f3',
		'pepeMeltdown': '5ba84271c9f0f66a9efc1c86',
		'peepoSad': '5a16ddca8c22a247ead62ceb',
		'peepoSimp': '5e3a2c6cd736527d5cd26836',
		'TeaTime': '56f6eb647ee3e8fc6e4fe48e',
		'HYPERCLAP': '5b35ca08392c604c5fd81874',
		'monkaX': '58e5abdaf3ef4c75c9c6f0f9',
		'TriKool': '59a6d3dedccaf930aa8f3de1',
		'HACKERMANS': '5b490e73cf46791f8491f6f4',
		'pikaOMG': '5bec16e1c3cac7088d09bdd7',
		'ddHuh': '58b20d74d07b273e0dcfd57c',
		'ppJedi': '5b52e96eb4276d0be256f809',
		'PepoCheer': '5abd36396723dc149c678e90',
		'widepeepoHappy': '5e1a76dd8af14b5f1b438c04',
		'WeSmart': '5a311dd16405a95e4b0d4967',
		'ppHop': '5a9578d6dcf3205f57ba294f',
		'monkaSHAKE': '58d867c84c25f4458349ecc7',
		'coffinPLZ': '5e9e978c74046462f7674f9f',
		'(ditto)': '554da1a289d53f2d12781907',
		'monkaGun': '58f6e05e58f5dd226a16166e',
		'KEKWlaugh': '5d793f2e14011815db9377d2',
		'peepoLove': '5a5e0e8d80f53146a54a516b',
		'peepoHey': '5c0e1a3c6c146e7be4ff5c0c',
		'lickL': '5afdd15ab5f610729e2f6e7a',
		'MYAAA': '5de20a2c2dea2902de074598',
		'AlienPls': '5805580c3d506fea7ee357d6',
		'lickR': '5afdd149b5f610729e2f6e75',
		'gachiGASM': '55999813f0db38ef6c7c663e',
		'Thonk': '585231dd58af204561cd6036',
		'PartyKirby': '5c3a9d8bbaa7ba09c9cfca37',
		'3Head': '5d24f20653fb473775490d6f',
		'PEPEDS': '5be9f494a550811484ed2dd4',
		'PeepoClap': '5e20bbaa1df9195f1a4c7012',
		'nymnCorn': '56cb56f5500cb4cf51e25b90',
		'200IQ': '5acdc7cb31ca5d147369ead8',
		'RareParrot': '55a24e1294dd94001ee86b39',
		'KKool': '56c2cff2d9ec6bf744247bf1',
		'kumaPls': '5af454b657376e68acb7512a',
		'CrabPls': '5c2a4ddda402f16774559abe',
		'momoLewd': '5b639695abaa836f3519b066',
		'tenseSmash': '5d20ef02e1cfde376e532cc0',
		'peepoSmash': '5c72084d41600b0832ab0931',
		'PepegaPls': '5c04b07db4297124fa9d165e',
		'sadKEK': '5d72ae0aa32edb714a9df060',
		'peepoGiggles': '5e0bcf69031ec77bab473476',
		'HAhaa': '55f47f507f08be9f0a63ce37',
		'GuitarTime': '576befd71f520d6039622f7e',
		'BBoomer': '5c447084f13c030e98f74f58',
		'peepoShy': '5eaa12a074046462f768344b',
		'RIP': '54fcdfdc01abde735115deae',
		'BLELELE': '583eb50550222f7f1086e012',
		'headBang': '57320689d69badf9131b82c4',
		'PepoSabers': '5afa002a1260c3359cb41ef6',
		'monkaDMCA': '5ede6e5610aaa55e29483465',
		'confusedCat': '5d5d9fe322f52e1d9b41ac91',
		'coffinPls': '5ea1e580d023b362f638f54f',
		'PepegaGun': '5db4816f8b059b723dc1a58d',
		'WeirdChamping': '5e9e0eb47e090362f8b0d9a4',
		'CuteDog': '56d6fbb4d5d429963e27410c',
		'coronaS': '5e3441d861ff6b51e65259fe',
		'Squading': '5ed69622fdee545e3066025d',
		'PogUU': '5db280906fc9dd12cbaf1d81',
		'BabyYodaSip': '5de76fe0f6e95977b50e6875',
		'TwixerLove': '5ef2732f51e3910deed5c44b',
		'TriSad': '5e5a6d31ddc7a054d7f0e33a',
		'NOPERS': '5ec39a9db289582eef76f733',
		'dekuHYPE': '594c13b436b6a43b492ce4bd',
		'YEPP': '5e978e20d023b362f638339d',
		'pepeBASS': '5c393177fb40bc09d7c6c3aa',
		'FeelsWeirdMan': '5603731ce5fc5eff1de93229',
		'KEKWait': '5e486af4d736527d5cd2fed6',
		'forsenCD': '5d3e250a6d68672adc3fbff7',
		'peepoComfy': '5dbc173f27360247dd64e4ae',
		'ThisIsFine': '5e2914861df9195f1a4cd411',
		'monkaShoot': '59c232aeb27c823d5b1fa579',
		'pepeJAMMER': '5baa5b59f17b9f6ab0f3e84f',
		'pepeSmoke': '5b15162147c7bf3bfc0b9c76',
		'PepegaDriving': '5e6fa08bd112fc3725746dd4',
		'putinWalk': '5edd1989924aa35e32a73a25',
		'pepeSadJam': '5baf7cfb9809cc1f5117d301',
		'forsenPls': '55e2096ea6fa8b261f81b12a',
		'POGGIES': '5b457bbd0485f43277cecac0',
		'RareChar': '562b9101a6646e202bcc5447',
		'hoSway': '56396c857e538de14bd747a5',
		'Kissahomie': '5ecee2f6924aa35e32a619b7',
		'MLADY': '5b34ef0dbe275b629fc726a2',
		'pikaO': '5be4b0c9e9207c147ebcb517',
		'PogO': '5e9cdca974046462f7673006',
		'PepeWhy': '5a9def77b7319a74f5bbdeda',
		'peepoRiot': '5e1fc363bca2995f13fb89d7',
		'FeelsOkayMan': '5803757f3d506fea7ee35267',
		'gachiW': '5ce66e8c1281d44f03de8051',
		'KKomrade': '56be9fd6d9ec6bf74424760d',
		'BoneZone': '5b6c5efadd8fb0185163bd4f',
		'monkaBan': '5be43ddea550811484ecf547',
		'WidePeepoHappy': '5e1d803c1df9195f1a4c4929',
		'GachiPls': '58868aa5afc2ff756c3f495e',
		'FeelsLagMan': '56758c29bf317838643c7e97',
		'mericCat': '59a32119b71a9e11bd5f4251',
		'monkaSoap': '5e7009f8d6581c3724c093c0',
		'PeepoNoob': '5e8b86328fb1ca5cde5866b5',
		'iron95Pls': '5b220a44d4fa7c69415f38e7',
		'PepoG': '5d63e543375afb1da9a68a5a',
		'PepeJam': '5df2d1b7e7df1277b6070b1e',
		'PepeS': '59420c88023a013b50774872',
		'OMEGAROLL': '5b58941cc0c5fe407247b5e5',
		'sadCat': '5b96e7f1bbf4663f648795b1',
		'FeelsLitMan': '588111b6afc2ff756c3f345d',
		'PepoThink': '5a4ad2574884645e5706e51a',
		'Jammies': '5d2dc7dcff6ed3680130eb6d',
		'somDied': '55a63293b13ce179110b0193',
		'PogTasty': '5dc37f3850952f47dbdf170c',
		'DANCE': '5befebbbe4ac1871e89f2485',
		'PPogo': '5ebf33919af1ea16863b1860',
		'hypeE': '5b6ded5560d17f4657e1319e',
		'LULWW': '587d26d976a3c4756d667153',
		'REKT': '55f759d6b56252197d9af958',
		'ROACH': '5d61b1b14932b21d9c332f1b',
		'WowPls': '55c845ecde06d3181ad07b19',
		'peepoPogClimbingTreeHard4House': '5e2bac6ebca2995f13fc1379',
		'monkaSTEER': '5ed0fd17f54be95e2a835054',
		'Peepoleave': '5e123f56b974112104801d8b',
		'xar2EDM': '5b7e01fbe429f82909e0013a',
		'KirbDance': '5b9011eea2c5266ff2b8fde5',
		'pepeClap': '59688b35172b8b255ec3f6ac',
		'widepeepoSad': '5ebd239bf0fb3f168c4b58f0',
		'PepoPopcorn': '5b157890aca8015213e555d1',
		'monkaGIGA': '58c36ac73c3bbd3e016b6e60',
		'iLOVEyou': '5ca7591926dfd77429327bb6',
		'FeelsRageMan': '5597e66ed8152e272470f830',
		'ZULUL': '57b38e53d5472c5343820619',
		'monkaCHRIST': '5a21576595c4af067c869ba9',
		'HyperNeko': '5afdfe6702e8e2270c373de3',
		'FEelsBadMan': '5a6dee3b2620951f291ec6d0',
		'PianoTime': '5b4d2e45b7b52c3958c8f5cf',
		'peepoSprint': '5c20a897fef84f19d3274cb0'
	},
	replaceText(text) {
		let split = text.split(' ');
		let newText = [];
		for (let word of split) {
			if (this.emotes[word]) {
				word = '<img src="https://cdn.betterttv.net/emote/' + this.emotes[word] + '/1x" />';
			}

			newText.push(word);
		}

		return newText.join(' ');
	}
};

const Trovo = {
	async init() {
		let settings = {
			trovoFullName: true,
			trovoHideAvatar: true,
			trovoShowTimestamp: true,
			trovoShowTimestampSeconds: true
		};
		try {
			settings = await Helper.getSettings();
		}
		catch (e) {
			console.log('catch', e);
		}

		function handleMessage(node) {
			if (settings.trovoHideAvatar) {
				let avatar = node.querySelector('.avatar');
				if (avatar) {
					avatar.remove();
				}
			}
			if (node.classList.contains('message-user')) {
				let nickname = node.querySelector('.nick-name');
				let realname = nickname.getAttribute('title');
				nickname.style.color = Helper.getUserChatColor(realname);
				if (settings.trovoFullName) {
					nickname.innerText = realname;
				}
				if (settings.trovoShowTimestamp) {
					let span = document.createElement('span');
					let splits = node.id.split('_');
					let date = splits.length === 1 ? new Date() : new Date(parseInt(splits[0]));
					span.style.fontSize = '12px';

					let timestamp = date.toLocaleTimeString();
					if (!settings.trovoShowTimestampSeconds) {
						timestamp = timestamp.substr(0, timestamp.length - 3);
					}

					span.innerHTML = timestamp + '&nbsp;';
					let contentWrap = node.querySelector('.content-wrap');
					contentWrap.insertBefore(span, contentWrap.firstChild);
				}

				let content = node.querySelector('.content');
				if (content !== null) {
					let texts = node.querySelectorAll('.text');
					for (let el of texts) {
						el.innerHTML = BTTV.replaceText(el.innerHTML);
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
					handleMessage(node);
				}
			}
		});

		observer.observe(document.querySelector('.chat-list-wrap'), { attributes: true, childList: true, characterData: true });
	}
};

if (location.hostname.toLowerCase() === 'trovo.live') {
	Trovo.init();
}
else {
	YouTube.init();
}