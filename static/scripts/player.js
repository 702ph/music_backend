/*
 * author: Shuya Fuchigami, 554092
 *
 *
 */


// for future implementation
function Controller() {
}


let songSelector;
let rows;

let audioInformation = document.querySelector("#audioInformation");

// initial processes at page load
window.addEventListener('load', async function () {

    //display song list
    await displaySongList();

    // set
    songSelector = document.querySelector("#songSelectorTable");
    rows = songSelector.children[0].rows; //<tr> in <table>

    // set songID
    selectedSongID = getFirstSongID(rows);

    //TODO: this will be omitted.
    document.querySelector("#songIDInput").value = selectedSongID;

    printAudioInformation();
});


Object.defineProperty(this, "printAudioInformation", {
    enumerable: false,
    writable: false,
    value: () => {
        const songInfo = getSongInfo(selectedSongID);
        audioInformation.textContent = songInfo.id + ": " + songInfo.artist + " - " + songInfo.title;
    }
});


//prevent drag and drop on document
document.ondrop = (event) => {
    event.stopPropagation();
    event.preventDefault();
};
document.ondragover = (event) => {
    event.stopPropagation();
    event.preventDefault();
};


//set event listener for drop zone
let dropZone = document.querySelector("#drop_zone");
Object.entries({
    "dragover": handleDragOver,
    "drop": handleFileDropped,
    "dragleave": handleDragLeave
}).map(([key, value]) => {
    dropZone.addEventListener(key, value, false); //key: event name, value: function name(attention! without parenthesis )
});


function handleDragOver(evt) {
    evt.stopPropagation();  //stops the bubbling of an event to parent elements, preventing any parent event handlers from being executed.
    evt.preventDefault(); //prevent page transition
    evt.dataTransfer.dropEffect = "copy"; // explicity show this is a copy.

    //change style
    dropZone.classList.add("is-dragover");
    //console.log("dragover");
}


//initialize style
function handleDragLeave(evt) {
    dropZone.classList.remove("is-dragover")
}


async function handleFileDropped(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    let dropZoneMessage = document.querySelector("#drop_zone_message");
    //dropZoneMessage.innerHTML = "abc";

    //dropped file list
    let files = evt.dataTransfer.files;

    //check number of files
    const maxFileNum = 1;
    if (files.length > maxFileNum) {
        dropZoneMessage.innerHTML = "currently accepts only one file at time";
        handleDragLeave();
        return;
    }

    //assign file from files
    //process only the first file
    const file = files[0];

    console.log(file.type);

    if (!file.type.match("audio/mp3")) {
        dropZoneMessage.innerHTML = "only accepts mp3 audio!";
        return false;
    }

    //if file is empty, return false
    if (file.size = 0) {
        dropZoneMessage.innerHTML = "file is empty";
        return false;
    }

    //prepare data to upload
    const formData = new FormData();
    formData.append("input_file", file); //at siver side it should also be "input_file"

    //uploading message
    dropZoneMessage.innerHTML = "now uploading: " + file.name;

    try {
        const response = await postSong(formData);
        console.log(response);

        //upload finish message
        dropZoneMessage.innerHTML = "upload finished: " + file.name;

        //reload song list
        displaySongList();
    } catch (error) {
        console.log(error);
        dropZoneMessage.innerHTML = "Check Internet Connection. Detail: " + error;
    }

    //reset style
    handleDragLeave();
}


//edit table contents
let inTableEditMode = false
let originalRows;
let editStartBtn = document.querySelector("#editStartButton");
editStartBtn.onclick = () => editTable();
Object.defineProperty(this, 'editTable', {
    enumerable: false,
    configurable: false,
    value: async function () {  //TODO: have to be async??

        //get table
        //let songSelector = document.querySelector("#songSelectorTable");
        //let rows = songSelector.children[0].rows; //<tr> in <table>

        // if in table edit mode, finish the mode and send changes to server.
        if (inTableEditMode) {

            //set cells not editable
            setTableContentsNonEditable(rows);

            // convert to Json
            const json = convertToJson(rows);

            //TODO: we need here try and catch
            //send to server
            postTableContents(json);

            //reset button value
            editStartBtn.value = "🖋";

            //reset visibility
            editCancelBtn.style.visibility = "hidden";

            //set mode
            inTableEditMode = false;

        } else { // if not in edit mode, change to edit mode

            //set mode
            inTableEditMode = true;

            //change visibility
            editCancelBtn.style.visibility = "visible";

            //change button value
            editStartBtn.value = "edit finish";


            //save current table contents
            saveCurrentTableRows(rows);

            // make cells editable
            setTableContentsEditable(rows);
        }
    }
});


/*
    accept song map in array and convert to json.
    TODO: this method can be refactored.
 */
Object.defineProperty(this, 'convertToJson', {
    enumerable: false,
    configurable: false,
    value: function (rows) {

        const keyOrder = ["id", "title", "artist", "album", "year", "genre"];

        // preparation
        let songs = [];
        Array.prototype.slice.call(rows).forEach((value, index) => {
            if (!(index === 0)) { // 0. row is for title and it doesn't have to be processed.

                let song = new Map();
                Array.prototype.slice.call(value.cells).forEach((value, index) => {
                    if (!(index === 6)) {
                        song.set(keyOrder[index], value.innerText);
                    }
                });
                songs.push(song);
            }
        });
        console.log(songs);


        // convert to json
        let jsonsInArray = songs.map((value) => {
            //map to object and to json
            let j = JSON.stringify(Array.from(value).reduce((sum, [v, k]) => (sum[v] = k, sum), {}));
            console.log(j);
            return j;
        });

        let json = "[" + jsonsInArray.join(",") + "]";
        console.log(json);

        return json;
    }
});


