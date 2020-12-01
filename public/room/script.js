const socket = io('/');
// const videoGrid = document.getElementById('video-grid');
// console.log(videoGrid);
// const myVideo = document.createElement('video');
// myVideo.muted = true;

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',  // localhost or heroku
    port: '443'
})

class Participant {
    constructor(){
        this.id = "";
        this.video = null;
        this.hand = null;
        this.name = null;
        this.displayCall = null;
        this.videoStream = null;
    }
}

class Question {
    constructor(queuePosition, name, askerId){
        // Create main div
        const question = document.createElement('div');
        question.className = 'question';
        // Create hand icon
        const handIconDiv = document.createElement('div');
        handIconDiv.className = 'hand-icon-question-queue';
        const handIcon = document.createElement('i');
        handIcon.className = 'fas fa-hand-paper';
        handIconDiv.appendChild(handIcon);
        question.appendChild(handIconDiv);
        // Create queue position
        const queuePos = document.createElement('span');
        queuePos.style.paddingRight = '5px';
        queuePos.style.fontWeight = 'bold';
        queuePos.className = 'queue-position';
        queuePos.innerHTML = (queuePosition + 1) + '.';
        question.appendChild(queuePos);
        // Create name of person who asked question
        const person = document.createElement('span');
        person.style.paddingRight = '30px';
        person.innerHTML = name;
        question.appendChild(person);
        // Append question to queue
        document.getElementById('question-queue').appendChild(question);
        // Fill in class variables
        this.div = question;
        this.pos = queuePos;
        this.askerId = askerId;
    }
}

