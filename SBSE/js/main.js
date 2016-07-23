var fs = require("fs");
var http = require('http');
var path = require('path');
var gui = require('nw.gui');
var uuid = require('node-uuid');
var fsafe = require("sanitize-filename");
var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage('./scratch');
var win = gui.Window.get();
var os = process.platform;
var child_process = require('child_process');
var c = require('crypto');
var sha = require('starbound-sha256');
var stripJsonComments = require('strip-json-comments');
var x = false;
var z = false;

// Fix no edit menu on OS X
if (os == "darwin") {
	var mb = new gui.Menu({type:"menubar"});
	mb.createMacBuiltin("SBSE Desktop");
	win.menu = mb;
}

// Prevent Anything From Being Dropped
document.addEventListener('dragover', function(e){
	e.dataTransfer.dropEffect = 'none';
	e.dataTransfer.effectAllowed = 'none';
	e.dataTransfer.clearData();
	e.preventDefault();
	e.stopPropagation();
}, false);
document.addEventListener('drop', function(e){
	e.preventDefault();
	e.stopPropagation();
}, false);

process.on("uncaughtException", function(err) {
	console.log(err.stack);
	window.lastError = err;
	if (err.name == "InternalError" || err.name == "SyntaxError") {
		blueScreen();
		localStorage.clear();
	} else {
		alert('Warning: Encountered SBSE ' + err.name + '\nOperation may not have completed.');
	}
});

function log(text) {
	//fs.appendFileSync(appDir+'log.txt', text+'\r\n');
}
//fs.writeFileSync(appDir+'log.txt', '');

win.showDevTools();

function is64bit() {
	return process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
}

var StarboundRoot = localStorage.getItem("StarboundRoot")||"";
var binRoot = "";
var UpdateFolder = "";
if (os == "win32") {
	if (is64bit()) {
		if (StarboundRoot == "") { StarboundRoot = "C:/Program Files (x86)/Steam/SteamApps/common/Starbound/"; }
	} else {
		if (StarboundRoot == "") { StarboundRoot = "C:/Program Files/Steam/SteamApps/common/Starbound/"; }
	}
	binRoot = "win32/"
} else if (os == "darwin") {
	if (StarboundRoot == "") { StarboundRoot = getUserHome()+"/Library/Application Support/Steam/SteamApps/common/Starbound/"; }
	UpdateFolder = process.env['HOME']+"/Downloads/";
	binRoot = "Starbound.app/Contents/MacOS/";
} else if (os == "linux") {
	if (is64bit()) {
		binRoot = "linux64/";
	} else {
		binRoot = "linux32/";
	}
	if (StarboundRoot == "") { StarboundRoot = getUserHome()+"/.steam/steam/SteamApps/common/Starbound/"; }
}
var StorageDirectory = "";
var PlayerDir = Array("giraffe_storage", "koala_storage", "player/", "storage_unstable/player/");
var BackupDir = "sbse_backups/";
var AssetsPak = "";
var ModsFolder = "";
var Assets = new StarPak();
var Mods = {};
var PlayerFilesList = {};
var BackupFilesList = {};
var PlayerErrors = {};
var PlayersLoaded = 0;
var ActiveEdit = "";
var RCommonImg = new Image();
var RUncommonImg = new Image();
var RRareImg = new Image();
var RLegendaryImg = new Image();
var RarityList = {common: RCommonImg, uncommon: RUncommonImg, rare: RRareImg, legendary: RLegendaryImg};
var DifficultyList = {supernova: '<span style="font-size:10px; padding: 0px 2px; font-weight: 300;" class="label label-success">Normal</span>', 
					  blackHole: '<span style="font-size:10px; padding: 0px 2px; font-weight: 300;" class="label label-warning">Hardcore</span>', 
					  bigCrunch: '<span style="font-size:10px; padding: 0px 2px; font-weight: 300;" class="label label-danger">Permadeath</span>',
					  casual: '<span style="font-size:10px; padding: 0px 2px; font-weight: 300;" class="label label-success">Casual</span>', 
					  normal: '<span style="font-size:10px; padding: 0px 2px; font-weight: 300;" class="label label-warning">Normal</span>', 
					  hardcore: '<span style="font-size:10px; padding: 0px 2px; font-weight: 300;" class="label label-danger">Hardcore</span>'}
var HairStyles = {};
var Emotes = {};
var NameSource = {};
var resetPlayer;
var skipped;