/*
    convert from json to object (dictionary)
 */
Object.defineProperty(this, 'convertFromJson', {
    enumerable: false,
    configurable: false,
    value: function (json) {

        //json to object
        const songList = JSON.parse(json);
        //console.log(songList);

        // this is for the "cancel button" -> not any more
        // keys for guaranteed extraction of elements orders in object
        const keyOrder = ["id", "title", "artist", "album", "year", "genre"];

        //oh forEach works!?
        songList.forEach((item) => {
            //console.log(item);
            for (const key of keyOrder) {
                //console.log(key);
                console.log(item[key]);
            }
        });
        return songList;
    }
});


Object.defineProperty(this, 'saveCurrentTableRows', {
    enumerable: false,
    configurable: false,
    value: function (tableRows) {

        // get contents in table
        originalRows = Array.prototype.slice.call(tableRows).map((row) => {
            return Array.prototype.slice.call(row.cells).map((cell) => {
                return cell.innerText;
            });
        });
        console.log(originalRows);
    }
});


Object.defineProperty(this, 'setTableContentsNonEditable', {
    enumerable: false,
    configurable: false,
    value: function (rows) {
        //iteration to set Non-editable
        Array.prototype.slice.call(rows).forEach((value, index) => {
            if (!(index === 0)) { // 0. row is for title and it doesn't have to be processed.
                Array.prototype.slice.call(value.cells).forEach((item) => {
                    item.setAttribute("contenteditable", "false");
                });
            }

        });
    }
});


Object.defineProperty(this, 'setTableContentsEditable', {
    enumerable: false,
    configurable: false,
    value: function (rows) {
        //iteration to set editable

        Array.prototype.slice.call(rows).forEach((row, index) => {
            if (!(index === 0)) { // 0. row is for title and it doesn't have to be editable
                row.classList.remove('greenYellow'); //remove style sheet

                Array.prototype.slice.call(row.cells).forEach((cell) => {
                    if (!(cell.cellIndex === 0 || cell.cellIndex === 6)) { //make cells editable except first and last one in the row.
                        cell.setAttribute("contenteditable", "true");
                    }
                });
            }
        });

    }
});


Object.defineProperty(this, 'removeHighlightsFromTable', {
    enumerable: false,
    configurable: false,
    value: function (rows) {
        //iteration to set editable
        Array.prototype.slice.call(rows).forEach((row, index) => {
            if (!(index === 0)) { // 0. row is for title and it doesn't have to be editable
                //old fashion
                //row.classList.remove('greenYellow'); //remove style sheet
                //row.classList.remove("toBeDeleted");

                // clear everything in Classlist
                row.classList.remove(...row.classList);
            }
        });
    }
});


//cancel delete songs
let deleteCancelBtn = document.querySelector("#deleteCancelButton");
deleteCancelBtn.onclick = () => cancelDeleteSongs();
Object.defineProperty(this, 'cancelDeleteSongs', {
    enumerable: false,
    configurable: false,
    value: function () {

        //remove color
        //let songSelector = document.querySelector("#songSelectorTable");
        //let rows = songSelector.children[0].rows; //<tr> in <table>
        removeHighlightsFromTable(rows);

        //reset visibility
        deleteCancelBtn.style.visibility = "hidden";
        deleteConfirmBtn.style.visibility = "hidden";

        //reset button text
        deleteBtn.value = "✂";
        deleteConfirmBtn.value = "Confirm";

        // set mode
        inDeleteSongMode = false;
        inDeleteConfirmedState = false;
    }
});


let editCancelBtn = document.querySelector("#editCancelButton");
editCancelBtn.onclick = () => cancelEditTable();
Object.defineProperty(this, 'cancelEditTable', {
    enumerable: false,
    configurable: false,
    value: function () {
        //get table
        //let songSelector = document.querySelector("#songSelectorTable");

        //<tr> in <table>
        //let rows = songSelector.children[0].rows;


        //recovery previous contents. (override current table with previous contents )
        Array.prototype.slice.call(rows).forEach((row, rindex) => {
            Array.prototype.slice.call(row.cells).forEach((cell, cindex) => {
                cell.innerText = originalRows[rindex][cindex];
            });
        });


        //set to non editable
        setTableContentsNonEditable(rows);

        //reset button value
        editStartBtn.value = "🖋";

        //reset visibility
        editCancelBtn.style.visibility = "hidden";

        //set mode
        inTableEditMode = false;
    }
});


/***************** TABLE **********************/

//get element in table
document.addEventListener('click', function (e) {

    if (inTableEditMode | inDeleteSongMode) return; // if in table edit mode return;

    let t = e.target;
    if (t.nodeName == "TD") {
        Array.prototype.map.call(t.parentNode.parentNode.children, function (x) {
            x.classList.remove('greenYellow');

            // avoid 0 row to be colored
            if (x.rowIndex === 0) return;

            if (x == t.parentNode) {
                x.classList.add('greenYellow');
                let ch = x.children;
                //clickedID = ch[0].textContent; //the first children for id
                //document.querySelector("#songIDInput").value = clickedID;

                selectedSongID = ch[0].textContent; //the first children is for id
                if (!isPlaying) {
                    printAudioInformation();
                }

                //TODO: to be removed
                document.querySelector("#songIDInput").value = selectedSongID;

                // for debug table
                let tableDebug = document.querySelector('#tableDebug');
                //clear previous data
                while (tableDebug.lastChild) {
                    tableDebug.removeChild(tableDebug.lastChild);
                }

                //convert HTMLCollection to array
                let ch2 = Array.from(ch);
                let ul = document.createElement("ul");

                ch2.forEach((value, index) => {
                    //console.log({index, value});
                    const li = document.createElement("li");
                    li.innerHTML = index + ": " + value.textContent;
                    ul.appendChild(li);
                });

                // show debug table
                document.querySelector('#tableDebug').appendChild(ul);

                // show in console
                console.log(ch2);
            }
        });
    }
});