const videoPositions = ['top-center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
let myVideoStream;
let myDisplayStream;
let participantCount = 0;
let handRaised = false;
let participants = [];
let questionQueue = [];
let rejected = false; // Used for if someone joins a meeting that is full already
let respondToDisplay;
let audioCtx;

// Screen share stuff
const shareButton = document.querySelector('.main__share_button');
const myVideo = document.querySelector('#bottom-center-video');

const addVideoStream = (position, stream) => {
    const newVideo = document.getElementById(position + "-video");
    const newImage = document.getElementById(position + "-image");
    // Remove image and show video
    newVideo.style.display = "flex";
    newImage.style.display = "none";
    // Add video stream
    newVideo.srcObject = stream;
    newVideo.addEventListener('loadedmetadata', () => {
        newVideo.play();
        newVideo.muted = true;
    })
    // console.log("Video appended");
    // videoGrid.appendChild(video);
    // videoGrid.appendChild(handIcon);
}

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    console.log("Adding user media");
    // const addVideoStream = (position, stream) => {
    //     const newVideo = document.getElementById(position + "-video");
    //     const newImage = document.getElementById(position + "-image");
    //     // Remove image and show video
    //     newVideo.style.display = "flex";
    //     newImage.style.display = "none";
    //     // Add video stream
    //     newVideo.srcObject = stream;
    //     newVideo.addEventListener('loadedmetadata', () => {
    //         newVideo.play();
    //         newVideo.muted = true;
    //     })
    //     // console.log("Video appended");
    //     // videoGrid.appendChild(video);
    //     // videoGrid.appendChild(handIcon);
    // }

    // const createHandIcon = () => {
    //     console.log("Creating child");
    //     const div = document.createElement('div');
    //     div.className = "hand-icon hide";
    //     const handIcon = document.createElement('i');
    //     handIcon.className = "fas fa-hand-paper fa-lg";
    //     div.appendChild(handIcon);
    //     return div;
    // }

    // Create raised hand icon
    // const divMain = createHandIcon();
    myVideoStream = stream;
    addVideoStream('bottom-center', stream);

    const newPanner = (pX, pY, pZ, oX, oY, oZ) => {
        return new PannerNode(audioCtx, {
            positionX: pX,
            positionY: pY,
            positionZ: pZ,
            orientationX: oX,
            orientationY: oY,
            orientationZ: oZ
        })
    }

    audioCtx = new AudioContext();
    const panners = [
        newPanner(0,0,-3,0,0,1),    // center
        newPanner(-1,0,-2,1,0,-2),  // soft left
        newPanner(1,0,-2,-1,0,2),   // soft right
        newPanner(-3,0,-1,3,0,1),   // hard left
        newPanner(3,0,1,-3,0,-1)    // hard right
    ];
    const handAudioElement = document.createElement("audio");
    handAudioElement.src = "space_notif_final.wav";
    const handAudioSrc = audioCtx.createMediaElementSource(handAudioElement);

    const spatialButton = document.querySelector('.main__spatial_button');
    // Toggle spatial audio
    spatialButton.addEventListener('click', function() {
        const state = document.querySelector('.main__spatial_text').innerHTML;
        if (state === "3D On") {
            const html = `
                <i class="stop fas fa-assistive-listening-systems"></i>
                <span class="stop main__spatial_text">3D Off</span>
            `
            panners.forEach((panner) => {
                setPandO(panner,0,0,-3,0,0,1)
            });
            document.querySelector('.main__spatial_button').innerHTML = html;
        } else {
            const html = `
                <i class="fas fa-assistive-listening-systems"></i>
                <span class="main__spatial_text">3D On</span>
            `
            setPandO(panners[0],0,0,-3,0,0,1),    // center
            setPandO(panners[1],-1,0,-2,1,0,-2),  // soft left
            setPandO(panners[2],1,0,-2,-1,0,2),   // soft right
            setPandO(panners[3],-3,0,-1,3,0,1),   // hard left
            setPandO(panners[4],3,0,1,-3,0,-1)    // hard right
            document.querySelector('.main__spatial_button').innerHTML = html;
        }
    })

    peer.on('call', call => {
        
        let position = '';

        if (call.metadata.userJoining){
            const newPart = new Participant();
            newPart.id = call.peer;

            // const video = document.createElement('video');
            // newPart.video = video;

            position = videoPositions[participants.length];
            newPart.video = document.getElementById(position + "-video");

            // Create raised hand icon
            newPart.hand = document.getElementById(position + "-hand");

            // Add participant name
            console.log(call.metadata);
            document.getElementById(position + "-name").innerHTML = call.metadata.callerName;
            newPart.name = call.metadata.callerName;

            // Add new participant to the array
            participants.push(newPart);
        } else {
            const pIndex = participants.findIndex((p) => { return p.id === call.peer; });
            position = videoPositions[pIndex];
            if (call.metadata.endingDisplayStream){
                shareButton.disabled = false;
            } else {
                shareButton.disabled = true;
            }
        }

        call.answer(stream);

        // add new user's video stream to our screen
        call.on('stream', userVideoStream => {
            //console.log(userVideoStream);
            //audioCtx.createMediaStreamSource(userVideoStream).connect(panners[0]).connect(hostDestination);
            const pIdx = participants.findIndex((par) => { return par.id === call.peer; });
            if (call.metadata.userJoining || call.metadata.endingDisplayStream){
                audioCtx.createMediaStreamSource(userVideoStream)
                    .connect(panners[pIdx])
                    .connect(audioCtx.destination);
            }
            // console.log("On call");
            // console.log(participants);
            // console.log(call.peer);
            let part = participants.find(p => { return p.id === call.peer });
            // console.log(part);
            part.videoStream = userVideoStream;
            //hostDestination.stream.addTrack(videoTrack);
            //console.log(hostDestination.stream);
            // addVideoStream(position, userVideoStream, newPart.hand);
            addVideoStream(position, userVideoStream);
        })
    })

    // respondToDisplay = userVideoStream => {
    //     if (!call.metadata.isDisplayStream){
    //         audioCtx.createMediaStreamSource(userVideoStream)
    //             .connect(panners[participants.length - 1])
    //             .connect(audioCtx.destination);
    //     }
    //     addVideoStream(position, userVideoStream);
    // }

    // Move connectToNewUser over here to utilize the audioCtx
    socket.on('user-connected', (userId, username) => {
        // console.log(userId);
        // console.log("Participants ", participants.length);
        if (participants.length == 5) {
            // console.log("Rejecting new participant");
            socket.emit('room-full', ROOM_ID, userId);
            return;
        }
        const call = peer.call(userId, stream, {metadata: {callerName: USER_NAME, userJoining: true, endingDisplayStream: false}});
        newPart = new Participant();
        newPart.id = userId;
        // const dataConn = peer.connect(userId);
        // const video = document.createElement('video');
        // newPart.video = video;
        let position = videoPositions[participants.length];
        newPart.video = document.getElementById(position + "-video");
        
        // Assign raised hand icon
        newPart.hand = document.getElementById(position + "-hand");

        // Update participant name
        document.getElementById(position + "-name").innerHTML = username;
        newPart.name = username;

        participants.push(newPart);

        call.on('stream', userVideoStream => {
            //let videoTrack = userVideoStream.getVideoTracks()[0];
            // console.log(participants.length);
            audioCtx.createMediaStreamSource(userVideoStream).connect(panners[participants.length - 1]).connect(audioCtx.destination);
            console.log("User connected");
            newPart.videoStream = userVideoStream;
            //hostDestination.stream.addTrack(videoTrack);
            // addVideoStream(position, userVideoStream, newPart.hand);
            addVideoStream(position, userVideoStream);
        })
    })

    socket.on('hand-event', (userId, handIsRaised) => {
        // console.log(userId, handIsRaised);
        // console.log(userId);
        // console.log(participants);
        const userIndex = participants.findIndex((p) => { return p.id === userId; });
        // console.log(userIndex);
        if (userIndex > -1) {
            if (handIsRaised){
                handAudioSrc.disconnect();
                participants[userIndex].hand.style.display = "flex";
                questionQueue.push(new Question(questionQueue.length, participants[userIndex].name, userId));
                // console.log(questionQueue);
                const state = document.querySelector('.main__spatial_text').innerHTML;
                if (state === "3D On") {
                    handAudioSrc.connect(panners[userIndex]).connect(audioCtx.destination);
                } else {
                    handAudioSrc.connect(audioCtx.destination);
                }
                handAudioElement.load();
                handAudioElement.play();
            } else {
                removeQuestionFromQueue(userId);
                // qIndex = questionQueue.findIndex(q => {return q.askerId === userId});
                // console.log(qIndex);
                // console.log(questionQueue);
                // questionQueue[qIndex].div.remove();
                // questionQueue.splice(qIndex, 1);
                // // Fix queue ordering
                // for (i = qIndex; i < questionQueue.length; i++){
                //     questionQueue[i].pos.innerHTML = (i + 1) + '.';
                // }
                participants[userIndex].hand.style.display = "none";
            }
        }
    })
})