function checkForUpdates() {
	// Make sure we have a stored version number
	if (!localStorage.getItem('SBSE-Version')) {
		// There was no stored number, either a fresh install or this is updated from a version without this feature, clear storage
		localStorage.clear();
		localStorage.setItem('SBSE-Version', version);
	} else if (localStorage.getItem('SBSE-Version') != version) {
		// If this is an update, clear the storage to avoid conflict
		localStorage.clear();
		localStorage.setItem('SBSE-Version', version);
	}

	// Okay, now check for updates
	$('#init_status').text('Checking for updates...');
	$.getJSON( base_url+version_url, function( data ) {
		if (data.version == version || localStorage.getItem('skip_SBSE-'+data.version)) {
			if (data.version != version && localStorage.getItem('skip_SBSE-'+data.version)) { skipped = data; }
			findRoot();
		} else {
			if (data['force_manual']) {
				updateMessage('A new update has been found!<br />Version: '+data.version+'<br />\
							   <div style="text-align: left; width: 300px; margin: auto;">'+data.changelog+'</div>\
							   <button type="button" class="ubtn btn btn-info">Update</button> \
							   <button type="button" class="dbtn btn btn-inverse">More Info</button> \
						   	<button type="button" class="sbtn btn btn-white">Skip</button>');
			} else {				
				updateMessage('A new update has been found!<br />Version: '+data.version+'<br />\
							   <div style="text-align: left; width: 300px; margin: auto;">'+data.changelog+'</div>\
							   <button type="button" class="dbtn btn btn-info">Manual Update</button> \
							   <button type="button" class="sbtn btn btn-white">Skip</button>');
			}
			$(document).on('click', '.ubtn', function() {
	            updateMessage('Downloading Update...<br />\
	            			<div class="progress" style="margin-top: 5px; margin-bottom:5px;height: 18px;width: 200px;margin-left: auto;margin-right: auto;">\
									<div class="download-progress progress-bar progress-bar-info" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="-webkit-transition: none;transition: none;width: 0%;height: 18px;text-align: left;">\
									</div>\
							</div>\
							<span class="download-message">Fetching download...</span>');
				var url = "";
				if (os == "win32") {
					url = data.download_direct;
				} else if (os == "darwin") {
					url = data.download_direct_osx;
				} else if (os == "linux") {
					url = data.download_direct_linux;
				}
				var request = http.get(url, function(response) {
					var r = new RegExp(/filename[^;=n]*=['"](.*?2|[^'";n]*)/g);
					var matches = r.exec(response.headers['content-disposition']);
					var download_name = "SBSE-Update.exe";
					if (matches.length < 1) {
						download_name = matches[1].replace('.exe', '')+'.exe';
					}
					response.setEncoding('binary');
		            var len = parseInt(response.headers['content-length'], 10);
		            var body = "";
		            var cur = 0;
		            var total = len / 1048576; //1048576 - bytes in  1Megabyte

		            response.on("data", function(chunk) {
		                body += chunk;
		                cur += chunk.length;
		                $('.download-progress').css('width', (100.0 * cur / len).toFixed(2)+'%').attr('aria-valuenow', (100.0 * cur / len).toFixed(2));
		                $('.download-message').html("Downloading " + (100.0 * cur / len).toFixed(2) + "% - " + (cur / 1048576).toFixed(2) + "/" + total.toFixed(2) + " MB"); 
		            });

		            response.on("end", function() {
		                $('.download-message').text('Saving Update...');
		                fs.writeFile(UpdateFolder+download_name, body, {encoding: 'binary'}, function(err) {
		                	if (err) throw err;
		                	$('.download-message').text('Running Update...');
			                if (os == "win32") {
			                	var child = child_process.spawn('./'+path.basename(download_name, path.extname(download_name)), [], {
								   detached: true,
								   stdio: [ 'ignore', null, null ]
								});
		                	} else if (os == "darwin") {
			                	var child = child_process.spawn('hdiutil', ['attach', '-autoopen', UpdateFolder+download_name], {
								   detached: true,
								   stdio: [ 'ignore', null, null ]
								});
		                	}

							child.unref();
							win.hide();
							gui.App.quit();
		                });
		            });

		            request.on("error", function(e){
						loaderErrorMessage('Could not download update.');
		            });

		        });
				//gui.App.quit();
			});
			$(document).on('click', '.dbtn', function() {
				gui.Shell.openExternal(data.download_url);
			});
			$(document).on('click', '.sbtn', function() {
				localStorage.setItem('skip_SBSE-'+data.version, true);
				skipped = data;
				findRoot();
			});
		}
	}).fail(function(e) {
		findRoot();
	});
}

function findRoot() {
	loaderReset();
	if (skipped) {
		$('.new-update').show().animate({opacity: 1}, 200).hover(function(e) {
			$('.new-update-text').animate({opacity: 1, width:45}, 200);
		}, function (e) {
			$('.new-update-text').animate({opacity: 0, width:0}, 200);
		});
		$(document).on('click', '.new-update', function() {
			gui.Shell.openExternal(skipped.download_url);
		});
	}
	$('#init_status').text('Locating Starbound folder...');
	fs.exists(StarboundRoot, function(exists) {
		if (exists) {
			fs.exists(StarboundRoot+binRoot, function(exists) {
				if (exists) {
					findAssets();
				} else {
					if (os == "darwin") {
						binRoot = "osx/";
						fs.exists(StarboundRoot+binRoot, function(exists) {
							if (exists) {
								findAssets();
							} else {
								loaderErrorMessage('Unable to find binaries folder. Make sure the Starbound folder is correct.');
								chooseStarboundDirectory();
							}
						});
					} else {
						loaderErrorMessage('Unable to find binaries folder. Make sure the Starbound folder is correct.');
						chooseStarboundDirectory();
					}
				}
			});
		} else {
			loaderErrorMessage('Unable to locate Starbound folder.');
			chooseStarboundDirectory();
		}
	});
}

function findAssets() {
	window.listenForKey = false;
	$('#init_status').text('Locating assets...');
	try {
		if (os == "darwin") { binRoot = "osx/"; }
		var bootstrap = parseJSON(fs.readFileSync(StarboundRoot+binRoot+'sbboot.config').toString());
	} catch (e) {
		console.log(e.stack);
		try {
			// Couldn't find new bootstrap config, look for the old
			if (os == "darwin") { binRoot = ""; }
			var bootstrap = parseJSON(fs.readFileSync(StarboundRoot+binRoot+'bootstrap.config').toString());
		} catch (e) {
			console.log(e.stack);
			return loaderErrorMessage('Could not read bootstrap config. Make sure Starbound folder is correct.');
		}
	}
	AssetsPak = path.resolve(StarboundRoot+binRoot, bootstrap.assetSources[0]);
	ModsFolder = path.resolve(StarboundRoot+binRoot, bootstrap.modSource);
	StorageDirectory = path.resolve(StarboundRoot+binRoot, bootstrap.storageDirectory);
	PlayerDir = StorageDirectory+'/player/';
	fs.exists(AssetsPak, function(exists) {
		if (exists) {
			$('#init_status').text('Reading assets...');
			Assets.open(AssetsPak, function() {
				//Assets.getFileList();
				//findPlayers();
				RCommonImg.src = 'data:image/png;base64,'+Assets.getFile('/interface/inventory/whiteborder.png').buf.toString('base64');
				RUncommonImg.src = 'data:image/png;base64,'+Assets.getFile('/interface/inventory/greenborder.png').buf.toString('base64');
				RRareImg.src = 'data:image/png;base64,'+Assets.getFile('/interface/inventory/blueborder.png').buf.toString('base64');
				RLegendaryImg.src = 'data:image/png;base64,'+Assets.getFile('/interface/inventory/purpleborder.png').buf.toString('base64');
				var moneyImg = new Image();
					moneyImg.src = 'data:image/png;base64,'+Assets.getFile('/interface/money.png').buf.toString('base64');
				$('#player_pixels').prepend(moneyImg);
				findMods();
			});
			//findPlayers();
		} else {
			loaderErrorMessage('Could not locate assets folder. Make sure Starbound folder is correct.');
		}
	});	
}

function walkMods(dir, modItemDB, modPath) {
	var innerfiles = fs.readdirSync(dir);
	innerfiles.forEach(function(inF) {
		if ($.inArray(path.extname(inF), Assets.ignoreItems) == -1) {
			var filestats = fs.statSync(dir+inF);
			if (filestats.isDirectory()) {
				walkMods(dir+inF+'/', modItemDB, modPath);
			} else {
				try {
					var content = parseJSON(stripJsonComments(fs.readFileSync(dir+inF).toString()).replace('[-.', '[-0.'));
						content.dir = path.dirname(dir.replace(modPath.replace(/\\/g, '/'), '')+inF);
					if (content.itemName) {
						modItemDB[content.itemName] = content;
					} else {
						modItemDB[path.basename(dir+inF)] = content;
					}
				} catch (e) {
				}
			}
		}
	});
}

function findMods() {
	$('#init_status').text('Locating mods...');
	fs.exists(ModsFolder, function(exists) {
		if (exists) {
			$('#init_status').text('Reading mods...');
			var files = fs.readdirSync(ModsFolder);
			var i = 0;
			var miterate = function() {
				$('#init_status').text('Reading mods...');
				var	file = ModsFolder+'/'+files[i];
				var filestats = fs.statSync(file);
				if (filestats.isDirectory()) {
					var innerfiles = fs.readdirSync(file+'/');
					var modfile = false;
					var modItemDB = undefined;
					innerfiles.forEach(function(inF) {
						if (inF.indexOf('modinfo') != -1) {
							try {
								var con = stripJsonComments(fs.readFileSync(file+'/'+inF).toString());
								modfile = JSON.parse(con.replace('[-.', '[-0.'));
							} catch (e) {
								console.log(e.stack);
								i++;
								if (i >= files.length) {
									findPlayers();
								} else {
									global.setImmediate(miterate);
								}
							}
						}
					});

					if (modfile) {
						Mods[files[i]] = {type: "folder", path: path.resolve(modfile.path, file), modfile: modfile};
						innerfiles.forEach(function(inF) {
							if (inF == "assets" || inF == "items") {
								modItemDB = {};
								walkMods(file.replace(/\\/g, '/')+'/'+inF+'/', modItemDB, Mods[files[i]].path);
							}
						});
						if (modItemDB != undefined) {
							Mods[files[i]].modItemDB = modItemDB;
						}
					}
					i++;
					if (i >= files.length) {
						findPlayers();
					} else {
						global.setImmediate(miterate);
					}
				} else {
					if (path.extname(file) == ".pak" || path.extname(file) == ".modpak") {
						Mods[files[i]] = new StarPak();
						Mods[files[i]].type = "pak";
						Mods[files[i]].isMod = true;
						Mods[files[i]].open(file, function() {
							i++;
							if (i >= files.length) {
								findPlayers();
							} else {
								global.setImmediate(miterate);
							}
						});
					} else {						
						i++;
						if (i >= files.length) {
							findPlayers();
						} else {
							global.setImmediate(miterate);
						}
					}
				}
			}

			if (files.length < 1) {
				findPlayers();
			} else {
				global.setImmediate(miterate);
			}
		} else {
			findPlayers();
		}
	});	
}

function findPlayers(folder) {
	// Mods and Assets are done, gotta back up name source or restore it
	if (Object.keys(NameSource).length == 0) {
		NameSource = JSON.parse(localStorage.getItem('NameSource'));
	} else {
		localStorage.setItem('NameSource', JSON.stringify(NameSource));
	}
	var playerFolder = PlayerDir; //PlayerDir.pop();
	$('#init_status').text('Locating players...');
	fs.exists(playerFolder, function(exists) {
		if (exists) {
			PlayerDir = playerFolder;
			$('#init_status').text('Reading player files...');
			setTimeout(function() {
				var files = fs.readdirSync(playerFolder);
				var i = 0;
				window.playToLoad = 0;
				window.playLoaded = 0;
				var fiterate = function() {
					var	file = playerFolder+files[i];
					var stat = fs.statSync(file);
					if (path.extname(file) == ".player") {
						var Player = new StarSave();
							Player.filestats = stat;
							Player.file = path.basename(file);
						var result = Player.parse(file, function(e) {
							fs.watch(e.playerFile, function(event) {
								if (event == "change") { // This watches the player file for changes.
									if (ActiveEdit != e.file) { // Player is NOT being edited
										e.parse(e.playerFile); // Re-parse
										e.generatePreview(true); // Update preview with new data
									} else if (ActiveEdit == e.file) { // Player is being edited for sure
										$('.edited-warning').slideDown(200);
										PlayerFilesList[ActiveEdit].Player.showWarning = true;
									}
								}
							});
						});
						if (result) {
							try
							{
								window.playToLoad++;
								Player.generatePreview();	
							}
							catch (e) {
								console.log(e.stack);
								window.playLoaded++;
								var name = '<span style="font-size: 12px;">'+Player.file+'</span>';
								var moreInfo = "";
								try {
									name = Player.PlayerEntity.data['identity'].data['name'].data;
								} catch (e) {
									var moreInfo = "Corrupt player file.";
								}
								PlayerErrors[path.basename(file)] = e;
								$('#player_list .ul-players').append('<li data-file="'+path.basename(file)+'"><div style="float: left; font-size: 42px;padding: 12px 5px;margin-right: 10px;"><i class="fa fa-warning"></i></div> <br />'+name+'<br />Unable to edit. '+moreInfo+'</li>');
							}
							PlayerFilesList[path.basename(file)] = {Player: Player, file: file, loaded: true};
						}
					}
					i++;
					if (i >= files.length) {
						if (Object.keys(PlayerFilesList).length > 0) {
							var piterate = function() {
								if (window.playToLoad != window.playLoaded) {
									global.setImmediate(piterate);
								} else {
									playersLoaded();
								}
							}
							global.setImmediate(piterate);
						} else {
							$('#player_list .loading .spinner').hide();
							$('#player_list .loading .warning').show();
							$('#init_status').text('No player files found.');
						}
					} else {
						global.setImmediate(fiterate);
					}
				}

				if (files.length < 1) {
					$('#player_list .loading .spinner').hide();
					$('#player_list .loading .warning').show();
					$('#init_status').text('No player files found.');
				} else {
					global.setImmediate(fiterate);
				}
			}, 50);
		} else {
			//if (PlayerDir.length > 0) {
			//	findPlayers();
			//} else {
				loaderErrorMessage('Could not locate player folder. Make sure Starbound folder is correct and you have run the game once.');
			//}
		}
	});
}

function locateBackups(uuid) {
	BackupFilesList = {};
	$('#player_list .ul-backups').empty();
	$('#player_list .ul-players').fadeOut(300, "easeOutQuad", function() {
		$('#init_status').text('Locating Backups...');
		$('#player_list').css({display: 'table'});
		$('#player_list .loading').fadeIn(200, function() {
			var BackupsTarget = PlayerDir+BackupDir+fsafe(uuid)+'/';
			fs.exists(BackupsTarget, function(exists) {
				if (exists) {
					var files = fs.readdirSync(BackupsTarget);
					if (files.length > 0) {
						var i = 0;
						window.backToLoad = 0;
						window.backLoaded = 0;
						var backupReadPlayersIterate = function() {
							var	file = BackupsTarget+files[i];
							var stat = fs.statSync(file);
							if (path.extname(file) == ".player") {
								var Player = new StarSave();
									Player.filestats = stat;
									Player.file = path.basename(file);
								var result = Player.parse(file, function(e) {});
								if (result) {
									try
									{
										window.backToLoad++;
										Player.generatePreview(false, true);	
									}
									catch (e) {
										window.backLoaded++;
										$('#player_list .ul-backups').append('<li><div style="float: left; font-size: 42px;padding: 12px 5px;margin-right: 10px;"><i class="fa fa-warning"></i></div> <br />'+Player.PlayerEntity.data['identity'].data['name'].data+'<br />Unable to edit.</li>');
									}
									BackupFilesList[path.basename(file)] = {Player: Player, file: file, loaded: true};
								}
							}
							i++;
							if (i >= files.length) { // Have we processed every file found?
								if (Object.keys(BackupFilesList).length > 0) { // Were any backups found?
									var backupCheckLoadedIterate = function() {
										if (window.backToLoad != window.backLoaded) {
											global.setImmediate(backupCheckLoadedIterate);
										} else {
											backupsLoaded();
										}
									}
									global.setImmediate(backupCheckLoadedIterate); // Initialize Loop to make sure everything is loaded
								} else { // No backups found, show error
									backupsNotFound();
								}
							} else {
								global.setImmediate(backupReadPlayersIterate);
							}
						}
						global.setImmediate(backupReadPlayersIterate);
					} else {
						backupsNotFound();
					}
				} else {
					backupsNotFound();
				}
			});
		});
	});
	$('#player_list .ul-players li').addClass('noanimate').slowEach(35, function() {
		$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
	}, function() {  });
}

function backupsNotFound() {
	$('#player_list .loading').fadeOut(200, function() {
		$('#player_list .loading .spinner').hide();
		$('#player_list .loading .warning').show();
		$('#player_list .loading .update').hide();
		$('#init_status').text('SBSE could not find any backups for that player!');
		$('#player_list .loading .backupbackbtn').show();
		$('#player_list .loading').fadeIn(200);
	});
}

function chooseStarboundDirectory() {
	LZADialog.selectDir(function(file){
		StarboundRoot = file.path;
		if (StarboundRoot[StarboundRoot.length-1] != '\\' || StarboundRoot[StarboundRoot.length-1] != '/') {
			if (os == "darwin") {
				StarboundRoot = StarboundRoot+'/';
			} else {
				StarboundRoot = StarboundRoot+'\\';
			}
		}
		localStorage.setItem("StarboundRoot", StarboundRoot);
		findRoot();
	});
}

function playersLoaded() {
	$('#player_list .loading').fadeOut(200, function() {
		loaderReset();
		$('#player_list').css({display: 'block'});
		$('#player_list .ul-players').fadeIn(400, "easeOutCirc");
		$('#player_list .ul-players li').sort(sortDescending).appendTo('#player_list .ul-players').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
			$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });
		}, function() {  });
	});
}

