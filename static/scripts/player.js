/*
 * author: Shuya Fuchigami, 554092
 *
 *
 */


// update contents once at page load
window.addEventListener('load', function () {
    displaySongList();
});


//set event listner for drop zone
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
    dropZoneMessage.innerHTML = "abc";

    //dropped file list
    let files = evt.dataTransfer.files;

    //check number of files
    const maxFileNum = 1;
    if (files.length > maxFileNum) {
        dropZoneMessage.innerHTML = "currently accepts only one file at time";
        handleDragLeave();
        return;
    }

    //reading file
    //let reader = new FileReader();

    //process only the first file
    //reader.readAsArrayBuffer(files[0]);


    //assign file from form
    //process only the first file
    const file = files[0];

    console.log(file.type);

    //TODO: implement here type check (audio/mpeg)!!
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
    } catch (error) {
        console.log(error);
    }

    //upload finish message
    dropZoneMessage.innerHTML = "uploading finished: " + file.name;

    //reset
    //file = null;
    //formData = new FormData();

    //initialaize style
    handleDragLeave();

    //reload song list
    displaySongList();
}


//edit table contents
let inTableEditMode = false
let originalRows;
let originalTableContents;
let originalSongSelector;
let editStartBtn = document.querySelector("#editStartButton");
//editStartBtn.addEventListener("onclick", editTable, false); // what are diferrencies??
editStartBtn.onclick = () => editTable();


Object.defineProperty(this, 'editTable', {
    enumerable: false,
    configurable: false,
    value: async function () {  //TODO: have to be async??
        console.log("hello from editTable()");

        //get table
        let songSelector = document.querySelector("#songSelectorTable");
        let rows = songSelector.children[0].rows; //<tr> in <table>

        // if in table edit mode, finish the mode and send changes to server.
        if (inTableEditMode) {

            //set cells not editable
            setContentNonEditable(rows);

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
            editStartBtn.value = "Finish";


            //save original //TODO: have to be refactored with deep copy.
            //originalRows = rows;
            //originalRows = Object.assign(rows);

            //originalRows = rows.cloneNode();
            //console.log(originalRows);

            //originalSongSelector = songSelector.cloneNode(true);


            saveCurrentTableRows(rows);


            //TODO:
            let songs = [];
            let songsArray = [];
            let jsons = [];
            let jsonsString = "[";
            Array.prototype.slice.call(rows).forEach((value, index) => {
                if (!(index === 0)) { // 0. row is for title and it doesn't have to be editable


                    let trs = Array.prototype.slice.call(value.cells).map((value, index) => {
                        return (value.innerText);
                    });
                    //console.log(trs);
                    const t = trs;


                    let song =
                        {
                            "id": -1,
                            "title": "",
                            "artist": "",
                            "album": "",
                            "year": "",
                            "genre": "",
                            "created_at": ""
                        };

                    let keys = ["id", "title", "artist", "album", "year", "genre"];
                    let s = new Map();

                    Array.prototype.slice.call(value.cells).forEach((value, index) => {

                        if (!(index === 6)) {

                            //console.log(index +" and " + value.innerText);
                            s.set(keys[index], value.innerText);
                            //console.log(keys[index]);

                            song[index] = value.innerText
                        }
                    });

                    console.log(song); //false. can not reference property in object
                    songsArray.push(song);

                    //TODO: works fine!!
                    console.log(s);
                    songs.push(s);

                    //way 2, convert to json string and push it to json array
                    let j = JSON.stringify(Array.from(s).reduce((sum, [v, k]) => (sum[v] = k, sum), {}));
                    console.log(j);
                    jsons.push(j);

                    //way 3, concatenate json string,
                    jsonsString = jsonsString + j;
                    jsonsString = jsonsString + ",";

                    let p = JSON.parse(j);
                    console.log(p);
                }
            });
            console.log(songs);
            console.log(songsArray);
            console.log(jsons);

            let jsonOfJsons = JSON.stringify(jsons);
            console.log(jsonOfJsons);
            console.log(JSON.parse(jsonOfJsons));

            jsonsString = jsonsString + "]";
            console.log(jsonsString);

            let jsonsStringByJoin = jsons.join(",");
            let jsonsStringByJoinToSend = "[" + jsonsStringByJoin + "]";
            console.log(jsonsStringByJoinToSend);

            console.log(JSON.parse(jsonsStringByJoinToSend)); //動く！！！
            console.log(Array.from(JSON.parse(jsonsStringByJoinToSend))); //変化なし！mapに変換はできていない！


            //test convertToJson
            let testJson = convertToJson(songs);
            convertFromJson(testJson);

            // make cells editable
            Array.prototype.slice.call(rows).forEach((value, index) => {
                if (!(index === 0)) { // 0. row is for title and it doesn't have to be editable
                    value.classList.remove('skyblue'); //remove style sheet

                    Array.prototype.slice.call(value.cells).forEach((cell) => {
                        if (!(cell.cellIndex === 0 || cell.cellIndex === 6)) { //make cells editable except first and last one in the row.
                            cell.setAttribute("contenteditable", "true");
                        }
                    });
                }
            });

        }
    }
});


