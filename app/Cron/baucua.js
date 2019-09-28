
let path         = require('path');
let fs           = require('fs');

let Helpers      = require('../Helpers/Helpers');

let UserInfo     = require('../Models/UserInfo');
let BauCua_phien = require('../Models/BauCua/BauCua_phien');
let BauCua_cuoc  = require('../Models/BauCua/BauCua_cuoc');
let BauCua_user  = require('../Models/BauCua/BauCua_user');
let BauCua_temp  = require('../Models/BauCua/BauCua_temp');

let bot        = require('./baucua/bot');
let botList    = [];

let dataBauCua = '../../data/baucua.json';

let io       = null;
let gameLoop = null;

let init = function init(obj){
	io = obj;
	io.BauCua_phien = 1;
	io.baucua = {ingame:[]};
	io.baucua.info = {
		redBau: 0,
		redCa: 0,
		redCua: 0,
		redGa: 0,
		redHuou: 0,
		redTom: 0,
		xuBau: 0,
		xuCa: 0,
		xuCua: 0,
		xuGa: 0,
		xuHuou: 0,
		xuTom: 0,
	};

	BauCua_phien.findOne({}, 'id', {sort:{'_id':-1}}, function(err, last) {
		if (!!last){
			io.BauCua_phien = last.id+1;
		}
		playGame();
	})
}

let thongtin_thanhtoan = function thongtin_thanhtoan(dice = null){
	if (!!dice) {
		let heSo   = {}; // Hệ số nhân
		for (let i = 0; i < 3; i++) {
			let dataT = dice[i];
			if (void 0 === heSo[dataT]) {
				heSo[dataT] = 1;
			}else{
				heSo[dataT] += 1;
			}
		}
		let updateLog = {};
		for (let j = 0; j < 6; j++) {
			if (void 0 !== heSo[j]) {
				updateLog[j] = heSo[j];
			}
		}
		let phien = io.BauCua_phien-1;
		BauCua_temp.updateOne({}, {$inc: updateLog}).exec();
		BauCua_cuoc.find({phien: phien}, {}, function(err, list) {
			if (list.length) {
				Promise.all(list.map(function(cuoc){
					let TienThang = 0; // Số tiền thắng (chưa tính gốc)
					let TongThua  = 0; // Số tiền thua
					let TongThang = 0; // Tổng tiền thắng (đã tính gốc)
					let thuong    = 0;
					let huou      = 0;
					let bau       = 0;
					let ga        = 0;
					let ca        = 0;
					let cua       = 0;
					let tom       = 0;

					// Cược Hươu
					if (cuoc[0] > 0) {
						if (void 0 !== heSo[0]) {
							huou = (cuoc[0]*heSo[0]);
							TienThang += huou;
							TongThang += cuoc[0]+huou;
						}else{
							TongThua  += cuoc[0];
						}
					}
					// Cược Bầu
					if (cuoc[1] > 0) {
						if (void 0 !== heSo[1]) {
							bau = (cuoc[1]*heSo[1]);
							TienThang += bau;
							TongThang += cuoc[1]+bau;
						}else{
							TongThua  += cuoc[1];
						}
					}
					// Cược Gà
					if (cuoc[2] > 0) {
						if (void 0 !== heSo[2]) {
							ga = (cuoc[2]*heSo[2]);
							TienThang += ga;
							TongThang += cuoc[2]+ga;
						}else{
							TongThua  += cuoc[2];
						}
					}
					// Cược Cá
					if (cuoc[3] > 0) {
						if (void 0 !== heSo[3]) {
							ca = (cuoc[3]*heSo[3]);
							TienThang += ca;
							TongThang += cuoc[3]+ca;
						}else{
							TongThua  += cuoc[3];
						}
					}
					// Cược Cua
					if (cuoc[4] > 0) {
						if (void 0 !== heSo[4]) {
							cua = (cuoc[4]*heSo[4]);
							TienThang += cua;
							TongThang += cuoc[4]+cua;
						}else{
							TongThua  += cuoc[4];
						}
					}
					// Cược Tôm
					if (cuoc[5] > 0) {
						if (void 0 !== heSo[5]) {
							tom = (cuoc[5]*heSo[5]);
							TienThang += tom;
							TongThang += cuoc[5]+tom;
						}else{
							TongThua  += cuoc[5];
						}
					}

					let tongDat    = cuoc[0]+cuoc[1]+cuoc[2]+cuoc[3]+cuoc[4]+cuoc[5];

					let update     = {};
					let updateGame = {};

					cuoc.thanhtoan = true;
					cuoc.betwin    = TongThang;
					cuoc.save();

					if (cuoc.red) {
						//RED
						if (TongThang > 0) {
							update['red'] = TongThang;
						}
						if (TienThang > 0) {
							update['redWin'] = updateGame['red'] = TienThang;
						}
						if (TongThua > 0) {
							update['redLost'] = updateGame['red_lost'] = TongThua;
						}

						update['redPlay'] = updateGame['redPlay'] = tongDat;

						UserInfo.updateOne({id:cuoc.uid}, {$inc:update}).exec();
						BauCua_user.updateOne({uid: cuoc.uid}, {$inc:updateGame}).exec();
					}else{
						//XU
						if (TongThang > 0) {
							update['xu'] = TongThang;
						}
						if (TienThang > 0) {
							thuong = (TienThang*0.039589)>>0;
							update['xuWin'] = updateGame['xu'] = TienThang;
							update['red']   = update['thuong'] = updateGame['thuong'] = thuong;
						}
						if (TongThua > 0) {
							update['xuLost'] = updateGame['xu_lost'] = TongThua;
						}

						update['xuPlay'] = updateGame['xuPlay'] = tongDat;

						UserInfo.updateOne({id:cuoc.uid}, {$inc:update}).exec();
						BauCua_user.updateOne({uid: cuoc.uid}, {$inc:updateGame}).exec();
					}
					if(void 0 !== io.users[cuoc.uid]){
						let status = {};
						if (TongThang > 0) {
							status = {mini:{baucua:{status:{win:true, bet: TongThang, thuong: thuong}}}};
						}else{
							status = {mini:{baucua:{status:{win:false, bet: TongThua}}}};
						}
						Promise.all(io.users[cuoc.uid].map(function(client){
							client.red(status);
						}));
					}
					return {users: cuoc.name, bet: TienThang, red: cuoc.red};
				}))
				.then(function(arrayOfResults) {
					Promise.all(arrayOfResults.filter(function(st){
						return (st.red && st.bet > 0);
					}))
					.then(result => {
						if (result.length) {
							result.sort(function(a, b){
								return b.bet-a.bet;
							});

							result = result.slice(0, 10);
							result = Helpers.shuffle(result);

							Promise.all(result.map(function(obj){
								return {users: obj.users, bet: Helpers.numberWithCommas(obj.bet), game: 'Bầu Cua'};
							}))
							.then(results => {
								results = {news:{a:results}};
								Promise.all(Object.values(io.users).map(function(users){
									Promise.all(users.map(function(client){
										if(client.scene == 'home'){
											client.red(results);
										}
									}));
								}));
								io.sendAllClient(results);
							});
						}
					})
					playGame();
				});
			}else{
				playGame();
			}
		});
	}else{
		Promise.all(Object.values(io.users).map(function(users){
			Promise.all(users.map(function(client){
				if (client.gameEvent !== void 0 && client.gameEvent.viewBauCua !== void 0 && client.gameEvent.viewBauCua)
					client.red({mini:{baucua:{data: io.baucua.info}}});
			}));
		}));
		let admin_data = {baucua:{info: io.baucua.info, ingame: io.baucua.ingame}};
		Promise.all(Object.values(io.admins).map(function(admin){
			Promise.all(admin.map(function(client){
				if (client.gameEvent !== void 0 && client.gameEvent.viewBauCua !== void 0 && client.gameEvent.viewBauCua)
					client.red(admin_data);
			}));
		}));
	}
}