function backupsLoaded() {
	$('#player_list .loading').fadeOut(200, function() {
		loaderReset();
		$('#player_list').css({display: 'block'});
		$('#player_list .backup-title').fadeIn(400, "easeOutCirc");
		$('#player_list .ul-backups').fadeIn(400, "easeOutCirc");
		$('#player_list .ul-backups li').sort(sortDescending).appendTo('#player_list .ul-backups').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
			$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });
		}, function() {  });
	});
}

function loaderErrorMessage(text) {
	$('#player_list .loading .spinner').hide();
	$('#player_list .loading .warning').show();
	$('#player_list .loading .update').hide();
	$('#init_status').text(text);
	$('#player_list .loading .selbtn').show();
}

function updateMessage(text) {
	$('#player_list .loading .spinner').hide();
	$('#player_list .loading .warning').hide();
	$('#player_list .loading .update').show();
	$('#player_list .loading .selbtn').hide();
	$('#init_status').html(text);
	//$('#player_list .loading .selbtn').show();
}

function loaderReset() {
	$('#player_list .loading .spinner').show();
	$('#player_list .loading .warning').hide();
	$('#player_list .loading .update').hide();
	$('#player_list .loading .btn').hide();
}

function editPlayer(player) {
	ActiveEdit = player;
	resetPlayer = PlayerFilesList[player].Player.PlayerEntity;
	if (PlayerFilesList[ActiveEdit].Player.showWarning) {
		$('.edited-warning').slideDown(200);
	} else {
		$('.edited-warning').hide();
	}
	PlayerFilesList[player].Player.beginEdit();
}

