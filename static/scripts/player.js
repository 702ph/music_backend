/*
 * author: Shuya Fuchigami, 554092
 *
 *
 */


/***************** INITIALIZATION **********************/
let rows;
let songSelector = document.querySelector("#songSelectorTable");
let audioInformation = document.querySelector("#audioInformation");

// JWT Token name
const COOKIE_KEY_NAME = "token";

// initial processes at page load
window.addEventListener('load', async function () {

    // if token is in cookie, you're logged in.
    const hasCookie = getTokenFromCookie();
    if (hasCookie) {
        try {
            const loggedInUser = await whoAmI(hasCookie);
            loggedInUserName = loggedInUser.username;
            changeToLoggedInState();

            //display song list
            await displaySongList();

            // set
            rows = songSelector.rows; //<tr> in <table>

            // set songID
            selectedSongID = getFirstSongID(rows);

            printAudioInformation();
            printLyrics(getSongInfo(selectedSongID));
        } catch (e) {
            console.log(e);
        }
    }

    displayTime();

});


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
            AudioVisualizer.analyser = audioCtx.createAnalyser();

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
        console.log("audioBufferSourceDuration: " + audioBufferSourceDuration);

        // connect audio source with analyser, then with gain node
        audioBufferSourceNode.connect(AudioVisualizer.analyser);
        AudioVisualizer.analyser.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // audio analyser settings
        AudioVisualizer.analyser.fftSize = AudioVisualizer.FFT_SIZE;
        AudioVisualizer.analyser.minDecibels = AudioVisualizer.MIN_DECIBELS;
        AudioVisualizer.analyser.maxDecibels = AudioVisualizer.MAX_DECIBELS;
        AudioVisualizer.analyser.smoothingTimeConstant = AudioVisualizer.SMOOTHING;

        //prepare array (doesn't work)
        //AudioVisualizer.frequencyDataArray = new Uint8Array(AudioVisualizer.analyser.frequencyBinCount);
        //AudioVisualizer.timeDataArray = new Uint8Array(AudioVisualizer.analyser.frequencyBinCount);

        // get frequencyBinCount
        AudioVisualizer.bufferLength = AudioVisualizer.analyser.frequencyBinCount;
        console.log(AudioVisualizer.bufferLength);

        // prepare array
        AudioVisualizer.frequencyDataArray = new Uint8Array(AudioVisualizer.bufferLength);
        AudioVisualizer.timeDataArray = new Uint8Array(AudioVisualizer.bufferLength);

        // clear previous analyzer
        canvasCtx.clearRect(0, 0, AudioVisualizer.CANVAS_WIDTH, AudioVisualizer.CANVAS_HEIGHT);

    } catch (e) {
        console.log(e);
    }
}

/***************** COOKIE **********************/

function getTokenFromCookie() {
    let result = null;

    const cookieName = COOKIE_KEY_NAME + '=';
    let allcookies = document.cookie;

    const position = allcookies.indexOf(cookieName);
    if (position != -1) {
        let startIndex = position + cookieName.length;

        let endIndex = allcookies.indexOf(';', startIndex);
        if (endIndex == -1) {
            endIndex = allcookies.length;
        }

        result = decodeURIComponent(
            allcookies.substring(startIndex, endIndex));
    }

    return result;
}


function addPrefix(token) {
    return "JWT " + token;
}


function saveTokenInCookie(token) {
    const key = "token";
    const cookie = key + "=" + token;
    document.cookie = cookie;
}


/***************** AUTHENTIFICATION **********************/

let loggedIn;
let loggedInUserName;
let loginFieldMessage = document.querySelector("#loginFieldMessage");
let loginUserName = document.querySelector('#loginUserName');
let loginPassword = document.querySelector('#loginPassword');
let logInOutButton = document.querySelector('#logInOutButton');
logInOutButton.onclick = () => doLogInOut();


function doLogInOut() {
    if (loggedIn) {
        doLogOut();
    } else {
        doLogIn();
    }
}


async function doLogIn() {
    // if nothing entered, return.
    if (loginUserName.value === "" || loginPassword.value === "") {
        loginFieldMessage.textContent = "User name or Password should not be empty.";
        return;
    }

    //get username and password
    const username = loginUserName.value;
    const password = loginPassword.value;
    console.log(username, password);

    // communicate with server
    try {
        // login to server
        const response = await loginToServer({
            "username": username,
            "password": password
        });
        console.log(response);

        // save access token in cookie
        if (response.access_token) {
            saveTokenInCookie(response.access_token);
            console.log("getTokenFromCookie():", getTokenFromCookie());
        }

        // set
        loggedInUserName = username;

        changeToLoggedInState();

    } catch (error) {
        console.log(error);
        loginFieldMessage.textContent = error.toString();
    }

    // display song list
    try {
        //song list
        await displaySongList();

        //set rows
        rows = songSelector.rows; //<tr> in <table>
    } catch (e){
        console.log(e);
    }

}