let playGame = function(){
	io.BauCua_time = 71;
	//io.BauCua_time = 15;

	gameLoop = setInterval(function(){
		io.BauCua_time--;
		if (io.BauCua_time <= 60) {
			if (io.BauCua_time < 0) {
				clearInterval(gameLoop);
				io.BauCua_time = 0;

				let file  = require(dataBauCua);

				let dice1 = file[0] == 6 ? (Math.random()*6)>>0 : file[0];
				let dice2 = file[1] == 6 ? (Math.random()*6)>>0 : file[1];
				let dice3 = file[2] == 6 ? (Math.random()*6)>>0 : file[2];

				file[0]     = 6;
				file[1]     = 6;
				file[2]     = 6;
				file.uid    = '';
				file.rights = 2;

				fs.writeFile(path.dirname(path.dirname(__dirname)) + '/data/baucua.json', JSON.stringify(file), function(err){});

				BauCua_phien.create({'dice1':dice1, 'dice2':dice2, 'dice3':dice3, 'time':new Date()}, function(err, create){
					if (!!create) {
						io.BauCua_phien = create.id+1;

						thongtin_thanhtoan([dice1, dice2, dice3]);

						Promise.all(Object.values(io.users).map(function(users){
							Promise.all(users.map(function(client){
								client.red({mini: {baucua: {finish:{dices:[create.dice1, create.dice2, create.dice3], phien:create.id}}}});
							}));
						}));

						Promise.all(Object.values(io.admins).map(function(admin){
							Promise.all(admin.map(function(client){
								client.red({baucua: {finish: true, dices:[create.dice1, create.dice2, create.dice3]}});
							}));
						}));
					}
				});
				io.baucua.ingame = [];
				io.baucua.info = {
					redBau: 0,
					redCa: 0,
					redCua: 0,
					redGa: 0,
					redHuou: 0,
					redTom: 0,
					xuBau: 0,
					xuCa: 0,
					xuCua: 0,
					xuGa: 0,
					xuHuou: 0,
					xuTom: 0,
				};

				let config = require('../../config/baucua.json');
				if (config.bot) {
					// lấy danh sách tài khoản bot
					let TList = bot.list();
					TList.then(resultBot => {
						let maxBot = (resultBot.length*50/100)>>0;
						botList = Helpers.shuffle(resultBot);
						botList = Helpers.shuffle(botList);
						botList = botList.slice(0, maxBot);
					});
				}else{
					botList = [];
				}
			}else{
				thongtin_thanhtoan();
				if (!!botList.length && io.TaiXiu_time > 5) {
					let userCuoc = (Math.random()*5)>>0;
					for (let i = 0; i < userCuoc; i++) {
						let dataT = botList[i];
						if (!!dataT) {
							bot.bet(dataT, io);
							botList.splice(i, 1); // Xoá bot đã đặt tránh trùng lặp
						}
					}
				}
			}
		}
	}, 1000);
	return gameLoop
}

module.exports = init;