function deletePlayer(pid) {
	var $target = $('.ul-players .playerli[data-pid="'+pid+'"]');
	var PlayerTarget = PlayerDir+fsafe(pid+'.player');
	fs.exists(PlayerTarget, function(exists) {
		if (exists) {
			$('.tipsy').remove();
			PlayerFilesList[pid+'.player'].Player.backup(PlayerDir+BackupDir);
			fs.unlink(PlayerTarget, function(err) {
				if (err) { return console.log(err); }
				$target.addClass('noanimate').animate({opacity: 0}, 200, "easeInQuad", function() { $(this).remove(); });
			});
		}
	});
}

function deleteBackup(uuid, file) {
	var $target = $('.ul-backups .playerli[data-file="'+file+'"]');
	var BackupTarget = PlayerDir+BackupDir+fsafe(uuid)+'/'+fsafe(file);
	fs.exists(BackupTarget, function(exists) {
		if (exists) {
			$('.tipsy').remove();
			fs.unlink(BackupTarget, function(err) {
				if (err) { return console.log(err); }
				$target.addClass('noanimate').animate({opacity: 0}, 200, "easeInQuad", function() { $(this).remove(); });
			});
		}
	});
}

function restoreBackup(uuid, file) {
	var $player_target = $('.ul-players .playerli[data-pid="'+uuid+'"]');
	var $backup_target = $('.ul-backups .playerli[data-file="'+file+'"]');
	var BackupTarget = PlayerDir+BackupDir+fsafe(uuid)+'/'+fsafe(file);
	var PlayerTarget = PlayerDir+fsafe(uuid+'.player');
	fs.exists(BackupTarget, function(exists) {
		if (exists) {
			fs.exists(PlayerTarget, function(exists) {
				if (exists) {
					PlayerFilesList[uuid+'.player'].Player.backup(PlayerDir+BackupDir);
					fs.rename(BackupTarget,PlayerTarget, function(err) {
						if (err) { return console.log(err); }
						PlayerFilesList[uuid+'.player'].Player.parse(PlayerTarget); // Re-parse
						PlayerFilesList[uuid+'.player'].Player.generatePreview(true); // Update preview with new data
						$('.edited-warning').hide();
						PlayerFilesList[uuid+'.player'].Player.showWarning = false;
						$('.backup-return').trigger('click');
					});
				}
			});
		}
	});
}