function changeToLoggedInState() {
    //status change
    loggedIn = true;

    //clear text field
    loginUserName.value = "";
    loginPassword.value = "";

    //change button
    logInOutButton.value = "logout";

    //log in status message
    loginFieldMessage.textContent = "logged in as: " + loggedInUserName;

    //show buttons
    let editButtons = document.querySelector('#edit_buttons');
    editButtons.classList.remove("hidden");
}


async function doLogOut() {
    // overwrite cookie
    saveTokenInCookie("not logged in")
    console.log("getTokenFromCookie():", getTokenFromCookie());

    // change
    changeToLoggedOutState()

    //clear table
    clearTableContents();
}


function changeToLoggedOutState() {
    //status change
    loggedIn = false;

    //change button
    logInOutButton.value = "login";

    //log in status message
    loginFieldMessage.textContent = "";

    // hide buttons
    let editButtons = document.querySelector('#edit_buttons');
    editButtons.classList.add("hidden");
}


// if token is in cookie, you're logged in.
async function hasToken() {
    if (getTokenFromCookie()) {
        changeToLoggedInState()
    }
}


/***************** CORE VARIABLES etc **********************/

let audioCtx;
let startBtn = document.querySelector('#startAudioContext');
let timeDisplay = document.querySelector('#counter');

// for debug please do not remove
//let susresBtn = document.querySelector('#suspendAudioContext');
//let stopBtn = document.querySelector('#stopAudioContext');
//susresBtn.setAttribute('disabled', 'disabled');
//stopBtn.setAttribute('disabled', 'disabled');

let isPlaying = false;
let selectedSongID;
let nowPlayingSongID;

let gainNode;
let audioBufferSourceNode;
let audioArrayBuffer;
let decodedAudioBuffer;
let audioBufferSourceDuration;
let audioPausedAt = undefined;
let audioStartAt = 0;


/***************** DRAG & DROP **********************/

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
    "dragleave": handleDragLeave,
    "click": uploadSongButton
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
        await displaySongList();
        rows = songSelector.rows;
    } catch (error) {
        console.log(error);
        dropZoneMessage.innerHTML = "Check Error. Detail: " + error;
    }

    //reset style
    handleDragLeave();
}


/***************** UPLOAD BUTTON **********************/

const selectFileBtn = document.querySelector("#selectFileButton");
const selectFileLabel = document.querySelector("#selectFileLabel");
selectFileBtn.addEventListener('change', uploadSongButton, false); //doesn't work with define property ??

// upload file with button
//TODO: partly overlapped with which for drag and drop
async function uploadSongButton(evt) {

    //assign file from dialog. use only the first file
    // for <input type="button">
    //let file = evt.target.files[0];

    // or from original dialog
    let file = await showOpenFileDialog();

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

        //renew song list
        await displaySongList();
        rows = songSelector.rows;

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
}


const showOpenFileDialog = () => {
    return new Promise(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/mp3";

        input.onchange = event => {
            resolve(event.target.files[0]);
        };
        input.click();
    });
};


/***************** TABLE EDITING **********************/

//edit table contents
let inTableEditMode = false
let originalRows;
let editStartBtn = document.querySelector("#editStartButton");
editStartBtn.onclick = () => editTable();
Object.defineProperty(this, 'editTable', {
    enumerable: false,
    configurable: false,
    value: async function () {

        // if in table edit mode, finish the mode and send changes to server.
        if (inTableEditMode) {

            //set cells not editable
            setTableContentsNonEditable(rows);

            // convert to Json
            const json = convertToJson(rows);

            //send to server
            try {
                await postTableContents(json);
            } catch (e) {
                console.log(e);
            }

            //reset button value
            editStartBtn.value = "EDIT";

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
            editStartBtn.value = "EDIT FINISH";


            //save current table contents
            saveCurrentTableRows(rows);

            // make cells editable
            setTableContentsEditable(rows);
        }
    }
});