// color rows in table for delete mode (multiple choice)
document.addEventListener('click', function (event) {

    // only for delete mode
    if (!inDeleteSongMode) return;

    // no more selection allowed in delete confirmed state
    if (inDeleteConfirmedState) return;

    let target = event.target;
    if (target.nodeName == "TD") {

        Array.prototype.map.call(target.parentNode.parentNode.children, function (tr) {

            // avoid 0 row to be selected
            if (tr.rowIndex === 0) return;

            if (tr == target.parentNode) {

                // give color for selected
                if (tr.classList.contains("greenYellow")) {
                    tr.classList.remove('greenYellow');
                } else {
                    tr.classList.add('greenYellow');
                }
            }
        });
    }
});


/*****************  **********************/


let audioCtx;
let startBtn = document.querySelector('#startAudioContext');
let susresBtn = document.querySelector('#suspendAudioContext');
let stopBtn = document.querySelector('#stopAudioContext');
let audioPauseButton = document.querySelector("#audioPauseButton");
let timeDisplay = document.querySelector('#counter');

susresBtn.setAttribute('disabled', 'disabled');
stopBtn.setAttribute('disabled', 'disabled');
let isPlaying = false; //TODO: can be replaced by audioContext.state -> no.
let selectedSongID;
let nowPlayingSongID;

let gainNode;
let audioBufferSourceNode;
let audioArrayBuffer;
let decodedAudioBuffer;
let audioBufferSourceDuration;
//let audioPlaybackPosition = 0;
let audioPausedAt = undefined;
let audioStartAt = 0;


audioPauseButton.onclick = () => start();
startBtn.onclick = () => start();


async function start() {
    startBtn.setAttribute('disabled', 'disabled');
    susresBtn.removeAttribute('disabled');
    stopBtn.removeAttribute('disabled');

    //debug
    console.log(selectedSongID);
    console.log(nowPlayingSongID);

    // if nowPlayingSongID = selectedSongID are the same, no new song was selected during the playback.
    if (nowPlayingSongID === selectedSongID) {

        // pause when audio is being played.  -> stop playing audio
        if (isPlaying) {

            // if (audioRepeatPlay) { // in repeat mode, repeat.
            //     // go through here and goes to
            //
            // } else {

            // pause(stop)
            audioBufferSourceNode.stop(0);

            // audioPlaybackPosition for re-start
            //audioPlaybackPosition = audioCtx.currentTime - playbackStartAudioContextTimeStamp;
            //console.log("audioPlaybackPosition: " + audioPlaybackPosition);

            audioPausedAt = Date.now() - audioStartAt;
            console.log("audioPausedAt/1000: " + (audioPausedAt / 1000));

            isPlaying = false;
            showPauseIcon(false);
            return;
            // }

        } else { // start again when audio is NOT being played. => start playing audio

            if (audioCtx.state === "closed") initAudioContext();

            // re-init audio source
            initAudioBufferSourceNode();

            if (0 < audioPausedAt) {
                //if (audioPausedAt === undefined){
                audioStartAt = Date.now() - audioPausedAt;
                audioBufferSourceNode.start(0, audioPausedAt / 1000);
            } else {
                // for the very(? really?) first time -> because audioPauseAt is 0, it works?
                // i mean it also should be Date.now() - audioPausedAt
                audioStartAt = Date.now();
                audioBufferSourceNode.start(0); //this should be .start(0, audioPausedAt/1000)? no if requered?
            }
            console.log("audioStartAt/1000: " + (audioStartAt / 1000));

            isPlaying = true;
            showPauseIcon(true);
            return;
        }
    }

    // else {
    //     if (audioCtx.state === "closed") initAudioContext();
    //
    //     // re-init audio source
    //     initAudioBufferSourceNode();
    //
    //     if (0 < audioPausedAt) {
    //         audioStartAt = Date.now() - audioPausedAt;
    //         audioBufferSourceNode.start(0, audioPausedAt / 1000);
    //     }
    //     console.log("audioStartAt/1000: " + (audioStartAt / 1000));
    //
    // }


    // else {
    //     // comes here if selectedSongID has changed during play
    //     await audioCtx.close();
    // }
    //TODO: extract above method like:
    // const control = () = {
    //    if (!isPlaying) start();
    //    else stop();
    // };

    //comes here if selectedSongID has changed during play or it is for the first time to play audio
    // If a new audio file is selected to play, the existing audio context must be closed.
    if (audioCtx !== undefined) {  //for the very first time
        if (audioCtx.state !== "closed") { // only close it if it is not "closed". if you try to close while is it already closed you will get error.
            //audioBufferSourceNode.disconnect();
            await audioCtx.close();
            showPauseIcon(false);
        }
    }

    // comes here means it is for the very first time to play audio or a new song was selected to play.
    try {
        initAudioContext();

        //gainNode = audioCtx.createGain();
        //audioBufferSourceNode = audioCtx.createBufferSource();

        //https://sbfl.net/blog/2016/07/13/simplifying-async-code-with-promise-and-async-await/
        //await Promise to be solved
        audioArrayBuffer = await loadSongFromURL(selectedSongID);
        console.log(audioArrayBuffer.byteLength);

        // set audio buffer
        //because audioArrayBuffer is a Promise Object, you have to wait till it's set to resolved.
        //https://developer.mozilla.org/ja/docs/Web/API/AudioContext/decodeAudioData
        decodedAudioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);
        //audioBufferSourceNode.buffer = null;
        audioBufferSourceNode.buffer = decodedAudioBuffer;
        audioBufferSourceDuration = audioBufferSourceNode.buffer.duration;
        console.log("audioBufferSourceDuration: " + audioBufferSourceDuration);

        //preparation
        audioBufferSourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        //play
        audioStartAt = Date.now();
        //playbackStartAudioContextTimeStamp = audioCtx.currentTime; //preciser than Date.now()
        audioBufferSourceNode.start(0);

        isPlaying = true;
        showPauseIcon(true);
        printAudioInformation();
        nowPlayingSongID = selectedSongID;

    } catch (error) {
        console.log(error);
    }

    // report the state of the audio context to the
    // console, when it changes
    audioCtx.onstatechange = function () {
        console.log(audioCtx.state);
    }

}