function sortDescending(a, b) {
	var date1 = $(a).data('time');
	var date2 = $(b).data('time');

	return date1 < date2 ? 1 : -1;
}

function savePreviewImage($target) {
	var player_name = PlayerFilesList[$target.data('pid')+'.player'].Player.PlayerEntity.data['identity'].data['name'].data;
	var player_icon = $target.find('.player_icon');
	if (player_icon.length > 0) {
		var base64Data = player_icon.attr('src').replace(/^data:image\/png;base64,/, "");
		if (base64Data) {
			LZADialog.saveFileAs({nwworkingdir: getUserHome(), filename:fsafe((player_name||'player')+'.png')}, function(file) {
				fs.writeFile(file.path, base64Data, 'base64', function(err) {
					if (err) { return console.log(err); }

				});
			});
		}
	}
}

function blueScreen() {
	$('#error_message').show();
}

function setUp() {
	// Register Hotkey First
	$.ajaxSetup({ cache: false });
	$('#player_list .loading .selbtn').on('click', function() {
		chooseStarboundDirectory();
	});
	$('#player_list .loading .backupbackbtn').on('click', function() {
		playersLoaded();
	});
	$('.backup-return').on('click', function() {
		$('#player_list .backup-title').fadeOut(400, "easeOutCirc");
		$('#player_list .ul-backups').fadeOut(300, "easeOutQuad", function() {
			$('#player_list .ul-players').fadeIn(400, "easeOutCirc");
			$('#player_list .ul-players li').sort(sortDescending).appendTo('#player_list .ul-players').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
				$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });
			}, function() {  });
		});
		$('#player_list .ul-backups li').addClass('noanimate').slowEach(35, function() {
			$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
		}, function() {  });
	});
	$('#minimize_window').on('click', function() {
		win.minimize();
	});
	$('#close_window').on('click', function() {
		win.close();
	});
	$('#reload').on('click', function() {
		win.reload();
	});
	$('#console').on('click', function() {
		win.showDevTools();
	});
	$('#relaunch').on('click', function() {
    	var child = child_process.spawn('test.bat', [], {
		   detached: true,
		   stdio: [ 'ignore', null, null ]
		});

		child.unref();
		win.hide();
		gui.App.quit();
	});
	$('#toggle_dev_check').on('change', function(e) {
		$('body').toggleClass('dev');
	});

	$('#about').click(function() {
		gui.Window.open('about.html', {
			position: 'center',
			width: 300,
			height: 115,
		    resizable: false,
		    title: "About SBSE",
		    icon: "images/icon.png",
		    frame: false,
    		toolbar: false,
    		focus: true,
    		transparent: true
		});
	});

	$('body').on('click', '.toggle_armor', function() {
		$('.armor').toggle();
		$('.hair').toggle();
		$('.player-avatar img').attr('src', PlayerFilesList[ActiveEdit].Player.drawAvatar({spriteMult:3, showArmor: $('.armor').is(':visible')}).toDataURL());
		if ($('.player-avatar').hasClass('av-select')) {
			$('.player-avatar').parent().find('.hair-styles').slideUp(200);
			$('.player-avatar').removeClass('av-select');
		}
	});

	$('.playerops .btn').click(function() {
		if ($(this).hasClass('active')) { return; }
		if ($('.player-avatar').hasClass('av-select')) {
			$('.player-avatar').parent().find('.hair-styles').slideUp(200);
			$('.player-avatar').removeClass('av-select');
		}
		$('.playerops .active').removeClass('active');
		$('.editor_content .active').removeClass('active');
		$(this).addClass('active');
		var sw = $(this).data('switch');
		if (sw == "colors" && $('#advanced-check').is(':checked')) {
			sw += "-adv";
		}
		$('.editor_content').animate({opacity: 0}, 300, "easeOutQuad", function() {
			$('.editor_content').animate({opacity: 1}, 400, "easeOutQuad");
			$('.editor_content ul').css({opacity: 0, zIndex: 2111});
			$('#z'+sw).css({opacity: 1, zIndex: 2112}).addClass('active');
			$('.editor_content #z'+sw+' li').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
				$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });	
			}, function() {  });	
		});
		$('.editor_content ul').filter(function() {
			return $(this).css('opacity') == '1';
		}).find('li').addClass('noanimate').slowEach(35, function() {
			$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
		}, function() {  });		
	});

	$('.adv').hide();
	$('#advanced-check').on('change', function(e) {
		if (PlayerFilesList[ActiveEdit]) {
			PlayerFilesList[ActiveEdit].Player.drawAll();
		}
		if($(this).is(':checked')) {
			localStorage.setItem('advanced', true);
			$('.adv').show();
			if ($('#zcolors').hasClass('active')) {
				$('.editor_content').animate({opacity: 0}, 300, "easeOutQuad", function() {
					$('.editor_content').animate({opacity: 1}, 400, "easeOutQuad");
					$('.editor_content ul').css({opacity: 0, zIndex: 2111});
					$('#zcolors').removeClass('active');
					$('#zcolors-adv').css({opacity: 1, zIndex: 2112}).addClass('active');
					$('.editor_content #zcolors-adv li').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
						$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });	
					}, function() {  });	
				});
				$('.editor_content ul.active').find('li').addClass('noanimate').slowEach(35, function() {
					$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
				}, function() {  });
			} else {
			}
		} else {
			localStorage.setItem('advanced', false);
			$('.adv').hide();
			if ($('#zcolors-adv').hasClass('active')) {
				$('.editor_content').animate({opacity: 0}, 300, "easeOutQuad", function() {
					$('.editor_content').animate({opacity: 1}, 400, "easeOutQuad");
					$('.editor_content ul').css({opacity: 0, zIndex: 2111});
					$('#zcolors-adv').removeClass('active');
					$('#zcolors').css({opacity: 1, zIndex: 2112}).addClass('active');
					$('.editor_content #zcolors li').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
						$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });	
					}, function() {  });	
				});
				$('.editor_content ul.active').find('li').addClass('noanimate').slowEach(35, function() {
					$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
				}, function() {  });
			} else {
			}
		}
	});
	if (localStorage.getItem('advanced') == "true") {
		$('#advanced-check').checkbox('check');
	}

	$('.playerli-icons .fa').tipsy({live: true, gravity: 's'});
	$('.choose-emote').tipsy({live: true, gravity: 's'});
	$('.emotes-box img').tipsy({live: true, gravity: 's'});

	window.delTarget == $();
	window.deleteTimer = false;
	$(document).on('mousedown', '.playerli-icons .fa-trash', function(e) {
		window.delDown = true;
		window.delTarget = $(this);
		var $target = $(this).parents('.playerli').find('.playerli-delbg');
		$target.animate({width: '100%'}, 2000, "linear", function() {
			window.deleteTimer = true;
		});
	}).on('mouseup', function(e) {
		if (!window.delDown) { return; }
		if ($(e.target).parents('.playerli').data('uuid') == window.delTarget.parents('.playerli').data('uuid') && window.deleteTimer == true) { // Mouse is still on trash and delete timer has finished, do delete
			if (window.delTarget.parents('.ul-backups').length > 0) {
				deleteBackup(window.delTarget.parents('.playerli').data('pid'), window.delTarget.parents('.playerli').data('file'));
			} else {
				deletePlayer(window.delTarget.parents('.playerli').data('pid'));
			}
		} else {
			var $target = window.delTarget.parents('.playerli').find('.playerli-delbg');
			$('.playerli-delbg').css({width: '0%'}).stop();	
		}
		window.deleteTimer = false;
	});

	$(document).on('click', '.playerli', function(e) {
		if ($(e.target).parents('.playerli-icons').length > 0) {
			if ($(e.target).hasClass('fa-history')) {
				var pid = $(e.target).parents('.playerli').data('pid');
				locateBackups(pid);
			} else if ($(e.target).hasClass('fa-camera')) {
				var target = $(e.target).parents('.playerli');
				savePreviewImage(target);
			} else if ($(e.target).hasClass('fa-rotate-right')) {
				restoreBackup($(e.target).parents('.playerli').data('pid'), $(e.target).parents('.playerli').data('file'));
			}
			return;
		}
		if ($(e.target).parents('.ul-players').length > 0) {
			$('#player_list').fadeOut(300, "easeOutQuad", function() {
				$('.editor_content').fadeIn(400, "easeOutQuad");
				$('.playerops .active').removeClass('active');
				$('.playerops .btn').first().addClass('active');
				$('#zinfo').css({opacity:1});
				$('#zcolors').css({opacity:0});
				$('#zcolors-adv').css({opacity:0});
				$('html').addClass('bottomShown');
				$('.editor_content #zinfo li').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
					$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });
				}, function() {  });
				$('#wrapper').delay(200).fadeIn(400, "easeOutQuad", function() {
					$('#player_preview').animate({bottom: '0px'}, 500, "easeOutCubic");
					//$('.blurred_background').animate({top: '0px'}, 500, "easeOutCubic");
					$('#content_container').animate({paddingBottom: '129px'}, 500, "easeOutCubic");
				});
				$('.ecpicker').spectrum("reflow");
			});
			$('#header').css('background', 'rgba(20,20,20,1)');
			$('#player_list .ul-players li').addClass('noanimate').slowEach(35, function() {
				$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
			}, function() {  });
		}
	});

	// Shift+Right Click to Upload Player File
	var debugMenu = new gui.Menu();
		debugMenu.append(new gui.MenuItem({label: 'Send Player For Debugging'}));
		debugMenu.items[0].click = function() {	
			var debugRef = gui.Window.open('debug.html', {
				position: 'center',
				width: 400,
				height: 200,
			    resizable: false,
			    title: "SBSE Debugging",
			    icon: "images/icon.png",
			    frame: false,
	    		toolbar: false,
	    		focus: true,
	    		transparent: true
			});
			var debugMods = {};
			for (var key in Mods) {
				debugMods[key] = {
					modfile: Mods[key].modfile,
					path: Mods[key].path,
					type: Mods[key].type
				};
			}
			debugRef.data = {
				playerFile: this.playerFile,
				errors: PlayerErrors[this.playerFile],
				mods: debugMods,
				playerPath: PlayerDir
			};
		}

	$(document).on('contextmenu', function(e) {
		if (e.shiftKey && $(e.target).parents('.ul-players').length > 0) {
			e.preventDefault();
			var pli = $(e.target);
			if (!pli.data('file')) {
				pli = $(e.target).parents('.ul-players li');
			}
			if (pli.data('file')) {
				debugMenu.items[0].playerFile = pli.data('file');
				debugMenu.popup(e.clientX, e.clientY);
			}
			return false;
		}
	});

	$(document).on('click', '.cancel_edit', function() {
		PlayerFilesList[ActiveEdit].Player.PlayerEntity = resetPlayer;
		PlayerFilesList[ActiveEdit].Player.resetDirectives();
		PlayerFilesList[ActiveEdit].Player.showWarning = false;
		ActiveEdit = "";
		$('.editor_content').fadeOut(300, "easeOutQuad");
		$('.editor_content ul').filter(function() {
			return $(this).css('opacity') == '1';
		}).find('li').addClass('noanimate').slowEach(35, function() {
			$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
		}, function() {  });
		$('#content_container').animate({paddingBottom: '0px'}, 500, "easeInCubic");
		$('#player_preview').animate({bottom: '-135px'}, 500, "easeInCubic", function() {
			$('html').removeClass('bottomShown');
			$('#header').css('background', 'rgba(20,20,20,0)');
			$('#player_list').fadeIn(400, "easeOutQuad");
			$('#player_list .ul-players li').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
				$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });
			}, function() {  });
		});
	});

	$(document).on('click', '.save_file', function() {
		$('.edit-name-save').trigger('click');
		resetPlayer = null;
		PlayerFilesList[ActiveEdit].Player.save(PlayerDir+BackupDir);
		PlayerFilesList[ActiveEdit].Player.showWarning = false;
		ActiveEdit = "";
		$('.editor_content').fadeOut(300, "easeOutQuad");
		$('.editor_content ul').filter(function() {
			return $(this).css('opacity') == '1';
		}).find('li').addClass('noanimate').slowEach(35, function() {
			$(this).animate({opacity: 0, top:'70px'}, 200, "easeInQuad", function() { $(this).removeClass('noanimate'); });
		}, function() {  });
		$('#content_container').animate({paddingBottom: '0px'}, 500, "easeInCubic");
		$('#player_preview').animate({bottom: '-135px'}, 500, "easeInCubic", function() {
			$('html').removeClass('bottomShown');
			$('#header').css('background', 'rgba(20,20,20,0)');
			$('#player_list').fadeIn(400, "easeOutQuad");
			$('#player_list .ul-players li').addClass('noanimate').css({opacity: 0, top: '-50px'}).slowEach(25, function() {
				$(this).animate({opacity: 1, top:'0px'}, 400, "easeInOutBack", function() { $(this).removeClass('noanimate'); });
			}, function() {  });
		});
	});

	$('.player_mod').on({
	    mouseenter: function () {
			$('.player_mod').animate({opacity: 1}, 200);
	    },
	    mouseleave: function () {
			$('.player_mod').animate({opacity: 0}, 200);
	    }
	});

	$('.pose-body-left').click(function(e) { PlayerFilesList[ActiveEdit].Player.changeBodyPose(-1); });
	$('.pose-body-right').click(function(e) { PlayerFilesList[ActiveEdit].Player.changeBodyPose(1); });
	$('.pose-arm-left').click(function(e) { PlayerFilesList[ActiveEdit].Player.changeArmPose(-1); });
	$('.pose-arm-right').click(function(e) { PlayerFilesList[ActiveEdit].Player.changeArmPose(1); });
	$('.choose-emote').click(function(e) {
		if ($(this).hasClass('fa-smile-o')) {
			$('.emotes-box').empty();
			var base = createCanvas(PlayerFilesList[ActiveEdit].Player.emoteData.frameGrid.size[0], PlayerFilesList[ActiveEdit].Player.emoteData.frameGrid.size[1]);
			for (var i in Emotes[PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['species'].data]) {
				var emote = Emotes[PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['species'].data][i];
				var toAdd = $('<img data-emoteid="'+i+'" src="'+PlayerFilesList[ActiveEdit].Player.drawAvatar({emote: i, spriteMult:2, showArmor: false}).toDataURL()+'" />').attr('title', emote.extra.name.charAt(0).toUpperCase() + emote.extra.name.slice(1).replace('.', ' '));
				$('.emotes-box').append(toAdd);
			}

			$(this).removeClass('fa-smile-o').addClass('fa-remove').attr('title', 'Close');
			$('#player_preview').animate({height: 180}, {duration: 200, easing: "easeOutQuad", queue: false});
			$('.edit_btns').animate({bottom: 58}, 200, "easeOutQuad");
		} else {
			$(this).addClass('fa-smile-o').removeClass('fa-remove').attr('title', 'Choose Emote');
			$('#player_preview').animate({height: 129}, {duration: 200, easing: "easeOutQuad", queue: false});	
			$('.edit_btns').animate({bottom: 8}, 200, "easeOutQuad");
		}
		
	});
	$(document).on('click', '.emotes-box img', function(e) {
		var emote = $(this).data('emoteid');
		if (emote != undefined) {
			$('.choose-emote').addClass('fa-smile-o').removeClass('fa-remove').attr('title', 'Choose Emote');
			$('#player_preview').animate({height: 129}, {duration: 200, easing: "easeOutQuad", queue: false});	
			$('.edit_btns').animate({bottom: 8}, 200, "easeOutQuad");
			PlayerFilesList[ActiveEdit].Player.currentEmote = emote;
			PlayerFilesList[ActiveEdit].Player.drawEmote();
			PlayerFilesList[ActiveEdit].Player.emotePickerBase.context.drawImage(Emotes[PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['species'].data][emote].canvas, 0, 0, PlayerFilesList[ActiveEdit].Player.emoteData.frameGrid.size[0], PlayerFilesList[ActiveEdit].Player.emoteData.frameGrid.size[1],
													 PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, PlayerFilesList[ActiveEdit].Player.emoteData.frameGrid.size[0]*3, PlayerFilesList[ActiveEdit].Player.emoteData.frameGrid.size[1]*3);
		}
	});

	$(document).on('click', function(e) {
		if ($(e.target).parents('.emotes-box').length < 1 && !$(e.target).hasClass('emotes-box') && !$(e.target).hasClass('choose-emote') && $('.choose-emote').hasClass('fa-remove')) {
			$('.choose-emote').trigger('click');
		}
	});

	$(document).on('click', '.player-avatar', function(e) {
		var hairContainer = $(this).parent().find('.hair-styles');
		if ($(this).hasClass('av-select')) {
			hairContainer.slideUp(200);
			$(this).removeClass('av-select');
		} else if (!window.loadingHairs) {
			window.loadingHairs = true;
			$('.hair-styles .row').empty();
			$('.player-avatar-loader').fadeIn(100);
			var HairStylesArray = HairStyles[PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['species'].data];
			var hi = 0;
			var hairLoop = function() {
				var hairStyle = HairStylesArray[hi].canvas;	
				var hairData = HairStylesArray[hi].extra;
				var hairStyleImg = PlayerFilesList[ActiveEdit].Player.drawAvatar({spriteMult:3, hair: hairStyle, showArmor: $('.armor').is(':visible')}).toDataURL();
				$('.hair-styles .row').append('<div class="col-xs-3" data-index="'+hi+'" data-group="'+hairData.group+'" data-hair="'+hairData.hair+'" style="text-align: center;"><img src="'+hairStyleImg+'" /></div>');
				hi++;
				if (hi < HairStylesArray.length) {
					global.setImmediate(hairLoop);
				} else {
					window.loadingHairs = false;
					$('.player-avatar').addClass('av-select');
					hairContainer.slideDown(200);
					$('.player-avatar-loader').fadeOut(100);
				}
			}
			global.setImmediate(hairLoop);
		}
	});
	$(document).on('click', '.hair-styles .col-xs-3', function() {
		var hairGroup = String($(this).data('group'));
		var hairType = String($(this).data('hair'));
		var hi = $(this).data('index');

		PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['hairGroup'].data = hairGroup;
		PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['hairType'].data = hairType;

		PlayerFilesList[ActiveEdit].Player.hairImg = HairStyles[PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['species'].data][hi];
		PlayerFilesList[ActiveEdit].Player.drawHair();

		$('.player-avatar').trigger('click');
		$('.player-avatar img').attr('src', $(this).find('img').attr('src'));

	});
	$(document).on('click', '.player-description', function(e) {
		var description = $(this).text();
		$(this).hide();
		$(this).parent().append('<textarea class="description-edit">'+description+'</textarea><button class="description-edit-save btn btn-info pull-right">Save</button> <button class="description-edit-cancel btn btn-default pull-right">Cancel</button>');
		console.log(description);
	});
	$(document).on('click', '.description-edit-save', function(e) {
		var newDescription = $('.description-edit').val();
		console.log(newDescription)
		$('.player-description p').text(newDescription);
		PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['description'].data = newDescription;
		$('.description-edit, .description-edit-cancel, .description-edit-save').remove();
		$('.player-description').show();
	});
	$(document).on('click', '.description-edit-cancel', function(e) {
		$('.description-edit, .description-edit-cancel, .description-edit-save').remove();
		$('.player-description').show();
	});
	$(document).on('click', '.random-name', function(e) {
		PlayerFilesList[ActiveEdit].Player.generateName();
	});
	$(document).on('click', '.edit-name', function(e) {
		var ohtml = $('.player_info .name-box').html();
		$('.player_info .name-box').html('<input class="name-input" type="text" value="'+$('.player_info .pname').text().replace('"', '\"')+'" style="min-width: 30px; max-width: calc(100% - 145px);" /><i class="edit-name-close fa fa-times-circle"></i><i class="edit-name-save fa fa-check-circle"></i>');
		$('.name-input').focus().on('keypress', function(e){
			var div = $('<div>'+$(this).val()+'</div>').hide().appendTo("body");
			$(this).width(div.width());
			div.remove();
			if (e.which == 13) {
				$('.edit-name-save').trigger('click');
			}
		}).trigger('keypress');
		$('.edit-name-close').click(function() {
			$('.player_info .name-box').html(ohtml);
			$(document).unbind('click.asd');
		});
		$('.edit-name-save').click(function() {
			var name = $('.name-input').val();
			if (!name) { return $('.player_info .name-box').html(ohtml); }
			PlayerFilesList[ActiveEdit].Player.PlayerEntity.data['identity'].data['name'].data = name;
			$('.player_info .name-box').html(ohtml);
			$('.player_info .pname').text(name);
			$(document).unbind('click.asd');
		});
		$(document).on('click.asd', function(e) {
			if ($(e.target) != $('.name-box') && $(e.target).parents('.name-box').length < 1) {
				$('.edit-name-save').trigger('click');
			}
		});
	});
	$("input[type='number']").stepper();
}