/*
    accept song map in array and convert to json.
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
        removeHighlightsFromTable(rows);

        //reset visibility
        deleteCancelBtn.style.visibility = "hidden";
        deleteConfirmBtn.style.visibility = "hidden";

        //reset button text
        deleteBtn.value = "CUT";
        deleteConfirmBtn.value = "CONFIRM";

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

        //recovery previous contents. (override current table with previous contents )
        Array.prototype.slice.call(rows).forEach((row, rindex) => {
            Array.prototype.slice.call(row.cells).forEach((cell, cindex) => {
                cell.innerText = originalRows[rindex][cindex];
            });
        });

        //set to non editable
        setTableContentsNonEditable(rows);

        //reset button value
        editStartBtn.value = "EDIT";

        //reset visibility
        editCancelBtn.style.visibility = "hidden";

        //set mode
        inTableEditMode = false;
    }
});


/***************** TABLE (SONG SELECT) **********************/

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
                //document.querySelector("#songIDInput").value = selectedSongID;

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
                //tableDebug.appendChild(ul);

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


/***************** TABLE CONTENTS **********************/

function clearTableContents() {
    while (songSelector.lastChild) {
        songSelector.removeChild(songSelector.lastChild);
    }
}


//display song list on in table
Object.defineProperty(this, 'displaySongList', {
    enumerable: false,
    configurable: false,
    value: async function () {
        let songList = await getSongList();
        console.log(songList);

        //get div
        let songSelector = document.querySelector("#songSelectorTable");

        clearTableContents();

        //create table
        //let table = document.createElement("table");
        songSelector.border = 1;
        songSelector.style = "border: 1px solid #ccc; border-collapse: collapse;";
        songSelector.style = "padding: 10px";
        //songSelector.appendChild(table);

        //insert table head ( the first row )
        const songTitle = songList[0]; // use any one for the title. songList looks like 0: {id: 25, title: "title25", artist: "ketsumeishi", album: "album25", year: 2019, …} and then 1: {id: 45, title: "title here", artist: "artist here", album: "album here", year: "year here", …}
        let tr = songSelector.insertRow(-1);

        for (const key of Object.keys(songTitle)) {  // with Object.keys() to get iterable keys. https://www.sejuku.net/blog/27965
            if (key === "genre") continue;
            if (key === "created_at") continue; //continue: stop executing code below and continue to next loop;  break: stop executing rest of the loop
            tr.insertCell(-1).innerHTML = key;
        }

        //cell for each song
        for (const song of songList) {
            let tr = songSelector.insertRow(-1);
            for (const [key, value] of Object.entries(song)) {
                if (key === "genre") continue;
                if (key === "created_at") continue;
                tr.insertCell(-1).innerHTML = value;
            }
        }
    }
});


/***************** TABLE (SONG DELETION)  **********************/

// delete confirm
let inDeleteConfirmedState = false;
let deleteConfirmBtn = document.querySelector("#deleteConfirmButton");
deleteConfirmBtn.onclick = () => {
    if (inDeleteConfirmedState) {
        // remove highlights
        removeHighlightsFromTable(rows);

        // change mode
        inDeleteConfirmedState = false;

        // change button
        deleteConfirmBtn.value = "CONFIRM";

    } else {
        // confirm
        confirmSelectedItemsInTable(rows);

        // if there are no confirmed items, return
        if (getConfirmedItemsInTable(rows).length === 0) return;

        // change mode
        inDeleteConfirmedState = true;

        // change button
        deleteConfirmBtn.value = "UNCONFIRM";
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

        // change to delete song mode, if not in the mode.
        if (!inDeleteSongMode) {

            //set mode and button text
            inDeleteSongMode = true;
            deleteBtn.value = "FINISH";

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
            deleteBtn.value = "CUT";
            deleteConfirmBtn.value = "CONFIRM";

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


// confirm selected items (=== bold selected item's letter)
Object.defineProperty(this, 'confirmSelectedItemsInTable', {
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


/***************** SERVER COMMUNICATION **********************/

// log in to user
async function loginToServer(userInfo) {

    const resource = "/auth";
    let response = await fetch(resource, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userInfo)
    });
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

    const result = await response.json();
    return result;
}


// get user name
async function whoAmI(username) {
    const resource = "/who";
    let response = await fetch(resource, {
        method: "GET",
        credentials: "omit",
        headers: {
            "Authorization": addPrefix(username)
        }
    });
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

    const result = await response.json();
    return result;
}


//send delete request to server
Object.defineProperty(this, 'deleteSong', {
    enumerable: false,
    configurable: false,
    value: async function (id) {

        const resource = "/songs" + "/" + id;
        let response = await fetch(resource, {
            method: "DELETE",
            credentials: "omit",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {
                "Accept": "audio/*",
                Authorization: addPrefix(getTokenFromCookie())
            }
        });

        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        const result = await response.json();
        console.log(result);

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
            credentials: "omit",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {
                "Accept": "audio/*",
                Authorization: addPrefix(getTokenFromCookie())
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
            credentials: "omit",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {
                // Accept: "application/json",
                "Authorization": addPrefix(getTokenFromCookie())
            },
            body: formData,
        });


        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        const result = await response.json();
        console.log(result);

        return result;
    }
});


Object.defineProperty(this, 'getSongList', {
    enumerable: false,
    configurable: false,
    value: async function () {
        const resource = "/songs";

        let response = await fetch(resource, {
            method: 'GET',
            credentials: "omit", //https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {
                // Accept: "application/json",
                "Authorization": addPrefix(getTokenFromCookie())
            }
        });
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
        let result = await response.json();
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
            credentials: "omit",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: addPrefix(getTokenFromCookie())
            },
            body: json,
        });
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        const result = await response.json();
        console.log(result);
        return result;
    }
});