/*
    accept song map in array and convert to json
 */
Object.defineProperty(this, 'convertToJson', {
    enumerable: false,
    configurable: false,
    value: function (songsInMap) {
        console.log("convert: ", songsInMap);

        let jsonsInArray =
            songsInMap.map((value) => {
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
        //console.log("convertFromJson: ", json);


        //json to object
        const songList = JSON.parse(json);
        //console.log(songList);


        // this is for the "cancel button"
        // keys to garantierted elementen extraktion from object
        const keyOrder = ["id", "title", "artist", "album", "year", "genre"];

        //oh forEach works!?
        songList.forEach((item) => {
            //console.log(item);

            for (const key of keyOrder) {
                //console.log(key);
                //console.log(item[key]);
            }

        });


        //TODO:なんとこれでreferenceを断ち切れるのではないか！？
        //→しかし、これをcancel時にTableに代入した際、このarrayがreferrenceされてしまい、ややこしいことになるような気もしなくもない。
        let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        let newArr = arr.map((item) => {
            return item;
        });
        console.log(arr);
        console.log(newArr);
        arr[0] = 10;
        console.log(arr);
        console.log(newArr);


        return songList;
    }
});


Object.defineProperty(this, 'saveCurrentTableRows', {
    enumerable: false,
    configurable: false,
    value: function (tableRows) {


        //→しかし、これをcancel時にTableに代入した際、このarrayがreferrenceされてしまい、ややこしいことになるような気もしなくもない。
        let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        let newArr = arr.map((item) => {
            return item;
        });
        console.log(arr);
        console.log(newArr);
        arr[0] = 10;
        console.log(arr);
        console.log(newArr);


        // get contents in table
        originalRows = Array.prototype.slice.call(tableRows).map((row) => {
            return Array.prototype.slice.call(row.cells).map((cell) => {
                return cell.innerText;
            });
        });
        console.log(originalRows);

        //originalRows = tableRowsMap;
    }
});


Object.defineProperty(this, 'setContentNonEditable', {
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


let editCancelBtn = document.querySelector("#editCancelButton");
editCancelBtn.onclick = () => cancelEditTable();

Object.defineProperty(this, 'cancelEditTable', {
    enumerable: false,
    configurable: false,
    value: function () {
        //get table
        let songSelector = document.querySelector("#songSelectorTable");

        //<tr> in <table>
        let rows = songSelector.children[0].rows;


        //recovery previous contents. (override current table with previous contents )
        Array.prototype.slice.call(rows).forEach((row, rindex)=>{
            Array.prototype.slice.call(row.cells).forEach((cell, cindex)=>{
                cell.innerText = originalRows[rindex][cindex];
            });
        });


        //set to non editable
        setContentNonEditable(rows);

        //reset button value
        editStartBtn.value = "🖋";

        //reset visibility
        editCancelBtn.style.visibility = "hidden";

        //set mode
        inTableEditMode = false;
    }
});


//get element in table
document.addEventListener('click', function (e) {

    if (inTableEditMode) return; // if in table edit mode return;


    let t = e.target;
    if (t.nodeName == "TD") {
        Array.prototype.map.call(t.parentNode.parentNode.children, function (x) {
            x.classList.remove('skyblue');

            //TODO: avoid 0 row to be colored
            if (x == t.parentNode) {
                x.classList.add('skyblue');
                let ch = x.children;
                clickedID = ch[0].textContent; //the first children for id
                document.querySelector("#songIDInput").value = clickedID;

                // clear previous data
                while (tableDebug.lastChild) {
                    tableDebug.removeChild(tableDebug.lastChild);
                }

                //convert HTMLCollection to array
                let ch2 = Array.from(ch);
                let ul = document.createElement("ul");

                ch2.map((value, index) => {
                    //console.log({index, value});
                    const li = document.createElement("li");
                    li.innerHTML = index + ": " + value.textContent;
                    ul.appendChild(li);
                });

                document.querySelector('#tableDebug').appendChild(ul);
            }
        });
    }
});


var audioCtx;
var startBtn = document.querySelector('#startAudioContext');
var susresBtn = document.querySelector('#suspendAudioContext');
var stopBtn = document.querySelector('#stopAudioContext');
var timeDisplay = document.querySelector('#counter');
var clickedID;

susresBtn.setAttribute('disabled', 'disabled');
stopBtn.setAttribute('disabled', 'disabled');
startBtn.onclick = () => start();


async function start() {
    startBtn.setAttribute('disabled', 'disabled');
    susresBtn.removeAttribute('disabled');
    stopBtn.removeAttribute('disabled');

    //let songID = document.querySelector("#songIDInput").value;
    songID = clickedID;
    //document.querySelector("#songIDInput").value = clickedID;
    console.log(songID);

    try {
        // create web audio api context
        AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        let gainNode = audioCtx.createGain();
        let audioSource = audioCtx.createBufferSource();


        //https://sbfl.net/blog/2016/07/13/simplifying-async-code-with-promise-and-async-await/
        //await Promise to be solved
        let buffer = await getSong(songID);
        console.log(buffer.byteLength);

        //because buffer is a Promise Object, you have to wait till it's set to settled.
        //https://developer.mozilla.org/ja/docs/Web/API/AudioContext/decodeAudioData
        audioCtx.decodeAudioData(buffer).then((decodedAudio) => { //(decodedAudio)=>{} means function(decodedAudio){}
            audioSource.buffer = decodedAudio;
            console.log(decodedAudio);
        }).catch((error) => console.log(error));

        //preparation
        audioSource.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        //play
        audioSource.start(0);

    } catch (error) {
        console.log(error);
    }

    // report the state of the audio context to the
    // console, when it changes
    audioCtx.onstatechange = function () {
        console.log(audioCtx.state);
    }
}


// suspend/resume the audiocontext
susresBtn.onclick = function () {
    if (audioCtx.state === 'running') {
        audioCtx.suspend().then(function () {
            susresBtn.textContent = 'Resume context';
        });
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(function () {
            susresBtn.textContent = 'Suspend context';
        });
    }
}

// close the audiocontext
stopBtn.onclick = function () {
    audioCtx.close().then(function () {
        startBtn.removeAttribute('disabled');
        susresBtn.setAttribute('disabled', 'disabled');
        stopBtn.setAttribute('disabled', 'disabled');
    });
}


//TODO: 一時停止中の処理などはここを参考にして実装する必要があると思う。
//have to implement process during pause
//https://www.tcmobile.jp/dev_blog/programming/web-audio-api%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%A6%E7%B0%A1%E5%8D%98%E3%81%AA%E3%83%97%E3%83%AC%E3%82%A4%E3%83%A4%E3%83%BC%E3%82%92%E4%BD%9C%E3%81%A3%E3%81%A6%E3%81%BF%E3%82%8B%EF%BC%883%EF%BC%89/

function displayTime() {
    if (audioCtx && audioCtx.state !== 'closed') {
        timeDisplay.textContent = 'Current context time: ' + audioCtx.currentTime.toFixed(3);
    } else {
        timeDisplay.textContent = 'Current context time: No context exists.'
    }
    requestAnimationFrame(displayTime);
}

displayTime();


//upload song button
var submitBtn = document.querySelector("#submit_button");
submitBtn.onclick = () => uploadSong();


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
        let table = document.createElement("table")
        table.border = 1;
        table.style = "border: 1px solid #ccc; border-collapse: collapse;"
        songSelector.appendChild(table);

        //insert title (table head)
        const songTitle = songList[0]; // take one you want. songList looks like 0: {id: 25, title: "title25", artist: "ketsumeishi", album: "album25", year: 2019, …} and then 1: {id: 45, title: "title here", artist: "artist here", album: "album here", year: "year here", …}
        let tr = table.insertRow(-1);
        const songMap = new Map(Object.entries(songTitle));  //https://www.sejuku.net/blog/21812#Map
        for (value of songMap.keys()) {
            tr.insertCell(-1).innerHTML = value;
        }

        //insert cell for songs
        for (song of songList) {
            let tr = table.insertRow(-1);

            //convert Object to Map so that it's iteratable
            const songMap = new Map(Object.entries(song));  //https://www.sejuku.net/blog/21812#Map
            for (value of songMap.values()) {
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


//retrive song from server
Object.defineProperty(this, 'getSong', {
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

        const resource = "/songs"
        let response = await fetch(resource, {
            method: "POST",
            credentials: "include",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
            body: formData,
        });

        //show response json
        const result = (response.json()).then(j => {
            return j
        });

        //TODO: this should be over "show response json?"
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

        return result;
    }
});


//upload song to server
Object.defineProperty(this, 'uploadSong', {
    enumerable: false,
    configurable: false,
    value: async function (data) {

        //assign file from form
        const file = document.querySelector("#input_file");
        if (!file.value) { //if file is empty, return false
            return false;
        }

        //prepare data to upload
        let formData = new FormData();
        formData.append("input_file", file.files[0]);

        //disable button while uploading
        submitBtn.disable = true;
        submitBtn.value = "uploading..."

        try {
            const response = await postSong(formData);
            console.log(response);
        } catch (error) {
            console.log(error);
        }

        //enable button again
        submitBtn.disabled = false;
        submitBtn.value = "Submit";
        file.value = null;
        formData = new FormData();

        //renew song list
        displaySongList();
    }
});