
var UserInfo  = require('../../Models/UserInfo');
var OTP       = require('../../Models/OTP');
var Phone     = require('../../Models/Phone');


var validator = require('validator');
var helper    = require('../../Helpers/Helpers');
var sms       = require('../../sms').sendOTP;

function sendOTPOK(client, phone, phoneCrack){
	Phone.findOne({'phone':phoneCrack.phone}, function(err1, crack){
		if (crack) {
			client.red({notice:{title:'LỖI', text:'Số điện thoại đã tồn tại trên hệ thống.!'}});
		}else{
			var otp = (Math.random()*(9999-1000+1)+1000)>>0; // từ 1000 đến 9999
			OTP.findOne({'uid':client.UID, 'phone':phone}, {}, {sort:{'_id':-1}}, function(err2, data){
				if (!data || (new Date()-Date.parse(data.date))/1000 > 180 || data.active) {
					Phone.findOne({'uid':client.UID}, function(err3, check){
						if (check) {
							client.red({notice:{title:'LỖI', text:'Bạn đã kích hoạt OTP.!'}, user:{phone: helper.cutPhone(check.region+check.phone)}});
						}else{
							sms(phone, otp);
							OTP.create({'uid':client.UID, 'phone':phone, 'code':otp, 'date':new Date()});
							UserInfo.updateOne({id:client.UID}, {$set:{otpTime:new Date()}, $inc:{otpGet:1}}).exec();
							client.red({notice:{title:'THÔNG BÁO', text:'Mã OTP đã được gửi tới số điện thoại của bạn.'}});
						}
					});
				}else{
					client.red({notice:{title:'OTP', text:'Vui lòng kiểm tra hộp thư đến.!'}});
				}
			});
		}
	});
}

function sendOTP(client, phone){
	// Gửi OTP kích hoạt
	if (!!phone && helper.checkPhoneValid(phone)) {
		var phoneCrack = helper.phoneCrack(phone);
		if (phoneCrack) {
			UserInfo.findOne({'id': client.UID}, 'otpGet otpTime', function(err2, user){
				if (user) {
					if (user.otpGet > 2) {
						if ((new Date()-Date.parse(user.otpTime))/1000 > 86400) {
							sendOTPOK(client, phone, phoneCrack);
						}else{
							client.red({notice:{title:'CẢNH BÁO', text:'Phát hiện dấu hiệu Spam.!'}});
						}
					}else{
						sendOTPOK(client, phone, phoneCrack);
					}
				}
			}
		}else{
			client.red({notice:{title:'THÔNG BÁO', text:'Số điện thoại không hợp lệ.!'}});
		}
	}else{
		client.red({notice:{title:'THÔNG BÁO', text:'Số điện thoại không hợp lệ.!'}});
	}
}

function regOTP(client, data){
	if (!!data && !!data.phone && !!data.email && !!data.cmt && !!data.otp) {
		if (!helper.checkPhoneValid(data.phone)) {
			client.red({notice: {title: "LỖI", text: 'Số điện thoại không hợp lệ'}});
		}else if (!helper.validateEmail(data.email)) {
			client.red({notice: {title: "LỖI", text: 'Email không hợp lệ...'}});
		} else if (!validator.isLength(data.cmt, {min: 9, max: 12})){
			client.red({notice: {title: "LỖI", text: 'Số CMT không hợp lệ.!!'}});
		} else if (!validator.isLength(data.otp, {min: 4, max: 6})){
			client.red({notice: {title: "LỖI", text: 'Mã OTP Không đúng!!'}});
		} else {
			OTP.findOne({'uid':client.UID, 'phone':data.phone}, {}, {sort:{'_id':-1}}, function(err1, data_otp){
				if (data_otp && data.otp == data_otp.code) {
					if (((new Date()-Date.parse(data_otp.date))/1000) > 180 || data_otp.active) {
						client.red({notice:{title:'LỖI', text:'Mã OTP đã hết hạn.!'}});
					}else{
						UserInfo.findOne({'id': client.UID}, 'red xu phone email cmt', function(err2, dU){
							if (dU) {
								var phoneCrack = helper.phoneCrack(data.phone);
								if (phoneCrack) {
									Phone.findOne({'phone':phoneCrack.phone}, function(err3, crack){
										if (crack) {
											client.red({notice:{title:'LỖI', text:'Số điện thoại đã tồn tại trên hệ thống.!'}});
										}else{
											Phone.findOne({'uid':client.UID}, function(err4, check){
												if (check) {
													client.red({notice:{title:'LỖI', text:'Bạn đã kích hoạt OTP.!'}, user:{phone: helper.cutPhone(check.region+check.phone)}});
												}else{
													// Xác thực thành công
													data_otp.active = true;
													data_otp.save();
													try {
														Phone.create({'uid':client.UID, 'phone':phoneCrack.phone, 'region':phoneCrack.region}, function(err, cP){
															if (!!cP) {
																UserInfo.updateOne({id:client.UID}, {$set:{email:data.email, cmt:data.cmt}, $inc:{red:3000, xu:10000}}).exec();
																client.red({notice:{title:'THÀNH CÔNG', text: 'Xác thực thành công.!' + "\n" + 'Bạn nhận được 3.000 Red và 10.000 Xu, chúc bạn chơi game vui vẻ...'}, user: {red: dU.red*1+3000, xu: dU.xu*1+10000, phone: helper.cutPhone(data.phone), email: helper.cutEmail(data.email), cmt: data.cmt}});
															}else{
																client.red({notice:{title:'LỖI', text:'Số điện thoại đã tồn tại trên hệ thống.!'}});
															}
														});
													} catch (error) {
														client.red({notice:{title:'LỖI', text:'Số điện thoại đã tồn tại trên hệ thống.!'}});
													}
												}
											});
										}
									});
								}else{
									client.red({notice:{title:'THÔNG BÁO', text:'Số điện thoại không hợp lệ.!'}});
								}
							}
						});
					}
				}else{
					client.red({notice:{title:'LỖI', text:'Mã OTP Không đúng.!'}});
				}
			});
		}
	}
}

module.exports = function(client, data) {
	if (!!data) {
		if (!!data.sendOTP) {
			sendOTP(client, data.sendOTP);
		}
		if (!!data.regOTP) {
			regOTP(client, data.regOTP);
		}
	}
}