function blendColor(hue, sat, light, val) {
	var color = blend2({r:0,g:0,b:0}, hue, sat);

	if (light <= -1) {
		return {r:0,g:0,b:0};
	} else if (light >= 1) {
		return {r:255,g:255,b:255};
	} else if (light >= 0) {
		return blend3({r:0,g:0,b:0}, color, {r:255,g:255,b:255}, 2 * (1 - light) * (val - 1) + 1);
	} else {
		return blend3({r:0,g:0,b:0}, color, {r:255,g:255,b:255}, 2 * (1 + light) * (val) - 1);
	}
}

function blend2(left,right,pos) {
	return {r: left.r * (1-pos) + right.r * pos, g: left.g * (1-pos) + right.g * pos, b: left.b * (1-pos) + right.b * pos};
}

function blend3(left,main,right,pos) {
	if (pos < 0) {
		return blend2(left,main,pos+1);
	} else if (pos > 0) {
		return blend2(main,right,pos);
	} else {
		return main;
	}
}

function getUserHome() {
	return process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
}

jQuery.fn.slowEach = function(interval, callback, callback2) {
	var items = this, i = 0;
	if(!items.length) return;
	function next() {
		if (callback.call(items[i], i, items[i]) !== false && ++i < items.length) {
			setTimeout(next, interval);
		} else {
			setTimeout(function() { callback2; callback2.call(items, i, items); }, interval*2);
		}
	}
	next();
};

Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
}

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

