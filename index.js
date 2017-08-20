// firebase-admin is what allows us to connect to the Firebase database.
const admin = require('firebase-admin');

// color tools.
const Color = require('color');

// gotta pad those numbers.
const leftPad = require('left-pad');


// A serviceAccount.json file is required to connect to Firebase.
const serviceAccount = require("./serviceAccount.json");

// Initialize the Firebase app. Change the URL below if you're using another Firebase database.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://basedakp48.firebaseio.com"
});

const rootRef = admin.database().ref();

rootRef.child('messages').orderByChild('timeReceived').startAt(Date.now()).on('child_added', (e) => {
  let msg = e.val();
  console.log(msg);
  let text = msg.text.toLowerCase();

	if(text.startsWith('.colorinfo ')) {
    let cmd = text.split(' ');
    cmd.shift();
    let maybeInt = cmd[0];
    let maybeColor = cmd.join(' ');
    if(!maybeInt) {
      return sendMessage(msg, 'Usage: .colorinfo <color>');
    }
    let color;
    let int = null; // to force-fail isNaN if we haven't given a value.
    let hex;

    try {
      color = Color(maybeColor);
    } catch(e) {
      int = Number(maybeInt);
      hex = `#${leftPad(int.toString(16), 6, '0')}`
    }

    if(isNaN(int) && !color) {
      return sendMessage(msg, 'You gave me an invalid value!');
    }

    if((int > 16777215 || int < 0) && !color) {
      return sendMessage(msg, 'Your number must be lower than 16777215 (0xFFFFFF) and greater than 0!');
    }

    if(!color) {
      color = Color(hex);
    } else {
      int = color.rgbNumber().toString();
      hex = color.hex();
    }

    let hsl = color.hsl().string();
    let cmyk = color.cmyk().round().array();
    let rgb = color.rgb().string();

    return sendMessage(msg, `Int: ${int} | RGB: ${rgb} | Hex: ${hex} | HSL: ${hsl} | CMYK: cmyk(${cmyk})`,
      {
        discord_embed: {
          title: "Color Information",
          color: int,
          fields: [
            {
              name: "Integer",
              value: int,
              inline: false
            },
            {
              name: "RGB",
              value: rgb,
              inline: false
            },
            {
              name: "Hex",
              value: hex,
              inline: false
            },
            {
              name: "HSL",
              value: hsl,
              inline: false
            },
            {
              name: "CMYK",
              value: `cmyk(${cmyk})`,
              inline: false
            }
          ]
        }
      }
    );
	}

});

function sendMessage(msg, text, extra) {
  if(!extra) {extra = {};}
  let response = {
    uid: 'basedakp48-plugin-color-tools',
    cid: 'basedakp48-plugin-color-tools',
    text: text,
    channel: msg.channel,
    msgType: 'chatMessage',
    timeReceived: Date.now(),
    extra_client_info: extra
  }

  let responseRef = rootRef.child('messages').push();
  let responseKey = responseRef.key;

  let updateData = {};
  updateData[`messages/${responseKey}`] = response;
  updateData[`clients/${msg.cid}/${responseKey}`] = response;

  return rootRef.update(updateData);
}