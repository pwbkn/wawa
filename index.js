const { default: makeConn, DisconnectReason, BufferJSON, useMultiFileAuthState, MessageType, MessageOptions, Mimetype } = require('@whiskeysockets/baileys');
var { Boom } = require('@hapi/boom');
const fs = require('fs');

var sockClient = "";

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_goyalinfocom');

  console.log(makeConn);


  sockClient = makeConn({
    printQRInTerminal: true,
    auth: state
  });

  sockClient.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('opened connection');
      console.log('Logged in to');

    }
  })

  sockClient.ev.on('creds.update', saveCreds);

  sockClient.ev.on('messages.upsert', m => {
    console.log(JSON.stringify(m, undefined, 2));

    console.log('Logged in to', m.messages[0].key.remoteJid);
  })
}



connectToWhatsApp();




function getJid(phone) {
  phone += "";
  var length = [...phone].length;;
  if (length == 10) {
    phone = "91" + phone;
  }

  if (!phone.includes('@s.whatsapp.net')) {
    phone = `${phone}@s.whatsapp.net`;
  }

  return phone;
}


const express = require('express');
const app = express();
var cors = require('cors');
app.use(cors());
app.use(express.json());
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "https://goyalinfocom.com",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 8080;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.use(express.json());
app.use(express.urlencoded());


app.get('/', function(req, res, next) {
  res.json({ msg: 'Server Started' })
});

app.post('/sendWa', function(req, res, next) {
  var phone = getJid(req.body.phone.toString());
  var body = req.body.msg;
  var resource = sockClient.sendMessage(phone, { text: body });
  res.json({ msg: 'MSG SENT' })
});

io.on('connection', (socket) => {
  socket.emit('replyFromSocket', { message: 'WhatsApp Server Connected Successfully' });

  socket.on("sendMessages", async (users) => {
    var img = { "gif": "", "gpl": "", "jng": "", "jpeg": "", "jpg": "", "png": "", "heic": "", "heif": "" };

    var vid = { "3g2": "", "3gp": "", "aaf": "", "asf": "", "avchd": "", "avi": "", "drc": "", "flv": "", "m2v": "", "m3u8": "", "m4p": "", "m4v": "", "mkv": "", "mng": "", "mov": "", "mp2": "", "mp4": "", "mpe": "", "mpeg": "", "mpg": "", "mpv": "", "mxf": "", "nsv": "", "ogg": "", "ogv": "", "qt": "", "rm": "", "rmvb": "", "roq": "", "svi": "", "vob": "", "webm": "", "wmv": "", "yuv": "" };

    // console.log(users);
    for (var user of users) {
      var phone = getJid(user.phone.toString());
      var username = user.name;

      for (var message of user.messages) {
        var filename = message.name;
        var name = message.name;
        var url = "https:" + message.url;
        var fileExt = message.ext;
        if (fileExt == "txt") {
          var body = message.text;
          // sockClient.sendText(phone, body);
          sockClient.sendMessage(phone, { text: body });

        }
        else if (fileExt in vid) {
          await sockClient.sendMessage(
            from,
            { video: { url: url }, mimetype: 'video/mp4', caption: filename, }
          );
        }
        else if (fileExt in img) {
          await sockClient.sendMessage(phone, {
            image: { url: url },
            caption: filename
          });
        }
        else if (fileExt == "pdf") {
          await sockClient.sendMessage(phone, { document: { url: url }, fileName: name });
        } else if (fileExt == "docx") {
          await sockClient.sendMessage(phone, { document: { url: url }, mimetype: "application/vnd.openxmlformats", fileName: name });
        } else if (fileExt == "xlsx") {
          await sockClient.sendMessage(phone, { document: { url: url }, mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName: name });
        } else {
          await sockClient.sendMessage(phone, { fileName: filename, url: url });
        }
        // await delay(700);

      }
      await socket.emit('replyFromSocket', { message: 'Send Messages to ' + username });
      await delay(2500);
    }
  });

  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
})

server.listen(port, function() {
  console.log('CORS-enabled web server listening on port ' + port)
})
