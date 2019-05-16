/*
 * author: Shuya Fuchigami, 554092
 *
 *
 *
 */


// update contents once at page load
window.addEventListener('load', function() {
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







//what is promise?
//https://sbfl.net/blog/2016/07/13/simplifying-async-code-with-promise-and-async-await/

//display hello 50000 mili second later
//be mentioned! world will be displayed at first.
setTimeout(() => console.log('hello'), 50000);
console.log('world!');

//an example of promise
const promise = new Promise((resolve, reject) => resolve()); // Promiseを作成し、終了する
promise.then(() => console.log('done!')); // Promiseが終了したら「done!」と表示する

//display hello at first 5000 mili second later,  then world
const promise2 = new Promise((resolve, reject) => {
    setTimeout(() => {
        console.log('hello');
        resolve();
    }, 5000);
});
promise2.then(() => console.log('world!'));




document.addEventListener('click',function(e){
  var t=e.target;
  if(t.nodeName=="TD"){
    Array.prototype.map.call(t.parentNode.parentNode.children,function(x){
      x.classList.remove('skyblue');
      if(x==t.parentNode){
        x.classList.add('skyblue');
        var ch=x.children;
        clickedID = ch[0].textContent;
        document.querySelector("#songIDInput").value = clickedID;
        //songID = clickedID;

        var content="";
        content+="cell1:"+ch[0].textContent+"<br>";
        content+="cell2:"+ch[1].textContent+"<br>";
        content+="cell3:"+ch[2].textContent+"<br>";
        content+="cell4:"+ch[3].textContent;
        document.querySelector('#hoge').innerHTML=content;
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


startBtn.onclick = function(){start()};

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
    //Promiseの前にawaitを書くことで、Promiseの終了を待つことができます。
    //　ーー＞？？　動いてないやん！？
    //let buffer = await response.arrayBuffer();
    let buffer = await getSong(songID);
    console.log(buffer.byteLength);

    /*
    //this doensn't work. reason: see next paragraph
    let decodedAudio = audioCtx.decodeAudioData(buffer);
    audioSource.buffer = decodedAudio;
    */

    //because buffer here is a Promise Object, you have to wait till it's set to settled.
    //https://developer.mozilla.org/ja/docs/Web/API/AudioContext/decodeAudioData
    audioCtx.decodeAudioData(buffer).then((decodedAudio)=> { //(decodedAudio)=>{} means function(decodedAudio){}
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
  audioCtx.onstatechange = function() {
    console.log(audioCtx.state);
  }
}




// suspend/resume the audiocontext
susresBtn.onclick = function() {
  if (audioCtx.state === 'running') {
    audioCtx.suspend().then(function() {
      susresBtn.textContent = 'Resume context';
    });
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(function() {
      susresBtn.textContent = 'Suspend context';
    });
  }
}

// close the audiocontext
stopBtn.onclick = function() {
  audioCtx.close().then(function() {
    startBtn.removeAttribute('disabled');
    susresBtn.setAttribute('disabled', 'disabled');
    stopBtn.setAttribute('disabled', 'disabled');
  });
}


//TODO: 一時停止中の処理などはここを参考にして実装する必要があると思う。
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



/**
 * Displays the given error in the footer, or resets it if none is given.
 * @param error {Object} the optional error
 */
Object.defineProperty(this, "displayError", {
  writable: true,
  value: function(error) {
    let outputElement = document.querySelector("body > footer output");
    if (error) {
      console.error(error);
      outputElement.value = error instanceof Error ? error.message : error;
    } else {
      outputElement.value = "";
    }
  }
});




//retrive song from server
//var songListJson;
Object.defineProperty(this, 'displaySongList', {
  enumerable: false,
  configurable: false,
  value: async function() {

    let songList = await getSongList();
    //getSongList().then( (list) => songListJson=list);
    console.log(songList);

    //let songSelector = document.querySelector("#songTable");
    let songSelector = document.querySelector("#songSelectorTable");
    let table = document.createElement("table")
    table.border = 1;
    table.style="border: 1px solid black; border-collapse: collapse;"
    songSelector.appendChild(table);

    /*
    let tr = table.insertRow(-1);
    let td = tr.insertCell(-1);
    let td2 = tr.insertCell(-1);
    td.innerHTML = "あ";
    td2.innerHTML = "い";
    tr.insertCell(-1).innerHTML = "う";
    */

    for (song of songList) {
      let tr = table.insertRow(-1);
      for (cell of song) {
        tr.insertCell(-1).innerHTML = cell;
      }
    }


  }
});


//retrive song list from server
Object.defineProperty(this, 'getSongList', {
  enumerable: false,
  configurable: false,
  value: async function() {
    const resource = "/songs";

    let response = await fetch(resource, {
      method: 'GET',
      credentials: "include", //https://chaika.hatenablog.com/entry/2019/01/08/123000
      headers: { Accept: "application/json"}
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
  value: async function(songID) {
    //const songID=25; //for debug
    const resource = "/songs/" + songID;
    let response = await fetch(resource, {
      method: "GET",
      credentials: "include",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
      headers: {
        "Accept": "audio/*"
      }
    });
    //https://riptutorial.com/ja/web-audio/example/10926/%E3%82%AA%E3%83%BC%E3%83%87%E3%82%A3%E3%82%AA%E3%82%92%E5%86%8D%E7%94%9F%E3%81%99%E3%82%8B
    /*
    fetch("sound/track.mp3")
        // Return the data as an ArrayBuffer
        .then(response => response.arrayBuffer())
        // Decode the audio data
        .then(buffer => audioCtx.decodeAudioData(buffer))
        .then(decodedData => {
            // ...
        });
      */

    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

    let arrayBuffer = await response.arrayBuffer();
    //console.log(arrayBuffer);
    return arrayBuffer;
  }
});


//post song to server
Object.defineProperty(this, 'postSong', {
  enumerable: false,
  configurable: false,
  value: async function(data) {

    const resource = "/songs"
    let response = await fetch(resource, {
      method: "POST",
      credentials: "include",　//https://chaika.hatenablog.com/entry/2019/01/08/123000
      headers: {
        "Accept": "audio/*"
      }
    });

    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);

    let arrayBuffer = await response.arrayBuffer();
    //console.log(arrayBuffer);
    return arrayBuffer;
  }
});
