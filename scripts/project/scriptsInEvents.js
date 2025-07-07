// let value = 1;

// function langreturn() {

// 	return value;

// }


// function toggleValue(){
//     if(value === 1){
//         value = 0;
//     } else if(value === 0){
//         value = 1;
//     }
    
//     console.log("Updated Value!", value);
// }



import "https://unpkg.com/colyseus.js@0.14.13/dist/colyseus.js";

// let URL_NgRock = "wss://c5c7-103-173-24-3.ngrok-free.app"
let URL_DEV = "ws://localhost:3664";
let URL_QA = "wss://mvp-android.freakx.in";
var URL_BETA = "ws://143.244.135.205:3664";
let client = new Colyseus.Client(URL_QA);
let room;
let playerCount = 0;
let playerID;
let _gameOver = false;
let globalBullet = 0;
let isBowling = false;
let isBallHitWithBat = false;
let globalName;
let globalFrame;
let globalJersey;
let globalMatchCode;
let rematchFlow = false;
let randomJear;
let randomJearString;

let online = false;
let connected = navigator.onLine; 

let REMATCH_POPUP = {
  IDLE: -1,
  HIDE: 0,
  SHOW: 1,
};
let REMATCH_REPLY = {
  IDLE: -1,
  NO: 0,
  YES: 1,
};
let CREATE_REMATCH_CONSENSUS = {
  IDLE: -1,
  NO: 0,
  YES: 1,
};
let BOT_STATUS = {
  IDLE: -1,
  JOINED: 1,
};

let isPlayingWithBot = BOT_STATUS.IDLE;


//////////////////////////

function joinMatch(dummy, joinCode, name, frame, jearsy) {
  console.log("dummy: ", dummy);
  console.log("Join code: ", joinCode);
  onLoad(name, frame, jearsy, String(joinCode), "join");
}

function createMatch(dummy, createCode, name, frame, jearsy) {
  console.log("dummy: ", dummy);
  console.log("Create code: ", createCode);
  onLoad(name, frame, jearsy, String(createCode), "create");
}