const removeQuestionFromQueue = (userId) => {
    const qIndex = questionQueue.findIndex(q => {return q.askerId === userId});
    console.log(qIndex);
    console.log(questionQueue);
    questionQueue[qIndex].div.remove();
    questionQueue.splice(qIndex, 1);
    // Fix queue ordering
    for (i = qIndex; i < questionQueue.length; i++){
        questionQueue[i].pos.innerHTML = (i + 1) + '.';
    }
}

peer.on('open', id => {
    // console.log("Joining room");
    socket.emit('join-room', ROOM_ID, id, USER_NAME);
    // (unique) peer id gets auto-generated here
})

window.addEventListener("beforeunload", function(event) {
    // console.log("Bye bye");
    socket.emit('leave-room', ROOM_ID, peer.id);
    return;
})

socket.on('user-disconnected', userId => {
    // console.log("See ya");
    const userIndex = participants.findIndex((p) => { return p.id === userId; });
    // console.log(userIndex);
    if (userIndex > -1) {
        // console.log("Before splice");
        // console.log(participants);
        const discUser = participants[userIndex];
        discUser.video.style.display = "none";
        document.getElementById(videoPositions[userIndex] + '-image').style.display = "flex";
        participants.splice(userIndex, 1);
        // console.log("After splice");
        // console.log(participants);
        for (i = userIndex; i < participants.length; i++) {
            // For the videoPositions array, i + 1 is the old location and i is the new location
            // Hide existing video
            participants[i].video.style.display = "none";
            document.getElementById(videoPositions[i + 1] + '-image').style.display = "flex";
            // Move old video stream to new video location
            document.getElementById(videoPositions[i] + '-image').style.display = "none";
            let newVideo = document.getElementById(videoPositions[i] + '-video');
            newVideo.style.display = "flex";
            newVideo.srcObject = participants[i].video.srcObject;
            // Associate new video location to participant
            participants[i].video = newVideo;
            participants[i].hand = document.getElementById(videoPositions[i] + '-hand');
        }
    }
})