// Object.defineProperty(this, "getLyrics", {
//     enumerable: false,
//     writable: false,
//     value: (songInfo) => {
//     }
// });


Object.defineProperty(this, 'queryLyrics', {
    value: async function (songInfo) {
        const apikey = "9rKTnZBFvEFwSc6eZHA7a7G7mXsrMyIgu7R4L015Lzv9MG8Af4J3OoI0TJ8VB8xs";
        const resource = "https://orion.apiseeds.com/api/music/lyric/" + songInfo.artist + "/" + songInfo.title + "?apikey=" + apikey;

        let response = await fetch(resource, {
            method: 'GET',
            headers: {
                "Accept": "application/json"}
        });
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        return response.json();
    }
});


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
        //clear lyrics text
        //lyricsText.value = "lyrics here";

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
        //clear lyrics text
        //lyricsText.value = "lyrics here";

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

//debug
//let audioRepeatPlayStatusDisplay = document.querySelector("#audioRepeatPlayStatusDisplay");
//let audioRandomPlayStatusDisplay = document.querySelector("#audioRandomPlayStatusDisplay");

let audioRepeatPlayButton = document.querySelector("#audioRepeatPlayButton");
let audioRepeatPlayButtonActive = document.querySelector("#audioRepeatPlayButtonActive");
let audioRandomPlayButton = document.querySelector("#audioRandomPlayButton");
let audioRandomPlayButtonActive = document.querySelector("#audioRandomPlayButtonActive");

audioRepeatPlayButton.onclick = () => playerButtons.setAudioRepeatPlay();
audioRepeatPlayButtonActive.onclick = () => playerButtons.setAudioRepeatPlay();

audioRandomPlayButton.onclick = () => playerButtons.setAudioRandomPlay();
audioRandomPlayButtonActive.onclick = () => playerButtons.setAudioRandomPlay();


Object.defineProperty(playerButtons, "setAudioRepeatPlay", {
    enumerable: false,
    writable: false,
    configurable: false,
    value: () => {
        if (audioRepeatPlay) {
            audioRepeatPlay = false;
            //audioRepeatPlayStatusDisplay.textContent = "OFF";
            playerButtons.enableAudioRepeatPlayIconStatus(false);
        } else {
            //enable repeat
            audioRepeatPlay = true;
            //audioRepeatPlayStatusDisplay.textContent = "ON";
            playerButtons.enableAudioRepeatPlayIconStatus(true);

            //disable random
            audioRandomPlay = false;
            //audioRandomPlayStatusDisplay.textContent = "OFF";
            playerButtons.enableAudioRandomPlayIconStatus(false);
        }

    }
});


Object.defineProperty(playerButtons, "enableAudioRepeatPlayIconStatus", {
    enumerable: false,
    writable: false,
    configurable: false,
    value: (enable) => {
        if (enable) {
            audioRepeatPlayButton.classList.add("hidden");
            audioRepeatPlayButtonActive.classList.remove("hidden");
        } else {
            audioRepeatPlayButton.classList.remove("hidden");
            audioRepeatPlayButtonActive.classList.add("hidden");
        }
    }
});


Object.defineProperty(playerButtons, "setAudioRandomPlay", {
    enumerable: false,
    writable: false,
    configurable: false,
    value: () => {
        if (audioRandomPlay) {
            audioRandomPlay = false;
            //audioRandomPlayStatusDisplay.textContent = "OFF";
            playerButtons.enableAudioRandomPlayIconStatus(false);
        } else {
            // enable random
            audioRandomPlay = true;
            //audioRandomPlayStatusDisplay.textContent = "ON";
            playerButtons.enableAudioRandomPlayIconStatus(true);

            //disable repeat
            audioRepeatPlay = false;
            //audioRepeatPlayStatusDisplay.textContent = "OFF";
            playerButtons.enableAudioRepeatPlayIconStatus(false);
        }

    }
});


