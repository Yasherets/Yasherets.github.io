var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var uNum = 0;
var messages = [];
var users = [];

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
	console.log('a user connected');
	uNum++;
	io.emit('new user', uNum, messages);

	socket.on('username', function(name){
		users.push(name);
		console.log('user logged');
		io.emit('userlist', users);
	});

	socket.on('namechange', function(name) {
		if (users.includes(name)) {
			
		} else {
			users = [];
			socket.emit('namechangesuccess', name);
			io.emit('resetusers');
		}
	});

	socket.on('disconnect', () => {
		users = [];
		io.emit('resetusers');
	});

	socket.on('chat message', (msg) => {
		var msg2 = new Date().toLocaleTimeString('en-US') + " | " + "\n" + msg;
		//msg2 = msg2.replace(":)", "&#128512;");

		io.emit('chat message', msg2);
		messages.push(msg2);
		if (messages.length > 200) {
			messages.shift();
		}
		//io.emit('time', { time: new Date().toJSON() });

	
	});
	//io.emit('greetings', 'Hey!');
});



http.listen(3000, () => {
	console.log('listening on *:3000');
});