Object.defineProperty(this, "rePlaySong", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: async () => {

        // in playing
        if (isPlaying) {
            audioBufferSourceNode.disconnect();
            await audioCtx.close();
        }

        // initialize audio context
        if (audioCtx.state === "closed") initAudioContext();

        // initialize audio source Buffer
        initAudioBufferSourceNode();

        //play
        audioStartAt = Date.now();
        audioBufferSourceNode.start(0);

        isPlaying = true;
        showPauseIcon(true);
        printAudioInformation();
    }
});


// get song id randomly
Object.defineProperty(this, 'getRandomSongID', {
    enumerable: false,
    configurable: false,
    value: () => {
        while (true) {
            const randomPosition = Math.floor(Math.random() * (rows.length - 1)) + 1;
            const randomSongID = rows[randomPosition].cells[0].innerText;

            // return only if the both IDs are different.
            if (parseInt(nowPlayingSongID) !== parseInt(randomSongID)) {
                console.log(randomPosition, randomSongID);
                return randomSongID;
            }
        }
    }
});


Object.defineProperty(this, "showPauseIcon", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: (show) => {
        if (show) {
            audioPauseButton.classList.remove("hidden");
            startBtn.classList.add("hidden");
        } else {
            audioPauseButton.classList.add("hidden");
            startBtn.classList.remove("hidden");
        }
    }
});


/***************** INITIALIZATION **********************/

//init audio context on load
Object.defineProperty(this, 'initAudioContext', {
    enumerable: false,
    configurable: false,
    value: async function () {
        // if it already exists, do nothing.
        if (!audioCtx === undefined) return;

        // create web audio context
        try {
            AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();


            gainNode = audioCtx.createGain();
            audioBufferSourceNode = audioCtx.createBufferSource();
        } catch (error) {
            console.log(error);
        }

    }
});


function initAudioBufferSourceNode() {
    try {
        //create buffer source once again
        audioBufferSourceNode = audioCtx.createBufferSource();
        audioBufferSourceNode.buffer = decodedAudioBuffer;

        // buffer duration
        audioBufferSourceDuration = audioBufferSourceNode.buffer.duration;

        // connect audio source with gain node
        audioBufferSourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
    } catch (e) {
        console.log(e);
    }
}


/*****************  CORE MODULES **********************/
// Audio
// class Audio {
//
//     constructor(gainNode, source) {
//         this.gainNode = gainNode;
//         this.source = source;
//     }
// }


/***************** PLAYER CONTROLLER **********************/

let playController = {};

Object.defineProperty(playController, "setNextSong", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: () => {
        if (audioRepeatPlay) {
            // do nothing if audioRepeatPlay === true
        } else if (audioRandomPlay) {
            selectedSongID = getRandomSongID();
            printAudioInformation();
        } else if (parseInt(playController.getNextSongID(selectedSongID)) !== 0) { //if it's NOT the last song
            selectedSongID = playController.getNextSongID(selectedSongID);
            printAudioInformation();
        } else {
            console.log("we are on the last song in the list");
        }
    }
});


Object.defineProperty(playController, 'playNextSong', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: async function () {
        if (audioRepeatPlay) { //repeat play
            await rePlaySong();
        } else if (audioRandomPlay) { // random play
            selectedSongID = getRandomSongID();
            await start();
            changeGainVolume();
        } else if (parseInt(playController.getNextSongID(nowPlayingSongID)) === 0) { // the last song
            // do nothing
        } else { //play next song
            selectedSongID = playController.getNextSongID(nowPlayingSongID);
            await start();
            changeGainVolume();
        }
    }
});


Object.defineProperty(playController, 'playPreviousSong', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: async function () {
        if (audioRepeatPlay) { //repeat play
            await rePlaySong();
        } else if (audioRandomPlay) { // random play
            selectedSongID = getRandomSongID();
            await start();
            changeGainVolume();
        } else if (parseInt(playController.getPreviousSongID(nowPlayingSongID)) === 0) { // the first song
            // do nothing
        } else { //play previous song
            selectedSongID = playController.getPreviousSongID(nowPlayingSongID);
            await start();
            changeGainVolume();
        }
    }
});


Object.defineProperty(playController, 'setPreviousSong', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: async function () {
        if (audioRepeatPlay) {
            // do nothing if audioRepeatPlay === true
        } else if (audioRandomPlay) {
            selectedSongID = getRandomSongID();
            printAudioInformation();
        } else if (parseInt(playController.getPreviousSongID(selectedSongID)) !== 0) { //if it's NOT the last song
            selectedSongID = playController.getPreviousSongID(selectedSongID);
            printAudioInformation();
        } else {
            console.log("we are on the first song in the list");
        }
    }
});