socket.on('join-cancelled', (userId) => {
    // console.log("Received join-cancelled message");
    if ((userId === peer.id) && !rejected){
        rejected = true;
        // console.log("I can't join");
        window.location.href = '/room-full'
    }
})

const muteUnmute = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    } else {
        setMuteButton();
        myVideoStream.getAudioTracks()[0].enabled = true;
    }
}

const setMuteButton = () => {
    const html = `
        <i class="fas fa-microphone fa-lg"></i>
    `
    document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
    const html = `
        <i class="unmute fas fa-microphone-slash fa-lg"></i>
    `
    document.querySelector('.main__mute_button').innerHTML = html;
}

const playStop = () => {
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        setStopVideo();
    } else {
        setPlayVideo();
        myVideoStream.getVideoTracks()[0].enabled = true;
    }
}

const setPlayVideo = () => {
    const html = `
        <i class="fas fa-video fa-lg"></i>
    `
    document.querySelector('.main__video_button').innerHTML = html;
}

const setStopVideo = () => {
    const html = `
        <i class="stop fas fa-video-slash fa-lg"></i>
    `
    document.querySelector('.main__video_button').innerHTML = html;
}

//
// Screen Sharing
// 



function handleSuccess(stream) {
    shareButton.disabled = true;
    myDisplayStream = stream;
    myVideo.srcObject = myDisplayStream;
    document.getElementById('all-videos').style.backgroundColor = "#312252";
    participants.forEach(p => {
        const displayCall = peer.call(p.id, myDisplayStream, {metadata: {callerName: USER_NAME, userJoining: false, endingDisplayStream: false}});
        const position = videoPositions[participants.findIndex((par) => { return par.id === p.id; })];
        p.displayCall = displayCall;
        displayCall.on('stream', userVideoStream => {
            audioCtx.createMediaStreamSource(userVideoStream)
                .connect(panners[participants.length - 1])
                .connect(audioCtx.destination);
            addVideoStream(position, userVideoStream);
        });
    });
    setShareOn();
    // detect when user stops sharing from chrome 'Stop Sharing' button
    myDisplayStream.getVideoTracks()[0].addEventListener('ended', endScreenShare, false);
}

function endScreenShare(event) {
    console.log('The user has ended sharing the screen');
    participants.forEach(p => {
        p.displayCall.close();
    });
    participants.forEach(p => {
        const videoCall = peer.call(p.id, myVideoStream, {metadata: {callerName: USER_NAME, userJoining: false, endingDisplayStream: true}});
        const pIdx = participants.findIndex((par) => { return par.id === p.id; });
        const position = videoPositions[pIdx];
        videoCall.on('stream', userVideoStream => {
            audioCtx.createMediaStreamSource(userVideoStream)
                .connect(panners[pIdx])
                .connect(audioCtx.destination);
            addVideoStream(position, userVideoStream);
        });
    });
    myVideo.srcObject = myVideoStream;
    document.getElementById('all-videos').style.backgroundColor = "rgb(29, 29, 29)";
    myDisplayStream.getTracks().forEach(track => track.stop());
    shareButton.disabled = false;
    setShareOff();
}

