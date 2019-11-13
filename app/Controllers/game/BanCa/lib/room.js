
var Room = function(root, id, room){
	this.root = root; // Root
	this.id   = id; // ID phòng
	this.room = room; // loại phòng

	// Các người chơi
	this.player = [
		{id:1, player:null},
		{id:2, player:null},
		{id:3, player:null},
		{id:4, player:null},
	]; // Các người chơi
}

Room.prototype.sendToAll = function(data, player = null){
	this.player.forEach(function(ghe){
		if (!!ghe.player && ghe.player !== player) {
			!!ghe.player.client && ghe.player.client.red(data);
		}
	});
}

Room.prototype.inRoom = function(player){
	let gheTrong = this.player.filter(function(t){return t.player === null}); // lấy các ghế trống
	let rand = (Math.random()*gheTrong.length)>>0;
	gheTrong = gheTrong[rand];
	//gheTrong = gheTrong[0];

	gheTrong.player = player; // ngồi
	player.map = gheTrong.id; // vị trí ngồi
	console.log(this.player);

	this.sendToAll({ingame:{ghe:player.map, data:{name:player.name, balans:player.balans, typeBet:player.typeBet}}}, player);

	let getInfo = this.player.map(function(ghe){
		if (!!ghe.player) {
			return {ghe:ghe.id, data:{name:ghe.player.client.profile.name, balans:ghe.player.money, typeBet:ghe.player.typeBet}};
		}else{
			return {ghe:ghe.id, data:null};
		}
	});
	let client = {infoGhe:getInfo, meMap:player.map};
	player.client.red(client);
}

Room.prototype.outRoom = function(player){
	this.player.forEach(function(obj, index) {
		if (obj.player === player) {
			obj.player = null;
		}
	});
	let gheTrong = this.player.filter(function(t){return t.player === null}); // lấy các ghế trống
	if (gheTrong.length === 4) {
		console.log(this.root);
		delete this.root.removeWait(this.room, this.id);
		this.sendToAll({outgame:player.map});
		console.log('Remove Room');
		this.player.forEach(function(ghe){
			ghe.player = null;
		});
		// xóa phòng
		this.player = [];
		this.root   = null;
	}
}

module.exports = Room;
