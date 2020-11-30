let isJoining = true;

const joinButton = document.getElementById('join-button');
const createButton = document.getElementById('create-button');
const roomField = document.getElementById('room-field');
const submitButton = document.querySelector('.submit-button');

const showJoin = () => {
    joinButton.className = 'tab-button tab-button-active';
    createButton.className = 'tab-button';
    roomField.style.display = 'flex';
    submitButton.innerHTML = 'Join Meeting'
    isJoining = true;
}

const showCreate = () => {
    joinButton.className = 'tab-button';
    createButton.className = 'tab-button tab-button-active';
    roomField.style.display = 'none';
    submitButton.innerHTML = 'Create Meeting'
    isJoining = false;
}

const joinOrCreateMeeting = () => {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        const name = document.getElementById('name-field').querySelector('input').value;
        if (isJoining){
            const roomId = roomField.querySelector('input').value;
            window.location.href = '/room/' + roomId + '.' + name;
        } else {
            window.location.href = '/new-room/' + name;
        }
    }).catch(err => {
        alert("Unable to get user media. Please refresh the page and try again!");
    });
}
