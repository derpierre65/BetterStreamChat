function saveOptions() {
	let trovoFullName = document.getElementById('trovoFullName').checked;
	let trovoHideAvatar = document.getElementById('trovoHideAvatar').checked;
	let trovoShowTimestamp = document.getElementById('trovoShowTimestamp').checked;
	let trovoShowTimestampSeconds = document.getElementById('trovoShowTimestampSeconds').checked;

	chrome.storage.sync.set({
		trovoFullName,
		trovoHideAvatar,
		trovoShowTimestamp,
		trovoShowTimestampSeconds
	}, function () {
		let status = document.getElementById('status');
		status.textContent = 'Options maybe saved. :)';
		setTimeout(function () {
			status.textContent = '';
		}, 1500);
	});
}

function restoreOptions() {
	getSettings().then((items) => {
		document.getElementById('trovoFullName').checked = items.trovoFullName;
		document.getElementById('trovoHideAvatar').checked = items.trovoHideAvatar;
		document.getElementById('trovoShowTimestamp').checked = items.trovoShowTimestamp;
		document.getElementById('trovoShowTimestampSeconds').checked = items.trovoShowTimestampSeconds;
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);