// get next song id. return 0 for the next song of the last song.
Object.defineProperty(playController, 'getNextSongID', {
    enumerable: false,
    configurable: false,
    value: (id) => {
        for (const key in Array.prototype.slice.call(rows)) {
            if (parseInt(key) === rows.length - 1) return 0; // if it's the last element in table, return 0. because there's no nextSong.
            if (parseInt(key) === 0) continue; // ignore the first row. it's for title.
            if (rows[key].cells[0].innerText === id) {
                const nextSongID = rows[parseInt(key) + 1].cells[0].innerText;
                console.log(nextSongID);
                return nextSongID;
                //return rows[parseInt(key) + 1].cells[0].innerText;
            }
        }
    }
});


//get previous song id. return 0 for the previous song of the first song.
Object.defineProperty(playController, 'getPreviousSongID', {
    enumerable: false,
    configurable: false,
    value: (id) => {
        for (const key in Array.prototype.slice.call(rows)) {

            if (parseInt(key) === 0) continue; // ignore the first row. it's for title.

            if (rows[key].cells[0].innerText === id) {
                const previousSongID = rows[parseInt(key) - 1].cells[0].innerText;
                console.log(previousSongID);
                return (parseInt(key) === 1) ? 0 : previousSongID; //if it's the first song in the table, return 0. because there's not previous song
            }
        }
    }
});


/*****************  **********************/



//play back position
let audioPlaybackPositionRatio;
//let playbackStartAudioContextTimeStamp;
let audioPlaybackPositionControlSlider = document.querySelector("#audioPlaybackPositionControlSlider");
let audioPlaybackPositionDisplay = document.querySelector("#audioPlaybackPositionDisplay");

// initial setup
audioPlaybackPositionDisplay.innerText = audioPlaybackPositionControlSlider.value;
audioPlaybackPositionControlSlider.addEventListener("change", changeAudioPlaybackPosition, false);

function changeAudioPlaybackPosition() {

    // get ratio
    audioPlaybackPositionRatio = parseFloat(audioPlaybackPositionControlSlider.value);

    // set ratio to display
    audioPlaybackPositionDisplay.innerText = audioPlaybackPositionRatio;

    //calculate exact position in audio source
    audioPausedAt = (audioBufferSourceDuration * audioPlaybackPositionRatio) * 1000;
    console.log("changeAudioPlaybackPosition(), audioPausedAt:  " + audioPausedAt);

    // start & stop audio source
    seekAudioPlaybackPosition();
}


function seekAudioPlaybackPosition() {
    if (isPlaying) { //in playing
        audioBufferSourceNode.stop(0);
        initAudioBufferSourceNode();
        audioStartAt = Date.now() - audioPausedAt;
        audioBufferSourceNode.start(0, audioPausedAt / 1000);
    } else { //in pause, only initialize audio source
        initAudioBufferSourceNode();
        //audioBufferSourceNode.start(0, audioPausedAt / 1000);
    }
}


// suspend/resume the audioContext
// susresBtn.onclick = function () {
//
//     if (audioCtx.state === 'running') {
//         audioCtx.suspend().then(function () {
//             susresBtn.textContent = 'Resume context';
//         });
//     } else if (audioCtx.state === 'suspended') {
//         audioCtx.resume().then(function () {
//             susresBtn.textContent = 'Suspend context';
//         });
//     }
// };


// close the audio context
// stopBtn.onclick = function () {
//     audioCtx.close().then(function () {
//         startBtn.removeAttribute('disabled');
//         susresBtn.setAttribute('disabled', 'disabled');
//         stopBtn.setAttribute('disabled', 'disabled');
//     });
// };


// change gain volume
let audioVolumeControlSlider = document.querySelector("#audioVolumeControlSlider");
let audioVolumeDisplay = document.querySelector("#audioVolumeDisplay");
audioVolumeDisplay.innerText = audioVolumeControlSlider.value;

Object.defineProperty(this, 'changeGainVolume', {
    enumerable: false,
    configurable: false,
    value: function () {
        // if gainNode is not initialized, return.
        if (gainNode === undefined) return;

        //change display
        audioVolumeDisplay.innerText = audioVolumeControlSlider.value;

        //change volume
        gainNode.gain.value = audioVolumeControlSlider.value;
        console.log(audioVolumeControlSlider.value);
    }
});
audioVolumeControlSlider.onchange = () => changeGainVolume();


let audioSourcePlaybackTimeDisplay = document.querySelector("#audioSourcePlaybackTimeDisplay");
let audioPlaybackPositionDisplayDecimal = document.querySelector("#audioPlaybackPositionDisplayDecimal");
let audioPlayBackProgressCounter = document.querySelector("#audioPlayBackProgressCounter");

function displayTime() {
    if (audioCtx && audioCtx.state !== 'closed') {
        timeDisplay.textContent = 'Current CONTEXT time (not audioBufferSourceNode): ' + audioCtx.currentTime.toFixed(3);

        if (isPlaying) {
            if (onMouseDown) {
                // do nothing

            } else {

                let audioPlaybackPositionAutoUpdate = ((Date.now() - audioStartAt) / 1000);
                audioPlaybackPositionDisplayDecimal.textContent = audioPlaybackPositionAutoUpdate.toString();
                audioPlayBackProgressCounter.textContent = timeConverter.secToHourString(audioPlaybackPositionAutoUpdate);

                let audioPlaybackPositionRatioAutoUpdate = audioPlaybackPositionAutoUpdate / audioBufferSourceDuration;
                audioPlaybackPositionControlSlider.value = audioPlaybackPositionRatioAutoUpdate;
                audioPlaybackPositionDisplay.innerText = audioPlaybackPositionRatioAutoUpdate;

                //purple progress bar
                audioPlayBackProgressBar.style = "width: " + audioPlaybackPositionRatioAutoUpdate * 100 + "%";

                // on ended
                if (audioPlaybackPositionAutoUpdate > audioBufferSourceDuration) {
                    isPlaying = false;
                    doOnEnded();

                    playController.playNextSong();
                }

            }
        }

    } else {
        timeDisplay.textContent = 'Current CONTEXT time (not audioBufferSourceNode): not playing. select song'
    }
    requestAnimationFrame(displayTime);
}