Object.defineProperty(playerButtons, "enableAudioRandomPlayIconStatus", {
    enumerable: false,
    writable: false,
    configurable: false,
    value: (enable) => {
        if (enable) {
            audioRandomPlayButton.classList.add("hidden");
            audioRandomPlayButtonActive.classList.remove("hidden");
        } else {
            audioRandomPlayButton.classList.remove("hidden");
            audioRandomPlayButtonActive.classList.add("hidden");
        }
    }
});


/***************** PLAYER BUTTONS (PAUSE) **********************/

let audioPauseButton = document.querySelector("#audioPauseButton");

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


/***************** AUDIO CONTEXT MAIN  **********************/

audioPauseButton.onclick = () => start();
startBtn.onclick = () => start();

async function start() {

    //TODO: we need this?
    startBtn.setAttribute('disabled', 'disabled');
    startBtn.setAttribute('disabled', 'disabled');

    //debug
    //susresBtn.removeAttribute('disabled');
    //stopBtn.removeAttribute('disabled');

    //debug
    console.log(selectedSongID);
    console.log(nowPlayingSongID);

    // if nowPlayingSongID = selectedSongID are the same, no new song was selected during the playback.
    if (nowPlayingSongID === selectedSongID) {

        // pause when audio is being played.  -> stop playing audio
        if (isPlaying) {

            // pause(stop)
            audioBufferSourceNode.stop(0);

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
            printLyrics(getSongInfo(nowPlayingSongID));
            return;
        }
    }


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

        //https://sbfl.net/blog/2016/07/13/simplifying-async-code-with-promise-and-async-await/
        //await Promise to be solved
        audioArrayBuffer = await loadSongFromURL(selectedSongID);
        console.log(audioArrayBuffer.byteLength);

        // decode audio array buffer
        //because audioArrayBuffer is a Promise Object, you have to wait till it's set to resolved.
        //https://developer.mozilla.org/ja/docs/Web/API/AudioContext/decodeAudioData
        decodedAudioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);

        initAudioBufferSourceNode();

        //play
        audioStartAt = Date.now();
        //playbackStartAudioContextTimeStamp = audioCtx.currentTime; //preciser than Date.now()
        audioBufferSourceNode.start(0);

        isPlaying = true;
        showPauseIcon(true);
        printAudioInformation();
        nowPlayingSongID = selectedSongID;
        printLyrics(getSongInfo(nowPlayingSongID));

    } catch (error) {
        console.log(error);
    }

    // report the state of the audio context to the
    // console, when it changes
    audioCtx.onstatechange = function () {
        console.log("audio context state changed: " + audioCtx.state);
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


/******************** AUDIO VISUALIZER ****************************/

let AudioVisualizer = {};

Object.defineProperties(AudioVisualizer, {
        "analyser": {
            enumerable: false,
            configurable: false,
            writable: true
        },
        "bufferLength": {
            enumerable: false,
            configurable: false,
            writable: true
        },
        "frequencyDataArray": {
            enumerable: false,
            configurable: false,
            writable: true
        },
        "timeDataArray": {
            enumerable: false,
            configurable: false,
            writable: true
        },
        "CANVAS_WIDTH": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: 220 /*650*/
        },
        "CANVAS_HEIGHT": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: 150 /*360*/
        },
        "FFT_SIZE": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: 128 /*2048*/
        },
        "SMOOTHING": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: 0.8
        },
        "MIN_DECIBELS": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: -140
        },
        "MAX_DECIBELS": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: 0
        },
        "canvas": {
            enumerable: false,
            configurable: false,
            writable: true,
            value: document.querySelector("#visualizer")
        },
    }
);

AudioVisualizer.canvas.width = AudioVisualizer.CANVAS_WIDTH;
AudioVisualizer.canvas.height = AudioVisualizer.CANVAS_HEIGHT;
let canvasCtx = AudioVisualizer.canvas.getContext("2d");