function handleError(error) {
    console.error(`getDisplayMedia error: ${error.name}`, error);
}

shareButton.addEventListener('click', () => {
    if (shareButton.querySelector(".fa-laptop").style.color === '2be028'){
        endScreenShare('');
    } else {
        navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: { echoCancellation: true, noiseSuppression: true }
        }).then(handleSuccess, handleError);
    }
});

if ((navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)) {
    shareButton.disabled = false;
} else {
    console.error('getDisplayMedia is not supported');
}

// const screenShare = () => {
//     // BUG: macOS must enable permissions...
//     // System Preferences -> Security & Privacy -> Privacy -> Screen Recording -> Enable Google Chrome (or browser of choice) 
//     // if (sharebutton.enabled = false) {
//     //     // enable screensharing
        
//     // } else {
//     //     // disable screensharing
//     // }

//     navigator.mediaDevices.getDisplayMedia({
//         video: { cursor: "always" },
//         audio: { echoCancellation: true, noiseSuppression: true }
//     }).then((stream) => {
//         console.log('streaming now...')
//         setShareOn();
//         const video = document.querySelector('#bottom-center-video');
//         video.srcObject = stream;

//         stream.getVideoTracks()[0].addEventListener('ended', () => {
//             errorMsg('The user has ended screen sharing.');
//             setShareOff();
//         })
//     }).catch((err) => {
//         console.error("Error: unable to display media, " + err)
//     })

// }

const setShareOn = () => {
    const html = `
        <i class="fas fa-laptop fa-lg" style="color:#2be028"></i>
    `
    shareButton.innerHTML = html;
}

const setShareOff = () => {
    const html = `
        <i class="fas fa-laptop fa-lg"></i>
    `
    shareButton.innerHTML = html;
}

function setPandO(panner, pX, pY, pZ, oX, oY, oZ){
    panner.setPosition(pX, pY, pZ);
    panner.setOrientation(oX, oY, oZ);
}

const raiseLowerHand = () => {
    if (handRaised){
        setLowerHand();
        handRaised = false;
    } else {
        setRaiseHand();
        handRaised = true;
    }
    socket.emit('hand-event', ROOM_ID, peer.id, handRaised);
}

const setLowerHand = () => {
    const html = `
        <i class="far fa-hand-paper fa-lg"></i>
    `
    document.querySelector('.main__hand_button').innerHTML = html;
    removeQuestionFromQueue(peer.id);
}

const setRaiseHand = () => {
    const html = `
        <i class="fas fa-hand-paper fa-lg"></i>
    `
    document.querySelector('.main__hand_button').innerHTML = html;
    questionQueue.push(new Question(questionQueue.length, USER_NAME, peer.id));
}

const createQuestion = (queuePosition, name) => {
    // Create main div
    const question = document.createElement('div');
    question.className = 'question';
    // Create hand icon
    const handIconDiv = document.createElement('div');
    handIconDiv.className = 'hand-icon-question-queue';
    const handIcon = document.createElement('i');
    handIcon.className = 'fas fa-hand-paper';
    handIconDiv.appendChild(handIcon);
    question.appendChild(handIconDiv);
    // Create queue position
    const queuePos = document.createElement('span');
    queuePos.style.paddingRight = '5px';
    queuePos.style.fontWeight = 'bold';
    queuePos.className = 'queue-position';
    queuePos.innerHTML = (queuePosition + 1) + '.';
    question.appendChild(queuePos);
    // Create name of person who asked question
    const person = document.createElement('span');
    person.style.paddingRight = '30px';
    person.innerHTML = name;
    question.appendChild(person);
    // Append question to queue
    document.getElementById('question-queue').appendChild(question);
}

const leaveMeeting = () => {
    if (confirm("Are you sure you want to leave the meeting?")){
        window.location.href = '/thank-you'
    }
}