displayTime();


function doOnEnded() {

    // reset
    audioPlaybackPositionRatio = 0.0;

    // reset
    audioPlaybackPositionDisplayDecimal.textContent = "0";
    audioPlayBackProgressCounter.textContent = "00:00:00";
    audioPlaybackPositionControlSlider.value = 0;
    audioPlaybackPositionDisplay.textContent = "0";
    audioPlayBackProgressBar.style = "width: 0%";

    //close audio context
    audioBufferSourceNode.disconnect();
    audioCtx.close();
}


// convert second to hh:mm:ss
// class TimeConverter {
//     secToHour(time) {
//         const hour = Math.floor(time / 3600);
//         const min = Math.floor(time / 60 % 60);
//         const sec = Math.floor((time % 60) % 60);
//
//         return {
//             hour: hour,
//             min: min,
//             sec: sec
//         }
//     }
//
//     secToHourString(time) {
//         const t = this.secToHour(time);
//         const hour = t.hour > 9 ? t.hour : "0" + t.hour;
//         const min = t.min > 9 ? t.min : "0" + t.min;
//         const sec = t.sec > 9 ? t.sec : "0" + t.sec;
//         return hour + ":" + min + ":" + sec;
//     }
// }
//
// const timeConverter = new TimeConverter();


/***************** TIME CONVERTER **********************/

// convert second to hh:mm:ss
Object.defineProperty(this, "TimeConverter", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: () => {
        return {
            secToHourString: (time) => {
                const t = {
                    hour: Math.floor(time / 3600),
                    min: Math.floor(time / 60 % 60),
                    sec: Math.floor((time % 60) % 60),
                };
                const hour = t.hour > 9 ? t.hour : "0" + t.hour;
                const min = t.min > 9 ? t.min : "0" + t.min;
                const sec = t.sec > 9 ? t.sec : "0" + t.sec;
                return hour + ":" + min + ":" + sec;
            }
        }
    }
});
const timeConverter = TimeConverter();


/*****************  **********************/


// detect mousedown & up
let onMouseDown = false;
window.addEventListener("mousedown", () => {
    onMouseDown = true;
    console.log("mouseDown");
}, false);

window.addEventListener("mouseup", () => {
    onMouseDown = false;
    console.log("mouseup");
}, false);


//progress bar and progress bar controller
let audioPlayBackProgressBarController = document.querySelector("#audioPlayBackProgressBarController");
let audioPlayBackProgressBar = document.querySelector("#audioPlayBackProgressBar");

audioPlayBackProgressBarController.addEventListener("click", (e) => {
    const ratio = (e.pageX - (audioPlayBackProgressBarController.getBoundingClientRect().left + window.pageXOffset)) / audioPlayBackProgressBarController.clientWidth;
    console.log("ratio:" + ratio);
    audioPlayBackProgressBar.style = "width: " + ratio * 100 + "%";

    //calculate exact position in audio source
    audioPausedAt = (audioBufferSourceDuration * ratio) * 1000;
    console.log("changeAudioPlaybackPosition(): " + audioPausedAt);

    // start & stop audio source
    //TODO: be refactored by (isPlayign) variable.
    //TODO: extract method.

    // if (audioCtx.state === "running") {
    //     audioBufferSourceNode.stop(0);
    //     initAudioBufferSourceNode();
    //     audioStartAt = Date.now() - audioPausedAt;
    //     audioBufferSourceNode.start(0, audioPausedAt / 1000);
    // } else if (audioCtx.state === "suspended") { //TODO: refactor. not needed actually. we dont suspend audio context anymore.
    //     initAudioBufferSourceNode();
    //     audioBufferSourceNode.start(0, audioPausedAt / 1000);
    // }
    seekAudioPlaybackPosition();
});


let audioPlayBackVolumeController = document.querySelector("#audioPlayBackVolumeController");
let audioPlayBackVolumeBar = document.querySelector("#audioPlayBackVolumeBar");
audioPlayBackVolumeController.addEventListener("click", (e) => {
    const ratio = (e.pageX - (audioPlayBackVolumeController.getBoundingClientRect().left + window.pageXOffset)) / audioPlayBackVolumeController.clientWidth;
    console.log("volume ratio:" + ratio);
    audioPlayBackVolumeBar.style = "width: " + ratio * 100 + "%";

    // if gainNode is not initialized, return.
    if (gainNode === undefined) return;

    const maxGain = 3;

    //change display
    audioVolumeDisplay.innerText = maxGain * ratio;

    //change volume
    gainNode.gain.value = maxGain * ratio;
});


//display song list on in table
Object.defineProperty(this, 'displaySongList', {
    enumerable: false,
    configurable: false,
    value: async function () {
        let songList = await getSongList();
        console.log(songList);

        //get div
        let songSelector = document.querySelector("#songSelectorTable");

        // clear previous data
        while (songSelector.lastChild) {
            songSelector.removeChild(songSelector.lastChild);
        }

        //create table
        let table = document.createElement("table");
        table.border = 1;
        table.style = "border: 1px solid #ccc; border-collapse: collapse;";
        table.style = "padding: 10px";
        songSelector.appendChild(table);

        //insert table head ( the first row )
        const songTitle = songList[0]; // use any one for the title. songList looks like 0: {id: 25, title: "title25", artist: "ketsumeishi", album: "album25", year: 2019, …} and then 1: {id: 45, title: "title here", artist: "artist here", album: "album here", year: "year here", …}
        let tr = table.insertRow(-1);

        for (const key of Object.keys(songTitle)) {  // with Object.keys() to get iterable keys. https://www.sejuku.net/blog/27965
            if (key === "created_at") continue; //continue: stop executing code below and continue to next loop;  break: stop executing rest of the loop
            tr.insertCell(-1).innerHTML = key;
        }

        //cell for each song
        for (const song of songList) {
            let tr = table.insertRow(-1);
            for (const [key, value] of Object.entries(song)) {
                if (key === "created_at") continue;
                tr.insertCell(-1).innerHTML = value;
            }
        }
    }
});