Object.defineProperty(AudioVisualizer, "draw", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: () => {
            // clear canvas

            //canvasCtx.fillStyle = "rgba(0, 0, 0, 0)";
            canvasCtx.fillStyle = "rgb(34, 34, 34)";
            canvasCtx.fillRect(0, 0, AudioVisualizer.CANVAS_WIDTH, AudioVisualizer.CANVAS_HEIGHT);

            //draw chart for the frequency domain
            AudioVisualizer.analyser.getByteFrequencyData(AudioVisualizer.frequencyDataArray);

            for (let i = 0; i < AudioVisualizer.bufferLength; i++) {
                let value = AudioVisualizer.frequencyDataArray[i];
                let percent = value / 256;
                let height = AudioVisualizer.CANVAS_HEIGHT * percent;
                let offset = AudioVisualizer.CANVAS_HEIGHT - height - 1;
                let barWidth = AudioVisualizer.CANVAS_WIDTH / AudioVisualizer.bufferLength;
                let hue = i / AudioVisualizer.bufferLength * 360;
                canvasCtx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
                canvasCtx.fillRect(i * barWidth, offset, barWidth, height);
            }

            //draw chart for the time domain

            // AudioVisualizer.analyser.getByteTimeDomainData(AudioVisualizer.timeDataArray);
            // for (let i = 0; i < AudioVisualizer.bufferLength; i++) {
            //     let value = AudioVisualizer.timeDataArray[i];
            //     let percent = value / 256;
            //     let height = AudioVisualizer.CANVAS_HEIGHT * percent;
            //     let offset = AudioVisualizer.CANVAS_HEIGHT - height - 1;
            //     let barWidth = AudioVisualizer.CANVAS_WIDTH / AudioVisualizer.bufferLength;
            //     canvasCtx.fillStyle = 'white';
            //     canvasCtx.fillRect(i * barWidth, offset, 1, 2);
            // }

        }
    }
);


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
            console.log("we are on the last song in the list");
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


// get id for the first item
Object.defineProperty(this, 'getFirstSongID', {
    enumerable: false,
    configurable: false,
    value: function () {
        return rows[1].cells[0].innerText;
    }
});


function getSongInfo(id) {
    for (const tr of Array.prototype.slice.call(rows)) {
        if (tr.cells[0].innerText === id) {
            const songID =
                {
                    id: tr.cells[0].innerText,
                    title: tr.cells[1].innerText,
                    artist: tr.cells[2].innerText,
                    album: tr.cells[3].innerText,
                    year: tr.cells[4].innerText,
                    // genre: tr.cells[5].innerText
                }
            return songID;
        }
    }
}


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


/************************ AUDIO INFORMATION  *****************************/

let audioInformationScrollX = 0;

Object.defineProperty(this, "scrollAudioInformation", {
    enumerable: false,
    writable: false,
    value: () => {

        audioInformation.scrollLeft = ++audioInformationScrollX;
        if (audioInformationScrollX < audioInformation.scrollLeft - audioInformation.clientWidth) {
            setTimeout("scrollAudioInformation()", 20);
        } else {
            audioInformationScrollX = 0;
            audioInformation.scrollLeft = 0;
            setTimeout("scrollAudioInformation()", 20);
        }

    }
});


Object.defineProperty(this, "printAudioInformation", {
    enumerable: false,
    writable: false,
    value: () => {
        const songInfo = getSongInfo(selectedSongID);
        audioInformation.textContent = songInfo.id + ": " + songInfo.artist + " - " + songInfo.title;

        //scrollAudioInformation();
    }
});


let lyricsText = document.querySelector("#lyricsText");
Object.defineProperty(this, "printLyrics", {
    writable: false,
    writable: false,
    configurable: false,
    enumerable: false,
    value: async (songInfo) => {
        try {
            const lyrics = await queryLyrics(songInfo);
            console.log(lyrics);
            lyricsText.textContent = lyrics.result.track.text;
        } catch (error) {
            console.log(error);
            lyricsText.value = "no lyrics found in database";
        }
    }
});


/***************** VOLUME CONTROL BAR **********************/

//todo: let do this function more task. i.e. change icon. bar.
Object.defineProperty(this, 'changeGainVolume', {
    enumerable: false,
    configurable: false,
    value: function (volume) {
        // if gainNode is not initialized, return.
        if (gainNode === undefined) return;

        //change volume
        gainNode.gain.value = volume;
        console.log(gainNode.gain.value);
    }
});

const maxGain = 3;
let audioPlayBackVolumeController = document.querySelector("#audioPlayBackVolumeController");
let audioPlayBackVolumeBar = document.querySelector("#audioPlayBackVolumeBar");
audioPlayBackVolumeController.addEventListener("click", (e) => {

    const ratio = (e.pageX - (audioPlayBackVolumeController.getBoundingClientRect().left + window.pageXOffset)) / audioPlayBackVolumeController.clientWidth;
    console.log("volume ratio:" + ratio);

    //audioPlayBackVolumeBar.style = "width: " + ratio * 100 + "%";
    const gainAdjustment = 0.82; //TODO: must be refactored in the future.
    changePlayBackVolumeBar(ratio * 100 * gainAdjustment);
    changeMuteIcon(ratio * 100);

    // if gainNode is not initialized, return.
    if (gainNode === undefined) return;

    //change display(debug)
    //audioVolumeDisplay.innerText = maxGain * ratio;

    //change volume
    changeGainVolume(maxGain * ratio);
});


