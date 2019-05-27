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
Object.entries({ "dragover": handleDragOver, "drop": handleFileDropped, "dragleave": handleDragLeave }).map(([key, value]) => {
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
  if (!file.type.match("audio/mp3")){
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
let editBtn = document.querySelector("#editStartButton");
//editBtn.addEventListener("onclick", editTable, false); // what are diferrencies??
editBtn.onclick = () => editTable();

Object.defineProperty(this, 'editTable', {
  enumerable: false,
  configurable: false,
  value: async function () {
    console.log("hello from editTable()");  


    //get table
      let songSelector = document.querySelector("#songSelectorTable");
      let rows = songSelector.children[0].rows //<tr> in <table>


    // if in table edit mode, finish the mode and send changes to server.
    if (inTableEditMode) {

            //iteration to set editable
      Array.from(rows).map((value, index) => {
        //console.log(index, value)

        if (!(index === 0)) { // 0. row is for title

          //a2 = Array.from(value.cells);

          a = Array.prototype.slice.call(value.cells);
          a.forEach((item) => {
            console.log(item)
            item.setAttribute("contenteditable", "false");
          });
        }

      });

      //change button value
      editBtn.value = "&#x1f58c;";

      //set mode
      inTableEditMode = false;


    } else { // if not, change to edit mode

      //set mode
      inTableEditMode = true;

      //change button value
      editBtn.value = "Finish";


      //save original
      originalRows = rows;

      //iteration to set editable=true
      Array.from(rows).map((value, index) => {
        //console.log(index, value)

        if (!(index === 0)) { // 0. row is for title

          //a2 = Array.from(value.cells);

          a = Array.prototype.slice.call(value.cells);
          a.forEach((item) => {
            console.log(item)
            item.setAttribute("contenteditable", "true");
          });
        }

      });
    }
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
      headers: { Accept: "application/json" }
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
    const result = (response.json()).then(j => { return j });

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