Object.defineProperty(this, 'getSongList', {
    enumerable: false,
    configurable: false,
    value: async function () {
        const resource = "/songs";

        let response = await fetch(resource, {
            method: 'GET',
            credentials: "include", //https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {Accept: "application/json"}
        });
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
        let result = await response.json();
        return result;
    }
});


//retrieve song from server
Object.defineProperty(this, 'loadSongFromURL', {
    enumerable: false,
    configurable: false,
    value: async function (songID) {
        const resource = "/songs/" + songID;
        let response = await fetch(resource, {
            method: "GET",
            credentials: "include",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {
                "Accept": "audio/*"
            }
        });

        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        let arrayBuffer = await response.arrayBuffer();
        return arrayBuffer;
    }
});


//post song to server
Object.defineProperty(this, 'postSong', {
    enumerable: false,
    configurable: false,
    value: async function (formData) {

        const resource = "/songs";
        let response = await fetch(resource, {
            method: "POST",
            credentials: "include",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            body: formData,
        });

        //TODO: this works?? shoulb be after (!response.ok) and with await?
        //show response json
        /*
        const result = (response.json()).then(j => {
            return j
        });
         */

        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        const result = await response.json();
        console.log(result);

        return result;
    }
});


//post table contents to server
Object.defineProperty(this, 'postTableContents', {
    enumerable: false,
    configurable: false,
    value: async function (json) {

        const resource = "/songs";
        let response = await fetch(resource, {
            method: "POST",
            credentials: "include",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json"
            },
            body: json,
        });

        //show response json
        /*
        const result = (response.json()).then(j => {
            return j
        });
        */

        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        const result = await response.json();
        console.log(result);

        return result;
    }
});


// delete confirm
let inDeleteConfirmedState = false;
let deleteConfirmBtn = document.querySelector("#deleteConfirmButton");
deleteConfirmBtn.onclick = () => {
    //get table
    //let songSelector = document.querySelector("#songSelectorTable");
    //let rows = songSelector.children[0].rows; //<tr> in <table>

    if (inDeleteConfirmedState) {
        // remove highlights
        removeHighlightsFromTable(rows);

        // change mode
        inDeleteConfirmedState = false;

        // change button
        deleteConfirmBtn.value = "Confirm";

    } else {
        // confirm
        confirmSelectedItemsInTable02(rows);

        // if there are no confirmed items, return
        if (getConfirmedItemsInTable(rows).length === 0) return;

        // change mode
        inDeleteConfirmedState = true;

        // change button
        deleteConfirmBtn.value = "Unconfirm";
    }
};


//delete song
let deleteBtn = document.querySelector("#deleteButton");
deleteBtn.onclick = () => deleteSongs();
let inDeleteSongMode = false;
Object.defineProperty(this, 'deleteSongs', {
    enumerable: false,
    configurable: false,
    value: async function () {

        //get buttons
        let deleteBtn = document.querySelector("#deleteButton");

        //get table
        //let songSelector = document.querySelector("#songSelectorTable");
        //let rows = songSelector.children[0].rows; //<tr> in <table>


        //if it's not in delete song mode, change mode to it.
        if (!inDeleteSongMode) {

            //set mode and button text
            inDeleteSongMode = true;
            deleteBtn.value = "Finish";

            //change visibility
            deleteCancelBtn.style.visibility = "visible";
            deleteConfirmBtn.style.visibility = "visible";

            //remove color
            removeHighlightsFromTable(rows);

        } else { //send request to server

            //get checked item
            let confirmedSongs = getConfirmedItemsInTable(rows);
            console.log(confirmedSongs);

            // if any songs are selected
            if (!(confirmedSongs.length === 0)) {
                // send delete request to server
                for (const song of confirmedSongs) {
                    const id = song[0];
                    await deleteSong(id);
                }
                // reload song list
                displaySongList();
            }

            //change visibility
            deleteCancelBtn.style.visibility = "hidden";
            deleteConfirmBtn.style.visibility = "hidden";

            //reset button text
            deleteBtn.value = "✂";

            // set mode
            inDeleteSongMode = false;
            inDeleteConfirmedState = false;

        }
    }
});


// get selected items
Object.defineProperty(this, 'getConfirmedItemsInTable', {
    enumerable: false,
    configurable: false,
    value: function (rows) {

        //iteration through song table
        return Array.prototype.slice.call(rows).map((row) => {

            // 0. row is for title and it doesn't have to be processed.
            // 7. cell is for checkbox
            if (!(row.rowIndex === 0) && (row.classList.contains("toBeDeletedSong"))) {
                return Array.prototype.slice.call(row.cells).map((cell) => {
                    return cell.innerText;
                });
            }
        }).filter(e => !(e === undefined)); //return only "not" undefined
    }
});


// get selected items
Object.defineProperty(this, 'confirmSelectedItemsInTable02', {
    enumerable: false,
    configurable: false,
    value: function (rows) {
        //iteration through song table
        Array.prototype.slice.call(rows).map((row) => {
            // 0. row is for title and it doesn't have to be processed.
            // 7. cell is for checkbox
            if (!(row.rowIndex === 0) && (row.classList.contains("greenYellow"))) {
                row.classList.add("toBeDeletedSong");
            }
        });
    }
});


