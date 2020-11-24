const socket = io('/');
const videoGrid = document.getElementById('video-grid');
console.log(videoGrid);
const myVideo = document.createElement('video');
myVideo.muted = true;

function newPanner(pX, pY, pZ, oX, oY, oZ) {
    return new PannerNode(audioCtx, {
        positionX: pX,
        positionY: pY,
        positionZ: pZ,
        orientationX: oX,
        orientationY: oY,
        orientationZ: oZ
    })
}

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',  // localhost or heroku
    port: '443'
})

let myVideoStream;
let participantCount = 0;
let handRaised = false;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    const addVideoStream = (video, stream) => {
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
            video.muted = true;
        })
        videoGrid.appendChild(video);
    }

    myVideoStream = stream;
    addVideoStream(myVideo, stream);

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

    const audioCtx = new AudioContext();
    const panHardLeft = newPanner(-3,0,-1,3,0,1);
    const panHardRight = newPanner(3,0,1,-3,0,-1);
    const panners = [panHardRight, panHardLeft, panHardRight, panHardLeft];

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
                setPandO(panner,0,0,3,0,0,1)
            });
            document.querySelector('.main__spatial_button').innerHTML = html;
        } else {
            const html = `
                <i class="fas fa-assistive-listening-systems"></i>
                <span class="main__spatial_text">3D On</span>
            `
            setPandO(panners[1],-3,0,-1,3,0,1);
            setPandO(panners[3],-3,0,-1,3,0,1);
            setPandO(panners[0],3,0,1,-3,0,-1);
            setPandO(panners[2],3,0,1,-3,0,-1);
            document.querySelector('.main__spatial_button').innerHTML = html;
        }
    })

    peer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');

        // add new user's video stream to our screen
        call.on('stream', userVideoStream => {
            //console.log(userVideoStream);
            //audioCtx.createMediaStreamSource(userVideoStream).connect(panners[0]).connect(hostDestination);
            audioCtx.createMediaStreamSource(userVideoStream).connect(panners[Math.floor(participantCount / 2)]).connect(audioCtx.destination);
            console.log("On call");
            participantCount += 1;
            console.log(participantCount);
            //hostDestination.stream.addTrack(videoTrack);
            //console.log(hostDestination.stream);
            addVideoStream(video, userVideoStream);
        })
    })

    // Move connectToNewUser over here to utilize the audioCtx
    socket.on('user-connected', (userId) => {
        // console.log(userId);
        const call = peer.call(userId, stream);
        const dataConn = peer.connect(userId);
        const video = document.createElement('video');

        call.on('stream', userVideoStream => {
            //let videoTrack = userVideoStream.getVideoTracks()[0];
            audioCtx.createMediaStreamSource(userVideoStream).connect(panners[Math.floor(participantCount / 2)]).connect(audioCtx.destination);
            console.log("User connected");
            participantCount += 1;
            console.log(participantCount);
            //hostDestination.stream.addTrack(videoTrack);
            addVideoStream(video, userVideoStream);
        });

        dataConn.on('open', () => {
            console.log("Connection created");
            dataConn.on('data', data => {
                console.log("Initator recevied ", data);
            })
        });
    })

    peer.on('connection', dataConn => {
        console.log("Connection created");
        dataConn.on('open', () => {
            console.log("Connection open");
            dataConn.on('data', data => {
                console.log("Peer recieved ", data);
            });
        })
    })
})

peer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
    // (unique) peer id gets auto-generated here
})


// const connectToNewUser = (userId, stream) => {
//     // console.log(userId);
//     const call = peer.call(userId, stream);
//     const video = document.createElement('video');
//     const hostDestination = audioCtx.createMediaStreamDestination();

//     call.on('stream', userVideoStream => {
//         let videoTrack = stream.getVideoTracks()[0];
//         audioCtx.createMediaStreamSource(userVideoStream).connect(panners[0]).connect(hostDestination);
//         hostDestination.stream.addTrack(videoTrack);
//         addVideoStream(video, hostDestination.stream);
//     })
// }

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
        <i class="fas fa-microphone"></i>
    `
    document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
    const html = `
        <i class="unmute fas fa-microphone-slash"></i>
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
        <i class="fas fa-video"></i>
    `
    document.querySelector('.main__video_button').innerHTML = html;
}

const setStopVideo = () => {
    const html = `
        <i class="stop fas fa-video-slash"></i>
    `
    document.querySelector('.main__video_button').innerHTML = html;
}

const screenShare = () => {
    window.alert("This feature has not been implemented in the alpha system")
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
}

const setLowerHand = () => {
    const html = `
        <i class="far fa-hand-paper"></i>
    `
    document.querySelector('.main__hand_button').innerHTML = html;
}

const setRaiseHand = () => {
    const html = `
        <i class="fas fa-hand-paper"></i>
    `
    document.querySelector('.main__hand_button').innerHTML = html;
}
