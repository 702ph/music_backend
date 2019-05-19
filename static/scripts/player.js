/*
 * author: Shuya Fuchigami, 554092
 *
 *
 *
 */


// update contents once at page load
window.addEventListener('load', function () {
  displaySongList();
});


//let CONTEXT = { audioContext: null };

/**
 * Creates an "abstract" controller.
 */
/*
function Controller () {
	Object.defineProperty(this, 'audioContext', {
		enumerable: true,
		get: () => CONTEXT.audioContext,
		set: object => CONTEXT.audioContext = object
	});
}
*/




//get element in table
document.addEventListener('click', function (e) {
  let t = e.target;
  if (t.nodeName == "TD") {
    Array.prototype.map.call(t.parentNode.parentNode.children, function (x) {
      x.classList.remove('skyblue');

      if (x == t.parentNode) {
        x.classList.add('skyblue');
        let ch = x.children;
        clickedID = ch[0].textContent; //the first children
        document.querySelector("#songIDInput").value = clickedID;

        // clear previous data
        while (tableDebug.lastChild) {
          tableDebug.removeChild(tableDebug.lastChild);
        }

        let ch2 = Array.from(ch);
        let ul = document.createElement("ul");

        ch2.map((value, index, array) => {
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


//have to be korrigiert.
/*
Object.defineProperty(this, 'audioCtx', {
  enumerable: true,
  get: () => this,
  set: object => this = object
});
*/


var audioCtx;
var startBtn = document.querySelector('#startAudioContext');
var susresBtn = document.querySelector('#suspendAudioContext');
var stopBtn = document.querySelector('#stopAudioContext');
var timeDisplay = document.querySelector('#counter');
var clickedID;

susresBtn.setAttribute('disabled', 'disabled');
stopBtn.setAttribute('disabled', 'disabled');


startBtn.onclick = function () { start() };

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
    //this.displayError(error);
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
var btn = document.querySelector("#submit_button");
btn.onclick = function () {
  uploadSong();
}


/**
 * Displays the given error in the footer, or resets it if none is given.
 * @param error {Object} the optional error
 */
Object.defineProperty(this, "displayError", {
  writable: true,
  value: function (error) {
    let outputElement = document.querySelector("body > footer output");
    if (error) {
      console.error(error);
      outputElement.value = error instanceof Error ? error.message : error;
    } else {
      outputElement.value = "";
    }
  }
});



//display song list on viewport
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
    table.style = "border: 1px solid black; border-collapse: collapse;"
    songSelector.appendChild(table);

    //insert title
    const songTitle = songList[0]
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
    btn.disable = true;
    btn.value = "uploading..."

    try {
      const response = await postSong(formData);
      console.log(response);
    } catch (error) {
      console.log(error);
    }

    //enable button again
    btn.disabled = false;
    btn.value = "Submit";
    file.value = null;
    formData = new FormData();

    //renew song list
    displaySongList();
  }
});