function changePlayBackVolumeBar(percent) {
    audioPlayBackVolumeBar.style = "width: " + percent + "%";
    //audioPlayBackVolumeBar.style.setAttribute("width", width);
}


function changeMuteIcon(volume) {
    //if (0 < volume) enableMuteIcon(true);
    if (volume <= 0) {
        volumeBeforeMute = gainNode.gain.value;
        enableMuteIcon(false);
    }
}


/***************** VOLUME MUTE BUTTON **********************/
let volumeIcon = document.querySelector("#volumeIcon");
let muteIcon = document.querySelector("#muteIcon");
let volumeBeforeMute;

volumeIcon.onclick = () => {
    enableMuteIcon(true);
    volumeBeforeMute = gainNode.gain.value;
    changePlayBackVolumeBar(0);
    changeGainVolume(0);
};

muteIcon.onclick = () => {
    enableMuteIcon(false);
    changePlayBackVolumeBar((volumeBeforeMute / maxGain) * 100);
    changeGainVolume(volumeBeforeMute);
};


function enableMuteIcon(enable) {
    if (enable) {
        volumeIcon.classList.add("hidden");
        muteIcon.classList.remove("hidden");
    } else {
        volumeIcon.classList.remove("hidden");
        muteIcon.classList.add("hidden");
    }
}


/***************** PLAY BACK POSITION CONTROL  **********************/

let audioPlaybackPositionRatio;

function seekAudioPlaybackPosition() {
    if (isPlaying) { //in playing
        audioBufferSourceNode.stop(0);
        initAudioBufferSourceNode();
        audioStartAt = Date.now() - audioPausedAt;
        audioBufferSourceNode.start(0, audioPausedAt / 1000);
    } else { //in pause, only initialize audio source
        initAudioBufferSourceNode();
    }
}


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
//audioPlayBackProgressBar.addEventListener("click", (e) => {
    const ratio = (e.pageX - (audioPlayBackProgressBarController.getBoundingClientRect().left + window.pageXOffset)) / audioPlayBackProgressBarController.clientWidth;
    console.log("purple bar ratio:" + ratio);

    const adjustment = 0.96; //TODO: in the future, can be refactored.
    audioPlayBackProgressBar.style = "width: " + (ratio * 100) + "%";

    //calculate exact position in audio source
    audioPausedAt = (audioBufferSourceDuration * ratio) * 1000;
    console.log("changeAudioPlaybackPosition(): " + audioPausedAt);

    // start & stop audio source
    seekAudioPlaybackPosition();
});


/***************** PLAY BACK POSITION DISPLAY & VISUALIZER UPDATE, PROCESS ON PLAY END  **********************/

let audioPlayBackProgressCounter = document.querySelector("#audioPlayBackProgressCounter");

function displayTime() {
    if (audioCtx && audioCtx.state !== 'closed') {
        // we can know here audio contex current time
        //const currentTime = audioCtx.currentTime.toFixed(3)

        if (isPlaying) {
            if (onMouseDown) {
                // do not update during "on mouse down"

            } else {
                //visualizer
                AudioVisualizer.draw();

                // audio playback position in second
                let audioPlaybackPositionAutoUpdate = ((Date.now() - audioStartAt) / 1000);

                // calculate play back position in ratio
                let audioPlaybackPositionRatioAutoUpdate = audioPlaybackPositionAutoUpdate / audioBufferSourceDuration;

                // update slider position, display (debug)
                //updateAudioPlaybackPositionDisplayAndController(audioPlaybackPositionRatioAutoUpdate);
                //updateAudioPlaybackPositionDisplayDecimal(audioPlaybackPositionAutoUpdate);

                // update purple progress bar position
                updateAudioPlayBackProgressBar(audioPlaybackPositionRatioAutoUpdate);

                // time converter (playback position in second to hour)
                timeConverter.setTime(audioPlaybackPositionAutoUpdate);
                audioPlayBackProgressCounter.textContent = timeConverter.getTime();

                // on ended
                if (audioPlaybackPositionAutoUpdate > audioBufferSourceDuration) {
                    isPlaying = false;
                    doOnPlayEnded();
                    playController.playNextSong();
                }

            }
        }

    } else {
        // we are here when audio context is in "closed".
    }
    requestAnimationFrame(displayTime);
}


function updateAudioPlayBackProgressBar(ratio) {
    audioPlayBackProgressBar.style = "width: " + ratio * 100 + "%";
}