Date.prototype.format = function(format) //author: meizz
{
  var o = {
    "M+" : this.getMonth()+1, //month
    "d+" : this.getDate(),    //day
    "h+" : this.getHours(),   //hour
    "m+" : this.getMinutes(), //minute
    "s+" : this.getSeconds(), //second
    "q+" : Math.floor((this.getMonth()+3)/3),  //quarter
    "S" : this.getMilliseconds() //millisecond
  }

  if(/(y+)/.test(format)) format=format.replace(RegExp.$1,
    (this.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(var k in o)if(new RegExp("("+ k +")").test(format))
    format = format.replace(RegExp.$1,
      RegExp.$1.length==1 ? o[k] :
        ("00"+ o[k]).substr((""+ o[k]).length));
  return format;
}

String.prototype.fulltrim = function () {
  return this.replace( /([^\x01-\xFF]|\s)*$/g, '' );
};

function parseJSON(json) {
	if (typeof json == "object") { return json; }
	return JSON.parse(JSON.minify(json));
}

function findPos(obj) {
    var curleft = 0, curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}

CanvasRenderingContext2D.prototype.paintToCanvas = function( sheet, offsetX, offsetY, swidth, sheight, destX, destY, width, height, paletteSwaps ) {
	this.clearRect( 0, 0, width, height );
	this.drawImage( sheet, offsetX, offsetY, swidth, sheight, destX, destY, width, height );
	
	var imageData = this.getImageData( 0, 0, width, height );
	var pix = imageData.data;
	var sourcecolors = toSingleArray(paletteSwaps[0]), destcolors = toSingleArray(paletteSwaps[1]);

	for (var i = 0, n = pix.length; i < n; i += 4) {
		if (pix[i+3] != 0) {
			for (var c = 0; c < sourcecolors.length; c++) {
				sourceColor = hexToRgb(sourcecolors[c]);
				destColor = hexToRgb(destcolors[c]);
				if (pix[i] == sourceColor.r && pix[i+1] == sourceColor.g && pix[i+2] == sourceColor.b) {
					//console.log('Changing '+sourceColor+' to '+destColor)
					pix[i] = destColor.r;   // Red component
					pix[i+1] = destColor.g; // Green component
					pix[i+2] = destColor.b; // Blue component
					if (destColor['a'] !== undefined) {
						pix[i+3] = destColor.a;
					}
				}
			}
		}
	}
	this.putImageData(imageData, 0, 0);
}

$(function() {
	setUp();
});