//////////////////////////


	function onLoad(name, frame, jearsy, matchCode, joinOrCreateOrPlayOnline = "playOnline") { // 0000
  console.log("Match Code: ", matchCode);
  randomJear = Math.floor(Math.random() * 10);
  randomJearString = randomJear.toString();
  console.log(randomJearString);

  // if (rematchFlow) return;
  globalName = name;
  globalFrame = frame;
  globalJersey = jearsy;
  globalMatchCode = String(matchCode);
  console.log(
    `Col -> Name: ${globalName}, Frame: ${globalFrame}, Jersey: ${globalJersey}, MatchCode: ${globalMatchCode}`
  );

  if (jearsy == null) globalJersey = randomJearString;

  if (joinOrCreateOrPlayOnline == "join") {
    client
      .join("myRoom", {
        playerName: globalName,
        playerFrame: globalFrame,
        playerJersey: globalJersey,
        playerMatchCode: globalMatchCode,
      })
      .then((room_instance) => {
        c3_callFunction("forping",[]);
        console.log("Global Match Code Code: ", globalMatchCode);
        room = room_instance;
        console.log("Room details: ", room);
        console.log(room.sessionId, "joined", room.name);
        console.log(`Colysesus: v7 `);
		
        c3_callFunction("checkSessionID", [room.id]);
        c3_callFunction("serverConnected", []);

        // listen to patches coming from the server
        room.state.players.onAdd = function (player, key) {
          //create Player in the game
          playerCount++;
          // console.log(`Colysesus Rec: ${JSON.stringify(player)} joined`);
          if (room.sessionId === room_instance.sessionId) {
            console.log(
              `Colysesus Rec: ${player.name} joined as ${player.playingAs}, frame: ${player.frame}`
            );
            if (player.playingAs == "bowler")
              c3_callFunction("bowlerInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
            else if (player.playingAs == "batsman")
              c3_callFunction("batsmanInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
          }
          setBallHitWithBat(false);
          if (playerCount == 2) {
            console.log(
              `Colysesus Rec: Both Player Connected > statdium ${room.state.stadium}`
            );
            c3_callFunction("bothPlayerConnected", [room.state.stadium]);
          }

          player.listen("playingAs", (playingAs) => {
            if (player.playingAs == "bowler") {
              console.log(`Colysesus Rec: Playing as bowler`);
              // isBowling = true;
              c3_callFunction("bowlerInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
            } else if (player.playingAs == "batsman") {
              console.log(`Colysesus Rec: Playing as batsman`);
              // isBowling = false;
              c3_callFunction("batsmanInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
            }
          });
          player.listen("triggerBallingAction", (triggerBallingAction, previousTriggerBallingAction) => {
            if (key === room.sessionId) {
              if (triggerBallingAction) {
                console.log(`Colysesus Rec: Start balling animation`);
                c3_callFunction("triggerBallAction", [0]);
              }
            }
          }
          );
          player.listen("enableBatting", (enableBatting, previousEnableBatting) => {
            if (key === room.sessionId) {
              if (enableBatting) {
                console.log(`Colysesus Rec: Enable batting on batsman`);
                c3_callFunction("batTurn", []);
              }
            }
          }
          );
          player.listen("triggerBatingAction", (triggerBatingAction, previousTriggerBatingAction) => {
            if (key === room.sessionId) {
              if (triggerBatingAction) {
                console.log(
                  `Colysesus Rec:Start batting animation on baller  -> ${Date.now()}`
                );
                c3_callFunction("getBattingDone", [globalBullet]);
              }
            }
          }
          );

          player.listen("ballX", (ballX, previousballX) => {
            if (key === room.sessionId && ballX > 0) {
              console.log(
                ` Colysesus Rec: Miss value received from batsman: ${ballX}`
              );
              c3_callFunction("getBallX", [ballX]);
            }
          });

          player.listen("run", (run, previousScore) => {
            if (player.playingAs == "batsman") {
              console.log(` Colysesus Rec: Run By batsman: ${run}`);
              c3_callFunction("batScore", [run]);
            }
          });
          //new match requested by player A - Called on A
          player.listen("newMatch", (newMatch) => {
            if (key === room.sessionId && newMatch) {
              console.log(` Colysesus Rec: new match ${newMatch}`);
              LeaveRoom();
              c3_callFunction("newMatch", [0]);
            }
          });
          // Player A tap on rematch button - Called on Player B, shows popup
          player.listen("showRematchPopup", (showRematchPopup) => {
            if (
              key === room.sessionId &&
              showRematchPopup == REMATCH_POPUP.SHOW
            ) {
              console.log(` Colysesus Rematch:===========`);
              console.log(` Colysesus Rematch: Other player ask for rematch`);
              c3_callFunction("askRematch", [0]);
            }
          });
          //On Condition NO by Player B - Called On Player A
          player.listen("replyByOtherPlayerForRematch", (replyByOtherPlayerForRematch) => {
            if (
              key === room.sessionId &&
              replyByOtherPlayerForRematch === REMATCH_REPLY.NO
            ) {
              console.log(
                ` Colysesus Rematch: rematch rejected by other player`
              );
              c3_callFunction("rejectedRematch", [0]);
            }
          }
          );
          //fire Emoji
          player.listen("emojiNumber", (fireEmoji) => {
            console.log("Fire Emoji: ", fireEmoji);

            key == room.sessionId ? null : c3_callFunction("createEmoji", [Math.floor(fireEmoji)]);
          }
          );
        };

        room.state.players.onRemove = function (player, key) {
          console.log("Removing Player", player, key);
          c3_callFunction("userLeft", []);
          LeaveRoom();
        };

        // When turn is changed
        room.state.listen("currentTurn", (key) => {
          setTurn(key);
        });

        // When ball position is set
        room.state.listen("globalBallPos", (position) => {
          if (position > 0) {
            console.log(`Colysesus Rec: Ball position received ${position}`);
            c3_callFunction("getBallPosition", [position]);
          }
        });

        // When ball power is set
        room.state.listen("globalPower", (power) => {
          if (power > 0) {
            console.log(`Colysesus Rec: Power of bowler received ${power}`);
            c3_callFunction("getBallPower", [power]);
          }
        });

        room.state.listen("globalBulletValue", (bulletValue) => {
          if (bulletValue > 0) {
            console.log(
              `Colysesus Rec: Bullet Value of ball received ${bulletValue}`
            );
            globalBullet = bulletValue;
          }
        });

        room.state.listen("draw", () => {
          console.log("Draw Done");
        });
        room.state.listen("winner", (sessionId) => { });

        room.state.listen("gameOver", (gameOver) => {
          console.log(`Colysesus Rec: GameOver ${gameOver}`);
          _gameOver = gameOver;
        });
        room.state.listen("resetGame", (resetGame) => {
          if (resetGame) {
            console.log(`Colysesus Rec: reset ${resetGame}`);
            setBallHitWithBat(false);
            c3_callFunction("resetTurn", [0]);
          }
        });

        room.state.listen("innings", (innings) => {
          if (innings == 1) {
            console.log(`Colysesus Rec: Ist Innings done, turn will change`);
            c3_callFunction("InningDone", []);
          }
        });
        room.state.listen("gameComplete", (gameComplete) => {
          if (gameComplete) {
            console.log(`Colysesus Rec: Game Complete`);
            rematchFlow = true;
            c3_callFunction("gameComplete", []);
          }
        });
        //On Condition YES by Player B - On Player A and Player B
        room.state.listen(
          "allPlayersHaveAgreedToRematch",
          (allPlayersHaveAgreedToRematch) => {
            if (allPlayersHaveAgreedToRematch === CREATE_REMATCH_CONSENSUS.YES) {
              console.log(`Colysesus Rematch: Create a rematch`);
              c3_callFunction("rematch", [0]);
            }
          }
        );

        // room.onStateChange((state) => {
        //   console.log(`Colysesus Rec...state: ${JSON.stringify(state)}`);
        // });
      })
      .catch((e) => {
        console.log(`Colysesus:  something wrong with serverjoin`,e);
        c3_callFunction("invalidRoomCode", []);
      });
  }
  else {
    client
      .joinOrCreate("myRoom", {
        playerName: globalName,
        playerFrame: globalFrame,
        playerJersey: globalJersey,
        playerMatchCode: globalMatchCode,
      })
      .then((room_instance) => {

        console.log("Global Match Code Code: ", globalMatchCode);
        room = room_instance;
        console.log("Room details: ", room);
        console.log(room.sessionId, "joined", room.name);
        console.log(`Colysesus: v7 `);
        c3_callFunction("checkSessionID", [room.id]);
        c3_callFunction("serverConnected", []);

        // listen to patches coming from the server
        room.state.players.onAdd = function (player, key) {
          //create Player in the game
          playerCount++;
          // console.log(`Colysesus Rec: ${JSON.stringify(player)} joined`);
          if (room.sessionId === room_instance.sessionId) {
            console.log(
              `Colysesus Rec: ${player.name} joined as ${player.playingAs}, frame: ${player.frame}`
            );
            if (player.playingAs == "bowler")
              c3_callFunction("bowlerInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
            else if (player.playingAs == "batsman")
              c3_callFunction("batsmanInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
          }
          setBallHitWithBat(false);
          if (playerCount == 2) {
            console.log(
              `Colysesus Rec: Both Player Connected > statdium ${room.state.stadium}`
            );
            c3_callFunction("bothPlayerConnected", [room.state.stadium]);
          }

          player.listen("playingAs", (playingAs) => {
            if (player.playingAs == "bowler") {
              console.log(`Colysesus Rec: Playing as bowler`);
              // isBowling = true;
              c3_callFunction("bowlerInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
            } else if (player.playingAs == "batsman") {
              console.log(`Colysesus Rec: Playing as batsman`);
              // isBowling = false;
              c3_callFunction("batsmanInfo", [
                player.name,
                player.frame,
                player.jersey,
              ]);
            }
          });
          player.listen("triggerBallingAction", (triggerBallingAction, previousTriggerBallingAction) => {
            if (key === room.sessionId) {
              if (triggerBallingAction) {
                console.log(`Colysesus Rec: Start balling animation`);
                c3_callFunction("triggerBallAction", [0]);
              }
            }
          }
          );
          player.listen("enableBatting", (enableBatting, previousEnableBatting) => {
            if (key === room.sessionId) {
              if (enableBatting) {
                console.log(`Colysesus Rec: Enable batting on batsman`);
                c3_callFunction("batTurn", []);
              }
            }
          }
          );
          player.listen("triggerBatingAction", (triggerBatingAction, previousTriggerBatingAction) => {
            if (key === room.sessionId) {
              if (triggerBatingAction) {
                console.log(
                  `Colysesus Rec:Start batting animation on baller  -> ${Date.now()}`
                );
                c3_callFunction("getBattingDone", [globalBullet]);
              }
            }
          }
          );

          player.listen("ballX", (ballX, previousballX) => {
            if (key === room.sessionId && ballX > 0) {
              console.log(
                ` Colysesus Rec: Miss value received from batsman: ${ballX}`
              );
              c3_callFunction("getBallX", [ballX]);
            }
          });

          player.listen("run", (run, previousScore) => {
            if (player.playingAs == "batsman") {
              console.log(` Colysesus Rec: Run By batsman: ${run}`);
              c3_callFunction("batScore", [run]);
            }
          });
          //new match requested by player A - Called on A
          player.listen("newMatch", (newMatch) => {
            if (key === room.sessionId && newMatch) {
              console.log(` Colysesus Rec: new match ${newMatch}`);
              LeaveRoom();
              c3_callFunction("newMatch", [0]);
            }
          });
          // Player A tap on rematch button - Called on Player B, shows popup
          player.listen("showRematchPopup", (showRematchPopup) => {
            if (
              key === room.sessionId &&
              showRematchPopup == REMATCH_POPUP.SHOW
            ) {
              console.log(` Colysesus Rematch:===========`);
              console.log(` Colysesus Rematch: Other player ask for rematch`);
              c3_callFunction("askRematch", [0]);
            }
          });
          //On Condition NO by Player B - Called On Player A
          player.listen("replyByOtherPlayerForRematch", (replyByOtherPlayerForRematch) => {
            if (
              key === room.sessionId &&
              replyByOtherPlayerForRematch === REMATCH_REPLY.NO
            ) {
              console.log(
                ` Colysesus Rematch: rematch rejected by other player`
              );
              c3_callFunction("rejectedRematch", [0]);
            }
          }
          );
          //fire Emoji
          player.listen("emojiNumber", (fireEmoji) => {
            console.log("Fire Emoji: ", fireEmoji);

            key == room.sessionId ? null : c3_callFunction("createEmoji", [Math.floor(fireEmoji)]);
          }
          );
        };

        room.state.players.onRemove = function (player, key) {
          console.log("Removing Player", player, key);
          c3_callFunction("userLeft", []);
          LeaveRoom();
        };

        // When turn is changed
        room.state.listen("currentTurn", (key) => {
          setTurn(key);
        });

        // When ball position is set
        room.state.listen("globalBallPos", (position) => {
          if (position > 0) {
            console.log(`Colysesus Rec: Ball position received ${position}`);
            c3_callFunction("getBallPosition", [position]);
          }
        });

        // When ball power is set
        room.state.listen("globalPower", (power) => {
          if (power > 0) {
            console.log(`Colysesus Rec: Power of bowler received ${power}`);
            c3_callFunction("getBallPower", [power]);
          }
        });

        room.state.listen("globalBulletValue", (bulletValue) => {
          if (bulletValue > 0) {
            console.log(
              `Colysesus Rec: Bullet Value of ball received ${bulletValue}`
            );
            globalBullet = bulletValue;
          }
        });

        room.state.listen("draw", () => {
          console.log("Draw Done");
        });
        room.state.listen("winner", (sessionId) => { });

        room.state.listen("gameOver", (gameOver) => {
          console.log(`Colysesus Rec: GameOver ${gameOver}`);
          _gameOver = gameOver;
        });
        room.state.listen("resetGame", (resetGame) => {
          if (resetGame) {
            console.log(`Colysesus Rec: reset ${resetGame}`);
            setBallHitWithBat(false);
            c3_callFunction("resetTurn", [0]);
          }
        });

        room.state.listen("innings", (innings) => {
          if (innings == 1) {
            console.log(`Colysesus Rec: Ist Innings done, turn will change`);
            c3_callFunction("InningDone", []);
          }
        });
        room.state.listen("gameComplete", (gameComplete) => {
          if (gameComplete) {
            console.log(`Colysesus Rec: Game Complete`);
            rematchFlow = true;
            c3_callFunction("gameComplete", []);
          }
        });
        //On Condition YES by Player B - On Player A and Player B
        room.state.listen(
          "allPlayersHaveAgreedToRematch",
          (allPlayersHaveAgreedToRematch) => {
            if (allPlayersHaveAgreedToRematch === CREATE_REMATCH_CONSENSUS.YES) {
              console.log(`Colysesus Rematch: Create a rematch`);
              c3_callFunction("rematch", [0]);
            }
          }
        );

        // room.onStateChange((state) => {
        //   console.log(`Colysesus Rec...state: ${JSON.stringify(state)}`);
        // });
      })
      .catch((e) => {
        console.log(`Colysesus:  something wrong with servercreate`,e);
        c3_callFunction("ServerNotWorking", []);
      });
  }
}

function LeaveRoom() {
  if (room) {
    room.connection.close();
    room = null;
    ResetEverything();
  } else {
    console.warn("Not connected.");
  }
}

function connectServer() {
  console.log(`Colysesus:  Check if connected`);
  c3_callFunction("serverConnected", [0]);
}
function newMatch() {
  console.log(`Colysesus: gameOver ${_gameOver}`);
  console.log("newmatch fired")
  if (_gameOver) {
    if (room) room.send("newMatch", {});
  } else if (!_gameOver) exitMatch();
}
function rematch() {
  //Ask for Rematch - Click by Player A
  console.log(` Colysesus Rec:===========`);
  console.log(`Colysesus: Ask  for rematch`);
  if (room) room.send("askingForRematchAction", {});
}

function rematchConfirm() {
  //Yes if rematch accepted - Click by Player B
  console.log(`Colysesus Rematch: Send rematch Yes`);
  if (room) room.send("rematchReply", { reply: "yes" });
}
function rematchNo() {
  //No if rematch rejected - Click by Player B
  console.log(`Colysesus Rematch: Send rematch no`);
  if (room) room.send("rematchReply", { reply: "no" });
}

//Lyout loaded get all data
function rematchOrNext() {
  _gameOver = false;
  setBallHitWithBat(false);
  if (room) room.send("rematchOrNext", {});
}

function setTurn(playerId) {
  if (playerId == room.sessionId) {
    console.log("Colysesus: You Bowl!");
    console.log("Colysesus: Opponent Bat!");
    isBowling = true;
    c3_callFunction("ballTurn", [0]);
    c3_callFunction("baller", [0]);
  } else {
    isBowling = false;
    console.log("Colysesus: You Bat!");
    console.log("Colysesus: Opponent Bowl!");
    c3_callFunction("batsman", [0]);
  }
}

//Send Events
function sendBallPosition(arg) {
  if (!_gameOver && isBowling)
    if (room) room.send("ballPosition", { ballPosition: arg });
}

function sendBallPower(arg) {
  if (!_gameOver && isBowling)
    if (room) room.send("ballPower", { ballPower: arg });
}

function sendBattingDone(arg) {
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus Sent: Bullet by Batsman -> ${arg}`);
    setBallHitWithBat(true);
    if (room)
      room.send("bulletValue", {
        bulletValue: arg,
      });
  }
}

function sendRun(arg) {
  console.log(`Colysesus: ${_gameOver} <- RUN -> ${isBowling}`);
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus Sent: Run by Batsman -> ${arg}`);
    if (room) room.send("run", { run: arg });
  }
}

function ballMissed() {
  console.log(
    `Colysesus Sent ${_gameOver}, ${isBowling}, ${IsBallHitWithBat()}`
  );
  if (!_gameOver && !isBowling && !IsBallHitWithBat()) {
    console.log(
      `Colysesus Sent: Auto Ball Miss by Batsman ${IsBallHitWithBat()}`
    );
    if (room) room.send("ballMiss", {});
  }
}
	function emojiClicked(num) {
  if (!_gameOver) {
    console.log(`Emoji number: `, num);
    if (room) {
      room.send("sendEmoji", {
        emojiNumber: num
      })
    };
  }
}

//ballX
function ballX(arg) {
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus Sent: Ball X Miss -> ${arg}`);
    if (room) room.send("ballX", { ballX: arg });
  }
}

function wicketGone() {
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus: Wicket by Batsman `);
    if (room) room.send("ballMiss", {});
  }
}
// Get Events
function displayAds() {}

// for ball miss
function setBallHitWithBat(arg) {
  isBallHitWithBat = arg;
}

function IsBallHitWithBat() {
  return isBallHitWithBat;
}

// "InningDone" - c3function - one player done batting
// "gameComplete" - c3Function - Both batting done

function ResetEverything() {
  console.log(`Colysesus Rematch Reset Everything`);
  playerCount = 0;
  isPlayingWithBot = BOT_STATUS.IDLE;
}

function exitMatch() {
  console.log(`Colysesus Exit Match`);
  LeaveRoom();
  c3_callFunction("newMatch", [0]);
}

function exitMatching() {
console.log(`Colysesus Exit Matching`);
  LeaveRoom();
}

// window.addEventListener("load", () => {
//   hasNetwork(navigator.onLine);

//   window.addEventListener("online", () => {
//     // Set hasNetwork to online when they change to online.
//     hasNetwork(true);
//   });

//   window.addEventListener("offline", () => {
//     // Set hasNetwork to offline when they change to offline.
//     hasNetwork(false);
//   });
// });

// function hasNetwork(online) {
//   if (!online) {
//     c3_callFunction("showOfflineMsg", [0]);
//   }
// }
// if (navigator.onLine) {
//   console.log('online');
// } else {
//   console.log('offline');
//   c3_callFunction("showOfflineMsg", [0]);
// }

// window.addEventListener('offline', function(e) { 

// c3_callFunction("showOfflineMsg", [0]); });

// window.addEventListener('online', function(e) { 

// console.log('online'); });
// function isOnLine(){
//     return navigator.connection.type !== Connection.NONE ; 
// }
// window.addEventListener("online",online.bind(this));
// window.addEventListener("offline",offline.bind(this));
// window.ononline = isOnLine(){console.log("online");}
// window.onoffline = isOnLine(){console.log("offline");}


// let alertOnlineStatus = () => {
//     if (navigator.onLine) {
// //       setDeviceStatusText('You are Online')
// 	  console.log("online")
//     } else {
// //       setDeviceStatusText('You are Offline')
// 	  console.log("offline")
// 	  c3_callFunction("showOfflineMsg", [0]);
//     }
//   };
  
//   window.addEventListener('online', alertOnlineStatus);
//     window.addEventListener('offline', alertOnlineStatus);
// document.addEventListener("deviceready", onDeviceReady, false);

// function onDeviceReady() {
// // Now safe to use device APIs
//   document.addEventListener("online", onOnline, false);
//   document.addEventListener("offline", onOffline, false);
// }

// function onOnline() {
// console.log("online");
//    // User is Online
// }
// function onOffline() {
// c3_callFunction("showOfflineMsg", [0]);
// console.log("offline");
//    // User is Offline
// }
	





function botConnected() {
  isPlayingWithBot = BOT_STATUS.JOINED;
  console.log("Droid -> Exiting room");
  console.log("Droid");

  // as player one joned but didn't find other player so bot kicks in
  if (playerCount > 0) {
    playerCount = 0;
    if (room) {
      room.connection.close();
      room = null;
      console.log(`Colysesus: Bot Connected ${room} `);
    }
  }
}

function sendEvent(eventName, arg) {
  if (isPlayingWithBot != BOT_STATUS.JOINED)
    if (room) room.send(eventName, arg);
}



// Example usage:
// Attach this function to a button click event or any other trigger that you want






const scriptsInEvents = {

	async Both_Event1_Act6(runtime, localVars)
	{
		let jerArr = [runtime.globalVars.BowlerJeasey2];
		jerArr.toString();
		let str= jerArr.toString();
		let strArr= str.split("");
		runtime.globalVars.BowlerJeasey2 = strArr[0];
	},

	async Both_Event1_Act8(runtime, localVars)
	{
		let strName = runtime.globalVars.bowlerNameDummy;
		let chars = strName.slice(0, strName.search(/\d/));
		let numbs = strName.replace(chars, '');
		runtime.globalVars.bowlerNameDummy= chars;
	},

	async Both_Event1_Act9(runtime, localVars)
	{
		console.log("checkbowl",runtime.globalVars.bowlerNameDummy);
	},

	async Both_Event2_Act5(runtime, localVars)
	{
		let jerArr = [runtime.globalVars.BatsmanJeasey2];
		jerArr.toString();
		let str= jerArr.toString();
		let strArr= str.split("");
		runtime.globalVars.BowlerJeasey2 = strArr[0];
	},

	async Both_Event2_Act7(runtime, localVars)
	{
		let strName = runtime.globalVars.batsmanNameDummy;
		let chars = strName.slice(0, strName.search(/\d/));
		let numbs = strName.replace(chars, '');
		runtime.globalVars.batsmanNameDummy= chars;
	},

	async Both_Event2_Act8(runtime, localVars)
	{
		console.log("checkbat",runtime.globalVars.batsmanNameDummy);
	},

	async Both_Event63_Act8(runtime, localVars)
	{
		sendBallPosition(runtime.globalVars.ballLocationX);
	},

	async Both_Event63_Act9(runtime, localVars)
	{
		console.log(runtime.globalVars.ballLocationX, 'ball X from game reset turn');
	},

	async Both_Event140_Act2(runtime, localVars)
	{
		exitMatching();
	},

	async Both_Event141_Act2(runtime, localVars)
	{
		exitMatch();
	},

	async Both_Event143_Act2(runtime, localVars)
	{
		sendBallPower(runtime.globalVars.powerindicatorY);
	},

	async Both_Event145_Act5(runtime, localVars)
	{
		sendBallPosition(runtime.globalVars.ballLocationX);
	},

	async Both_Event145_Act7(runtime, localVars)
	{
		console.log("powerindicator");
	},

	async Both_Event155_Act2(runtime, localVars)
	{
		console.log("powerindicator");
	},

	async Cpl_localization_Event3_Act1(runtime, localVars)
	{
		runtime.setReturnValue(langreturn());
	},

	async Matching_Event3_Act8(runtime, localVars)
	{
		sendEvent("serverNotConnecting");
	},

	async Matching_Event16_Act1(runtime, localVars)
	{
		onLoad(runtime.globalVars.PlayerName, runtime.globalVars.yourFrame,runtime.globalVars.cpl_TeamSelectstring,"0000");
	},

	async Matching_Event73_Act1(runtime, localVars)
	{
		console.log('both players connected from game', 'bg frame', localVars.bgFrame);
	},

	async Matching_Event73_Act13(runtime, localVars)
	{
		sendEvent("realPlayerMatched");
	},

	async Matching_Event78_Act7(runtime, localVars)
	{
		botConnected();
	},

	async Matching_Event78_Act9(runtime, localVars)
	{
		let str = runtime.globalVars.botName;
		str += Math.floor((Math.random() * 1000) + 1);;
		str += ' ';
		runtime.globalVars.botName=str;
	},

	async Matching_Event78_Act14(runtime, localVars)
	{
		let strName = runtime.globalVars.botNameDummy;
		// console.log(strName);
		let chars = strName.slice(0, strName.search(/\d/));
		let numbs = strName.replace(chars, '');
		
		// let splstrName = strName.slice(0,str.search(/\d/));
		// console.log(splstrName);
		runtime.globalVars.botNameDummy= chars;
	},

	async Matching_Event78_Act15(runtime, localVars)
	{
		console.log("check",runtime.globalVars.botNameDummy);
	},

	async Matching_Event78_Act26(runtime, localVars)
	{
		sendEvent("botMatched");
	},

	async Matching_Event145_Act1(runtime, localVars)
	{
		createMatch(runtime.globalVars.createOrNot,runtime.globalVars.roomCodeCreate,runtime.globalVars.PlayerName, runtime.globalVars.yourFrame,runtime.globalVars.cpl_TeamSelectstring);
	},

	async Matching_Event150_Act1(runtime, localVars)
	{
		exitMatch();
	},

	async Game_Event12_Act8(runtime, localVars)
	{
		sendRun(1);
	},

	async Game_Event13_Act8(runtime, localVars)
	{
		sendRun(2);
	},

	async Game_Event14_Act8(runtime, localVars)
	{
		sendRun(3);
	},

	async Game_Event15_Act15(runtime, localVars)
	{
		sendRun(4);
	},

	async Game_Event16_Act14(runtime, localVars)
	{
		sendRun(6);
	},

	async Game_Event28_Act6(runtime, localVars)
	{
		wicketGone();
	},

	async Game_Event38_Act2(runtime, localVars)
	{
		sendBattingDone(runtime.globalVars.batHitValue);
	},

	async Game_Event41_Act3(runtime, localVars)
	{
		console.log("touch2");
	},

	async Game_Event41_Act4(runtime, localVars)
	{
		ballX(runtime.globalVars.ballX);
	},

	async Game_Event107_Act2(runtime, localVars)
	{
		ballMissed();
	},

	async Game_Event115_Act3(runtime, localVars)
	{
		sendBallPosition(runtime.globalVars.ballLocationX);
	},

	async Game_Event115_Act4(runtime, localVars)
	{
		console.log(runtime.globalVars.ballLocationX, 'ball X from game');
	},

	async Game_Event118_Act2(runtime, localVars)
	{
		console.log("touch1");
	},

	async Game_Event118_Act8(runtime, localVars)
	{
		sendBallPower(runtime.globalVars.powerindicatorY);
	},

	async Game_Event128_Act3(runtime, localVars)
	{
		console.log("first time ");
	},

	async Game_Event129_Act3(runtime, localVars)
	{
		sendBallPosition(runtime.globalVars.ballLocationX);
	},

	async Game_Event129_Act4(runtime, localVars)
	{
		console.log(runtime.globalVars.ballLocationX, 'ball X from game reset turn');
	},

	async Game_Event142_Act2(runtime, localVars)
	{
		console.log(runtime.globalVars.cursorXGlobal, 'ballx from server');
	},

	async Game_Event175_Act1(runtime, localVars)
	{
		sendScore(runtime.globalVars.yourScore);
	},

	async Game_Event175_Act2(runtime, localVars)
	{
		showAd();
	},

	async Game_Event177_Act18(runtime, localVars)
	{
		sendEvent("realPlayersMatchComplete");
	},

	async Game_Event181_Act2(runtime, localVars)
	{
		sendEvent("friendMatchComplete");
	},

	async Game_Event186_Act11(runtime, localVars)
	{
		sendEvent("botMatchComplete");
	},

	async Game_Event195_Act2(runtime, localVars)
	{
		newMatch();
	},

	async Game_Event195_Act4(runtime, localVars)
	{
		console.log("newmatch clicked");
	},

	async Game_Event197_Act1(runtime, localVars)
	{
		sendEvent("rematchRequest");
	},

	async Game_Event197_Act2(runtime, localVars)
	{
		rematch();
	},

	async Game_Event201_Act1(runtime, localVars)
	{
		rematchConfirm();
	},

	async Game_Event201_Act2(runtime, localVars)
	{
		console.log("yes clicked");
	},

	async Game_Event202_Act1(runtime, localVars)
	{
		rematchNo();
	},

	async Game_Event203_Act1(runtime, localVars)
	{
		console.log("new match c3");
	},

	async Game_Event206_Act1(runtime, localVars)
	{
		BotMatchDone();
	},

	async Game_Event207_Act1(runtime, localVars)
	{
		console.log("re match c3");
	},

	async Game_Event207_Act3(runtime, localVars)
	{
		sendEvent("rematchStart");
	},

	async Game_Event208_Act1(runtime, localVars)
	{
		exitMatch();
	},

	async Game_Event208_Act2(runtime, localVars)
	{
		console.log("yes exit clicked");
	},

	async Game_Event212_Act1(runtime, localVars)
	{
		rematchOrNext();
	},

	async Game_Event243_Act2(runtime, localVars)
	{
		console.log("stoped cursor 1");
	},

	async Game_Event244_Act3(runtime, localVars)
	{
		console.log("stoped cursor 2");
	},

	async Game_Event279_Act1(runtime, localVars)
	{
		console.log(runtime.globalVars.botLevel);
	},

	async Game_Event448_Act1(runtime, localVars)
	{
		exitMatch();
	},

	async Game_Event450_Act2(runtime, localVars)
	{
		newMatch();
	},

	async Game_Event450_Act3(runtime, localVars)
	{
		console.log("playagain clicked");
	},

	async Game_Event451_Act2(runtime, localVars)
	{
		newMatch();
	},

	async Game_Event451_Act3(runtime, localVars)
	{
		console.log("playagain clicked");
	},

	async Splash_Event9_Act1(runtime, localVars)
	{
		connectServer();
	},

	async Splash_Event10_Act3(runtime, localVars)
	{
		console.log("serevrconnected");
	},

	async Joinorcreate_Event15_Act7(runtime, localVars)
	{
		console.log("newJoin");
	},

	async Joinorcreate_Event15_Act24(runtime, localVars)
	{
		joinMatch(runtime.globalVars.createOrNot,runtime.globalVars.roomCodeJoin,runtime.globalVars.PlayerName, runtime.globalVars.yourFrame,runtime.globalVars.cpl_TeamSelectstring);
	},

	async Joinorcreate_Event16_Act7(runtime, localVars)
	{
		function generateRoomCode() {
		  const chars = '0123456789';
		  let roomCode = '';
		  for (let i = 0; i < 5; i++) {
		    roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
		  }
		  return roomCode;
		}
		
		runtime.globalVars.roomCodeCreate = generateRoomCode();
	},

	async Joinorcreate_Event20_Act2(runtime, localVars)
	{
		console.log("invalidroom");
	},

	async Joinorcreate_Event21_Act2(runtime, localVars)
	{
		console.log("confirm");
	},

	async Cpl_game_Event15_Act2(runtime, localVars)
	{
		cacheAd();
	},

	async Cpl_game_Event15_Act4(runtime, localVars)
	{
		cacheAdRewarded();
	},

	async Cpl_game_Event27_Act4(runtime, localVars)
	{
		console.log("25");
	},

	async Cpl_game_Event102_Act1(runtime, localVars)
	{
		console.log("cpltouch0");
	},

	async Cpl_game_Event166_Act6(runtime, localVars)
	{
		sendEvent("nextTournamentMatch");
	},

	async Cpl_game_Event167_Act5(runtime, localVars)
	{
		sendEvent("singleRestart");
	},

	async Cpl_game_Event197_Act39(runtime, localVars)
	{
		console.log("206");
	},

	async Cpl_game_Event199_Act4(runtime, localVars)
	{
		cacheAd();
	},

	async Cpl_game_Event199_Act6(runtime, localVars)
	{
		cacheAdRewarded();
	},

	async Cpl_game_Event207_Act36(runtime, localVars)
	{
		console.log("214");
	},

	async Cpl_game_Event218_Act37(runtime, localVars)
	{
		console.log("222");
	},

	async Cpl_game_Event279_Act1(runtime, localVars)
	{
		sendScore(runtime.globalVars.cpl_Score);
	},

	async Cpl_game_Event279_Act8(runtime, localVars)
	{
		sendEvent("singleGameOver");
	},

	async Cpl_game_Event295_Act37(runtime, localVars)
	{
		console.log("301");
	},

	async Cpl_game_Event304_Act38(runtime, localVars)
	{
		console.log("310");
	},

	async Cpl_game_Event312_Act38(runtime, localVars)
	{
		console.log("318");
	},

	async Cpl_game_Event353_Act1(runtime, localVars)
	{
		sendEvent("tournamentLose");
	},

	async Cpl_game_Event356_Act2(runtime, localVars)
	{
		sendEvent("tournamentWon");
	},

	async Cpl_game_Event361_Act1(runtime, localVars)
	{
		showAd();
	},

	async Cpl_game_Event366_Act3(runtime, localVars)
	{
		showAdRewarded();
	},

	async Cpl_game_Event430_Act1(runtime, localVars)
	{
		sendScore(runtime.globalVars.cpl_BatsmanScore);
	},

	async Cpl_game_Event430_Act28(runtime, localVars)
	{
		showAd();
	},

	async ["Cpl_vs-Screen_Event3_Act7"](runtime, localVars)
	{
		console.log("cpl code active");
	},

	async ["Cpl_vs-Screen_Event1208_Act1"](runtime, localVars)
	{
		console.log("matched frame");
	},

	async Cpl_splash_Event10_Act3(runtime, localVars)
	{
		sendEvent("splash");
	},

	async Cpl_splash_Event16_Act2(runtime, localVars)
	{
		let str = runtime.globalVars.PlayerName;
		str += Math.floor((Math.random() * 1000) + 1);;
		str += ' ';
		runtime.globalVars.PlayerName=str;
	},

	async Cpl_splash_Event16_Act6(runtime, localVars)
	{
		let strName = runtime.globalVars.playerNameDummy;
		// console.log(strName);
		let chars = strName.slice(0, strName.search(/\d/));
		let numbs = strName.replace(chars, '');
		
		// let splstrName = strName.slice(0,str.search(/\d/));
		// console.log(splstrName);
		runtime.globalVars.playerNameDummy= chars;
	},

	async Cpl_splash_Event16_Act7(runtime, localVars)
	{
		console.log("check",runtime.globalVars.playerNameDummy);
	},

	async Cpl_splash_Event100_Act2(runtime, localVars)
	{
		sendEvent("playSingleMode");
	},

	async Cpl_splash_Event102_Act3(runtime, localVars)
	{
		sendEvent("playMultiplayerMode");
	},

	async Cpl_splash_Event104_Act3(runtime, localVars)
	{
		sendEvent("playTournamentMode");
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;