// get id for the first item
Object.defineProperty(this, 'getFirstSongID', {
    enumerable: false,
    configurable: false,
    value: function () {
        return rows[1].cells[0].innerText;
    }
});

// get song info
Object.defineProperty(this, 'getSongInfo', {
    enumerable: false,
    configurable: false,
    value: (id) => {
        for (const tr of Array.prototype.slice.call(rows)) {
            if (tr.cells[0].innerText === id) {
                return {
                    id: tr.cells[0].innerText,
                    title: tr.cells[1].innerText,
                    artist: tr.cells[2].innerText,
                    album: tr.cells[3].innerText,
                    year: tr.cells[4].innerText,
                    genre: tr.cells[5].innerText
                }
            }
        }
    }
});


//send delete request to server
Object.defineProperty(this, 'deleteSong', {
    enumerable: false,
    configurable: false,
    value: async function (id) {

        const resource = "/songs" + "/" + id;
        let response = await fetch(resource, {
            method: "DELETE",
            credentials: "include",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
        });

        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        const result = await response.json();
        console.log(result);

        return result;
    }
});


const selectFileBtn = document.querySelector("#selectFileButton");
const selectFileLabel = document.querySelector("#selectFileLabel");
//selectFileBtn.onchange = () => uploadSongButton(); // not possible to carry parameters??
selectFileBtn.addEventListener('change', uploadSongButton, false); //doesn't work with define property ??

// upload file with button
//TODO: partly overlapped with which for drag and drop
async function uploadSongButton(evt) {

    console.log("hello unloadSong02()");
    console.log(selectFileLabel);


    //assign file from dialog
    //only first file
    let file = evt.target.files[0];

    //get dom
    let dropZoneMessage = document.querySelector("#drop_zone_message");


    if (file.size === 0) { //if file is empty, return false
        dropZoneMessage.innerHTML = "file is empty";
        return false;
    }

    console.log(file);


    //prepare data to upload
    let formData = new FormData();
    formData.append("input_file", file); //data will be sent with this property name

    //disable button while uploading to prevent from multiple click
    selectFileBtn.disable = true;
    selectFileLabel.innerText = "wait";

    //uploading message
    dropZoneMessage.innerHTML = "now uploading: " + file.name;

    try {
        const response = await postSong(formData);
        console.log(response);
    } catch (error) {
        console.log(error);
    }

    //upload finish message
    dropZoneMessage.innerHTML = "upload finished: " + file.name;

    //enable button again
    selectFileBtn.disabled = false;
    selectFileLabel.innerText = "or click here";

    //free memory....
    file = null;
    formData = new FormData();

    //renew song list
    displaySongList();
}


/***************** PLAYER BUTTONS (REWIND & SKIP) **********************/

// abstract player buttons
let playerButtons = {};
let audioSkipButton = document.querySelector("#audioSkipButton");
audioSkipButton.onclick = () => playerButtons.skipSong();
let audioRewindButton = document.querySelector("#audioRewindButton");
audioRewindButton.onclick = () => playerButtons.rewindSong();


Object.defineProperty(playerButtons, "skipSong", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: async () => {
        if (isPlaying) { // in play
            playController.playNextSong();
        } else { // in pause
            playController.setNextSong();
        }
    }
});


Object.defineProperty(playerButtons, "rewindSong", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: () => {
        if (isPlaying) { // in play
            playController.playPreviousSong();
        } else { // in pause
            playController.setPreviousSong();
        }
    }
});


/***************** PLAYER BUTTONS (REPEAT&RANDOM) **********************/
let audioRepeatPlay = false;
let audioRandomPlay = false;
let audioRepeatPlayStatusDisplay = document.querySelector("#audioRepeatPlayStatusDisplay");
let audioRandomPlayStatusDisplay = document.querySelector("#audioRandomPlayStatusDisplay");
let audioRepeatPlayButton = document.querySelector("#audioRepeatPlayButton");
let audioRandomPlayButton = document.querySelector("#audioRandomPlayButton");
audioRepeatPlayButton.onclick = () => playerButtons.setAudioRepeatPlay();
audioRandomPlayButton.onclick = () => playerButtons.setAudioRandomPlay();


Object.defineProperty(playerButtons, "setAudioRepeatPlay", {
    enumerable: false,
    writable: false,
    value: () => {
        if (audioRepeatPlay) {
            audioRepeatPlay = false;
            audioRepeatPlayStatusDisplay.textContent = "OFF";
        } else {
            //enable repeat
            audioRepeatPlay = true;
            audioRepeatPlayStatusDisplay.textContent = "ON";

            //disable random
            audioRandomPlay = false;
            audioRandomPlayStatusDisplay.textContent = "OFF";
        }

    }
});


Object.defineProperty(playerButtons, "setAudioRandomPlay", {
    enumerable: false,
    writable: false,
    value: () => {
        if (audioRandomPlay) {
            audioRandomPlay = false;
            audioRandomPlayStatusDisplay.textContent = "OFF";
        } else {
            // enable random
            audioRandomPlay = true;
            audioRandomPlayStatusDisplay.textContent = "ON";

            //disable repeat
            audioRepeatPlay = false;
            audioRepeatPlayStatusDisplay.textContent = "OFF";
        }

    }
});


/***************** BUTTON **********************/


function showHideListFunction() {
    let x = document.getElementById("showList");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

$(window).on('load', function () { // makes sure the whole site is loaded
    $('#status').fadeOut(); // will first fade out the loading animation
    $('#preloader').delay(500).fadeOut('slow'); // will fade out the white DIV that covers the website.
    checkTouchScreen();
})