function resetAudioPlayBackProgressBar() {
    audioPlayBackProgressCounter.textContent = "00:00:00";
    audioPlayBackProgressBar.style = "width: 0%";
}


Object.defineProperty(this, "doOnPlayEnded", {
    writable: false,
    enumerable: false,
    configurable: false,
    value: async () => {
        // pause button
        showPauseIcon(false);

        // reset
        audioPlaybackPositionRatio = 0.0;
        audioPausedAt = 0.0;

        // reset
        //resetAudioPlaybackPositionDisplayAndController();
        resetAudioPlayBackProgressBar();

        //close audio context
        audioBufferSourceNode.disconnect();
        await audioCtx.close();
    }
});


/***************** VOLUME CONTROL (DEBUG PURPOSE) **********************/

//let audioVolumeDisplay = document.querySelector("#audioVolumeDisplay");
// let audioVolumeControlSlider = document.querySelector("#audioVolumeControlSlider");
// audioVolumeDisplay.innerText = audioVolumeControlSlider.value;

// audioVolumeControlSlider.onchange = () => changeGainVolume();

/***************** PLAY BACK POSITION CONTROL (DEBUG PURPOSE) **********************/
//
// let audioPlaybackPositionControlSlider = document.querySelector("#audioPlaybackPositionControlSlider");
// let audioPlaybackPositionDisplay = document.querySelector("#audioPlaybackPositionDisplay");
//
// // initial setup
// audioPlaybackPositionDisplay.innerText = audioPlaybackPositionControlSlider.value;
// audioPlaybackPositionControlSlider.addEventListener("change", changeAudioPlaybackPosition, false);
//
// function changeAudioPlaybackPosition() {
//
//     // get ratio
//     audioPlaybackPositionRatio = parseFloat(audioPlaybackPositionControlSlider.value);
//
//     // set ratio to display
//     audioPlaybackPositionDisplay.innerText = audioPlaybackPositionRatio;
//
//
//     // if it's just after the page load
//     if (audioBufferSourceDuration === undefined) {
//         //do nothing
//     } else {
//         //calculate exact position in audio source
//         audioPausedAt = (audioBufferSourceDuration * audioPlaybackPositionRatio) * 1000;
//         console.log("changeAudioPlaybackPosition(), audioPausedAt:  " + audioPausedAt);
//     }
//
//     // start & stop audio source
//     seekAudioPlaybackPosition();
// }

/***************** PLAY BACK POSITION DISPLAY (DEBUG PURPOSE) **********************/

// let audioPlaybackPositionDisplayDecimal = document.querySelector("#audioPlaybackPositionDisplayDecimal");
//
// function updateAudioPlaybackPositionDisplayAndController(ratio) {
//     // update slider position
//     audioPlaybackPositionControlSlider.value = ratio;
//
//     // update display
//     audioPlaybackPositionDisplay.innerText = ratio;
// }
//
// function updateAudioPlaybackPositionDisplayDecimal(position) {
//     audioPlaybackPositionDisplayDecimal.textContent = position.toString();
//
// }
//
// function resetAudioPlaybackPositionDisplayAndController(){
//     audioPlaybackPositionDisplayDecimal.textContent = "0";
//     audioPlaybackPositionControlSlider.value = 0;
//     audioPlaybackPositionDisplay.textContent = "0";
// }


/***************** TIME CONVERTER **********************/

// approach on 2.pdf, p24
Object.defineProperty(this, "TimeConverter", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: () => { //function
        let t; // this variable is NOT accessible from outside
        return {
            setTime: (time) => {
                t = {
                    hour: Math.floor(time / 3600),
                    min: Math.floor(time / 60 % 60),
                    sec: Math.floor((time % 60) % 60),
                };
            },
            getTime: () => {
                const hour = t.hour > 9 ? t.hour : "0" + t.hour;
                const min = t.min > 9 ? t.min : "0" + t.min;
                const sec = t.sec > 9 ? t.sec : "0" + t.sec;
                return hour + ":" + min + ":" + sec;
            }
        }
    }
});
const timeConverter = TimeConverter();


/***************** BUTTON **********************/


function showHideListFunction() {
    let x = document.getElementById("showList");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";
    }
}

function showHideLogin() {
    let x = document.getElementById("showLogin");
    if (x.style.display === "block") {
        x.style.display = "none";
    } else {
        x.style.display = "block";

    }
}

/**************** PRELOADER ********************/

$(window).on('load', function () { // makes sure the whole site is loaded
    $('#status').fadeOut(); // will first fade out the loading animation
    $('#preloader').delay(500).fadeOut('slow'); // will fade out the white DIV that covers the website.
    checkTouchScreen();
});




