var bPNG = require('pngjs2').PNG;

function StarSave() {
	var _this = this;
	this.header = null;
	this.versions = new Array("SBVJ01");
	this.uuid;
	this.pid;

	this.parse = function(playerFile, callback) {
		var data = fs.readFileSync(playerFile);
		var buffer = new OffsetBuffer(data);
		if (!_this.uuid) {
			_this.uuid = uuid.v4();
		}

		_this.playerFile = playerFile;

		_this.header = data.slice(0,6).toString();
		buffer.read_offset += 6;

		if ($.inArray(_this.header, _this.versions) == -1) {
			console.log('Invalid Player File: '+_this.header);
			return false;
		}

		var entity = buffer.readUTF8Str();
		_this.entity = entity;

		var variant = new VersionedVariant();
		_this.variant = variant;
		_this[entity] = variant.parseVariant(buffer);

		if (!_this.pid) { // Store as pid, uuid is already SBSE's unique ID
			try {
				_this.pid = _this[entity].data['uuid'].data;
			} catch(e) {}
		}

		if (callback !== undefined) {
			callback(_this);
		}

		return true;
	}

	this.export = function(callback) {
		var buffer = new OffsetBuffer(5000000);

		buffer.write(_this.header);
		buffer.writeUTF8Str(_this.entity);
		_this.variant.packVariant(buffer);

		var result = new OffsetBuffer(buffer.write_offset);
			result.copyFrom(buffer.buf, 0, buffer.write_offset);

		return result.buf;
	}

	this.backup = function(destination) {
		try { fs.mkdirSync(destination); } catch(e) { }		
		try { fs.mkdirSync(destination+_this.PlayerEntity.data['uuid'].data); } catch(e) { }
		var fileName = "SBSE-Backup_"+new Date().format("MM-dd-yyyy_h-mm-ss_")+path.basename(_this.playerFile);
		fs.writeFileSync(destination+_this.PlayerEntity.data['uuid'].data+'/'+fileName, fs.readFileSync(_this.playerFile));
	}

	this.save = function(backup) {
		if (!_this.playerFile) { return; }
		_this.saveDirectives();
		_this.PlayerEntity.data['inventory'].data['money'].data = $('#player_pixels_n').val();
		_this.generatePreview(true);

		if (backup) {
			_this.backup(backup);
		}

		var result = fs.writeFileSync(_this.playerFile, this.export());
		return result;
	}

	this.normalizeItem = function(item) {
		// Special function for compatability between old/new item systems
		if (item['content']) {
			return item['content'].data;
		} else if (item['__content']) {
			return item['__content'].data;
		} else {
			return item;
		}
	}

	this.normalizeItemParam = function(item) {
		// Special function for compatability between old/new item systems
		if (item['parameters']) {
			return item['parameters'];
		} else {
			return item.data;
		}
	}

	this.generatePreview = function(update, backup) {
		if (_this.PlayerEntity == undefined) {
			console.log('File not loaded.');
			return false;
		}

		_this.humanoid = parseJSON(starReadFile("/humanoid.config").buf.toString());
		_this.speciesPath = "/humanoid/"+_this.PlayerEntity.data['identity'].data['species'].data+"/";

		var humanoidPersonalities = _this.humanoid.charGen;
		if (!humanoidPersonalities) {
			humanoidPersonalities = _this.humanoid.personalities;
		} else {
			humanoidPersonalities = humanoidPersonalities.personalities;
		}

		_this.personalitiesList = [];
		_this.personalitiesOffsetList = {};
		humanoidPersonalities.forEach(function(personality) {
			if (personality[0] == personality[1]) {
				_this.personalitiesList.push(personality[0]);
				_this.personalitiesOffsetList[personality[0]] = {armOffset: personality[3], headOffset: personality[2]}
			}
		});

		// Gather Body Frames Data
		_this.bodyFrames = starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['gender'].data+"body.frames");
		if (!_this.bodyFrames) {
			_this.bodyFrames = starReadFile('/humanoid/'+_this.PlayerEntity.data['identity'].data['gender'].data+"body.frames");
		}
		_this.bodyFrames = parseJSON(_this.bodyFrames.buf.toString());
		_this.bodyFrameList = [];
		_this.bodyFrameOffsets = {};
		_this.bodyFrames.frameGrid.names.forEach(function(x, ix) {
			x.forEach(function(y, iy) {
				if (y != null) {
					_this.bodyFrameList.push(y);
					_this.bodyFrameOffsets[y] = {y: ix, x: iy};
				}
			});
		});

		for (var alias in _this.bodyFrames.aliases) {
			_this.bodyFrameOffsets[alias] = _this.bodyFrameOffsets[_this.bodyFrames.aliases[alias]];
		}

		// Back Arm Data

		_this.backArmFrames = starReadFile(_this.speciesPath+"backarm.frames");
		if (!_this.backArmFrames) {
			_this.backArmFrames = starReadFile('/humanoid/backarm.frames');
		}
		_this.backArmFrames = parseJSON(_this.backArmFrames.buf.toString());
		_this.backArmFrameOffsets = {};
		_this.backArmFrames.frameGrid.names.forEach(function(x, ix) {
			x.forEach(function(y, iy) {
				if (y != null) {
					_this.backArmFrameOffsets[y] = {y: ix, x: iy};
				}
			});
		});

		for (var alias in _this.backArmFrames.aliases) {
			_this.backArmFrameOffsets[alias] = _this.backArmFrameOffsets[_this.backArmFrames.aliases[alias]];
		}

		// Front Arm Data

		_this.frontArmFrames = starReadFile(_this.speciesPath+"frontarm.frames");
		if (!_this.frontArmFrames) {
			_this.frontArmFrames = starReadFile('/humanoid/frontarm.frames');
		}
		_this.frontArmFrames = parseJSON(_this.frontArmFrames.buf.toString());
		_this.frontArmFrameOffsets = {};
		_this.frontArmFrames.frameGrid.names.forEach(function(x, ix) {
			x.forEach(function(y, iy) {
				if (y != null) {
					_this.frontArmFrameOffsets[y] = {y: ix, x: iy};
				}
			});
		});

		for (var alias in _this.frontArmFrames.aliases) {
			_this.frontArmFrameOffsets[alias] = _this.frontArmFrameOffsets[_this.frontArmFrames.aliases[alias]];
		}

		_this.headFrames = starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['gender'].data+"head.frames");
		if (!_this.headFrames) {
			_this.headFrames = starReadFile('/humanoid/'+_this.PlayerEntity.data['identity'].data['gender'].data+"head.frames");
		}
		_this.headFrames = parseJSON(_this.headFrames.buf.toString());
		_this.species = parseJSON(starReadFile('/species/'+_this.PlayerEntity.data['identity'].data['species'].data+".species").buf.toString());
		//_this.nameGen = parseJSON(starReadFile('/species/'+_this.PlayerEntity.data['identity'].data['species'].data+"namegen.config").buf.toString());
		_this.nameGen = starReadFile('/species/'+_this.PlayerEntity.data['identity'].data['species'].data+"namegen.config");
		if (!_this.nameGen) {
			_this.nameGen = starReadFile('/species/'+_this.PlayerEntity.data['identity'].data['species'].data+_this.PlayerEntity.data['identity'].data['gender'].data+"namegen.config");
		}
		_this.nameGen = parseJSON(_this.nameGen.buf.toString());
		if (_this.PlayerEntity.data['identity'].data['hairGroup'].data) {
			_this.hairFrames = parseJSON(starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['hairGroup'].data+'/default.frames').buf.toString());
		}
		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
			_this.facialHairFrames = parseJSON(starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['facialHairGroup'].data+'/default.frames').buf.toString());
		}
		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
			_this.facialMaskFrames = parseJSON(starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data+'/default.frames').buf.toString());
		}
		_this.armorIconFrames = parseJSON(starReadFile('/items/armors/icons.frames').buf.toString());

		_this.sourceWidth = _this.bodyFrames.frameGrid.size[0];
		_this.sourceHeight = _this.bodyFrames.frameGrid.size[1];

		_this.bodyIdleOffset = (_.invert(_this.bodyFrames.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];
		_this.backArmIdleOffset = _this.backArmFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];
		_this.frontArmIdleOffset = _this.frontArmFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];

		var itemsLoaded = 0;
		var itemsToLoad = 0;

		var doHairStyles = false;

		if (HairStyles[_this.PlayerEntity.data['identity'].data['species'].data] == undefined) {
			doHairStyles = true;
			HairStyles[_this.PlayerEntity.data['identity'].data['species'].data] = new Array();
			var TempArray = {};
			for(g in _this.species.genders) {
				var gen = _this.species.genders[g];
				var hairGroup = (gen['hairGroup']!=undefined)?gen['hairGroup']:'hair';
				for(h in gen['hair']) {
					var hai = gen['hair'][h];

					TempArray[hairGroup+'/'+hai] = createCanvas(_this.sourceWidth, _this.sourceHeight);
					TempArray[hairGroup+'/'+hai].extra = {group: hairGroup, hair: hai};

					PNG.load(starReadFile(_this.speciesPath+hairGroup+'/'+hai+'.png').buf.toString('base64'), TempArray[hairGroup+'/'+hai].canvas, function() {
						itemsLoaded += 1;
					});
					itemsToLoad++;

				}
			}
			_.each(TempArray, function(hair) {
				HairStyles[_this.PlayerEntity.data['identity'].data['species'].data].push(hair);
			});
		}

		_this.emoteData = parseJSON(starReadFile('/humanoid/emote.frames').buf.toString());
		_this.emotesImg = createCanvas(0,0);
		PNG.load(starReadFile(_this.speciesPath+'emote.png').buf.toString('base64'), _this.emotesImg.canvas, function() {
			itemsLoaded += 1;
		});
		itemsToLoad++;
		_this.currentEmote = null;

		_this.emoteDirectives = directive2ColorArray(_this.PlayerEntity.data['identity'].data['emoteDirectives'].data);
		_this.emoteODirectives = $.extend(true, {}, _this.emoteDirectives);
		_this.bodyDirectives = directive2ColorArray(_this.PlayerEntity.data['identity'].data['bodyDirectives'].data);
		_this.bodyODirectives = $.extend(true, {}, _this.bodyDirectives);
		_this.hairDirectives = directive2ColorArray(_this.PlayerEntity.data['identity'].data['hairDirectives'].data);
		_this.hairODirectives = $.extend(true, {}, _this.hairDirectives);
		_this.facialHairDirectives = directive2ColorArray(_this.PlayerEntity.data['identity'].data['facialHairDirectives'].data);
		_this.facialHairODirectives = $.extend(true, {}, _this.facialHairDirectives);
		_this.facialMaskDirectives = directive2ColorArray(_this.PlayerEntity.data['identity'].data['facialMaskDirectives'].data);
		_this.facialMaskODirectives = $.extend(true, {}, _this.facialMaskDirectives);

		_this.backArmImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
		_this.backArmFile = starReadFile(_this.speciesPath+"backarm.png");
		if (_this.backArmFile != false) {
			new bPNG().parse(_this.backArmFile.buf, function(err, image) {
				_this.render(_this.backArmImg, image);
				itemsLoaded += 1;
			});
			itemsToLoad++;
		}

		_this.bodyImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
		_this.bodyFile = starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['gender'].data+"body.png");
		if (_this.bodyFile != false) {
			new bPNG().parse(_this.bodyFile.buf, function(err, image) {
				_this.render(_this.bodyImg, image);
				itemsLoaded += 1;
			});
			itemsToLoad++;
		}

		_this.headImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
		_this.headFile = starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['gender'].data+"head.png");
		if (_this.headFile != false) {
			new bPNG().parse(_this.headFile.buf, function(err, image) {
				_this.render(_this.headImg, image);
				itemsLoaded += 1;
			});
			itemsToLoad++;
		}

		_this.hairImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
		_this.hairFile = starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['hairGroup'].data+"/"+_this.PlayerEntity.data['identity'].data['hairType'].data+".png");
		if (_this.hairFile != false) {
			new bPNG().parse(_this.hairFile.buf, function(err, image) {
				_this.render(_this.hairImg, image);
				itemsLoaded += 1;
			});
			itemsToLoad++;
		}

		_this.frontArmImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
		_this.frontArmFile = starReadFile(_this.speciesPath+"frontarm.png");
		if (_this.frontArmFile != false) {
			new bPNG().parse(_this.frontArmFile.buf, function(err, image) {
				_this.render(_this.frontArmImg, image);
				itemsLoaded += 1;
			});
			itemsToLoad++;
		}

		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
			_this.facialHairImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
			_this.facialHairFile = starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['facialHairGroup'].data+'/'+_this.PlayerEntity.data['identity'].data['facialHairType'].data+'.png');
			if (_this.facialHairFile != false) {
				new bPNG().parse(_this.facialHairFile.buf, function(err, image) {
					_this.render(_this.facialHairImg, image);
					itemsLoaded += 1;
				});
			}
			itemsToLoad++;
		}

		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
			_this.facialMaskImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
			_this.facialMaskFile = starReadFile(_this.speciesPath+_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data+'/'+_this.PlayerEntity.data['identity'].data['facialMaskType'].data+'.png');
			if (_this.facialMaskFile != false) {
				new bPNG().parse(_this.facialMaskFile.buf, function(err, image) {
					_this.render(_this.facialMaskImg, image);
					itemsLoaded += 1;
				});
			}
			itemsToLoad++;
		}

		_this.maxHealth = 100;
		_this.maxEnergy = 100;
		var parseEffects = function(effect) {
			if (effect['stat'] == "maxHealth") {
				_this.maxHealth += effect['amount'];
			}
			if (effect['stat'] == "maxEnergy") {
				_this.maxEnergy += effect['amount'];
			}
		}

		_this.chestVanity = false;
		_this.chestItem;
		_this.alias;
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[1].data !== null) { // Load the active chest item so we can calculate max health, if a vanity item exists this will be overwritten
			_this.chestItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[1].data;
			if (_this.chestItem) {
				_this.chestItem = _this.normalizeItem(_this.chestItem);
				console.log(_this.chestItem);
				_this.chestItemData = starItemData(_this.chestItem['name'].data);
				if (_this.chestItemData.statusEffects && _this.chestItemData.statusEffects.length) {
					_this.chestItemData.statusEffects.forEach(parseEffects);
				}
			}
		}
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[5].data !== null) {
			_this.chestItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[5].data;
			_this.chestVanity = true;
			if (_this.chestItem) {
				_this.chestItem = _this.normalizeItem(_this.chestItem);
				_this.chestItemData = starItemData(_this.chestItem['name'].data);
			}
		}
		if (_this.chestItem && _this.chestItemData) {
			_this.chestFrameDataO = parseJSON(starReadFile('/items/armors/chest.frames').buf.toString());
			_this.backArmFrameData = parseJSON(starReadFile('/items/armors/bsleeve.frames').buf.toString());
			_this.frontArmFrameData = parseJSON(starReadFile('/items/armors/fsleeve.frames').buf.toString());
			_this.chestIconFrames = _this.chestItemData.inventoryIcon.split(':');
			_this.chestIconImg = createCanvas(16,64);
			_this.chestIconFile = starReadFile(_this.chestItemData.dir+'/'+_this.chestIconFrames[0]);
			if (_this.chestIconFile != false) {
				new bPNG().parse(_this.chestIconFile.buf, function(err, image) {
					_this.render(_this.chestIconImg, image);
					itemsLoaded += 1;
				});
			}

			_this.doChestArmor = true;

			_this.backArmArmorFrameOffsets = {};
			_this.backArmFrameData.frameGrid.names.forEach(function(x, ix) {
				x.forEach(function(y, iy) {
					if (y != null) {
						_this.backArmArmorFrameOffsets[y] = {y: ix, x: iy};
					}
				});
			});

			for (var alias in _this.backArmFrameData.aliases) {
				_this.backArmArmorFrameOffsets[alias] = _this.backArmArmorFrameOffsets[_this.backArmFrameData.aliases[alias]];
			}

			_this.backArmArmorIdleOffset = _this.backArmArmorFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];
			if (_this.normalizeItemParam(_this.chestItem).data['directives']) {
				_this.chestArmorDirectives = directive2ColorArray(_this.normalizeItemParam(_this.chestItem).data['directives'].data);
			} else if (_this.normalizeItemParam(_this.chestItem).data['colorIndex']) {
				_this.chestArmorDirectives = directive2ColorArray(getDefaultColors(_this.chestItemData, _this.normalizeItemParam(_this.chestItem).data['colorIndex'].data));
			} else {
				_this.chestArmorDirectives = directive2ColorArray(getDefaultColors(_this.chestItemData));
			}
			_this.chestArmorODirectives = $.extend(true, {}, _this.chestArmorDirectives);

			_this.backArmArmorImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
				new bPNG().parse(starReadFile(_this.chestItemData.dir+'/'+_this.chestItemData[_this.PlayerEntity.data['identity'].data['gender'].data+'Frames'].backSleeve).buf, function(err, image) {
					_this.render(_this.backArmArmorImg, image);
					itemsLoaded += 1;
				});

				_this.alias = _this.chestFrameDataO.aliases[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];
				_this.chestFrameData = _this.chestFrameDataO.frameList[_this.alias];
			_this.chestArmorImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
				new bPNG().parse(starReadFile(_this.chestItemData.dir+'/'+_this.chestItemData[_this.PlayerEntity.data['identity'].data['gender'].data+'Frames'].body).buf, function(err, image) {
					_this.render(_this.chestArmorImg, image);
					itemsLoaded += 1;
				});

			_this.frontArmArmorFrameOffsets = {};
			_this.frontArmFrameData.frameGrid.names.forEach(function(x, ix) {
				x.forEach(function(y, iy) {
					if (y != null) {
						_this.frontArmArmorFrameOffsets[y] = {y: ix, x: iy};
					}
				});
			});

			for (var alias in _this.frontArmFrameData.aliases) {
				_this.frontArmArmorFrameOffsets[alias] = _this.frontArmArmorFrameOffsets[_this.frontArmFrameData.aliases[alias]];
			}

			_this.frontArmArmorIdleOffset = _this.frontArmArmorFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];

			_this.frontArmArmorImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
				new bPNG().parse(starReadFile(_this.chestItemData.dir+'/'+_this.chestItemData[_this.PlayerEntity.data['identity'].data['gender'].data+'Frames'].frontSleeve).buf, function(err, image) {
					_this.render(_this.frontArmArmorImg, image);
					itemsLoaded += 1;
				});

				itemsToLoad += 4;
		}

		_this.pantsVanity = false;
		_this.pantsItem;
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[2].data !== null) {
			_this.pantsItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[2].data;
			if (_this.pantsItem) {
				_this.pantsItem = _this.normalizeItem(_this.pantsItem);
				_this.pantsItemData = starItemData(_this.pantsItem['name'].data);
				if (_this.pantsItemData.statusEffects && _this.pantsItemData.statusEffects.length) {
					_this.pantsItemData.statusEffects.forEach(parseEffects);
				}
			}
		}
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[6].data !== null) {
			_this.pantsItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[6].data;
			_this.pantsVanity = true;
			if (_this.pantsItem) {
				_this.pantsItem = _this.normalizeItem(_this.pantsItem);
				_this.pantsItemData = starItemData(_this.pantsItem['name'].data);
				if (_this.pantsItemData.statusEffects && _this.pantsItemData.statusEffects.length) {
					_this.pantsItemData.statusEffects.forEach(parseEffects);
				}
			}
		}
		if (_this.pantsItem && _this.pantsItemData) {
			_this.pantsFrameData = parseJSON(starReadFile('/items/armors/pants.frames').buf.toString());
			_this.pantsIconFrames = _this.pantsItemData.inventoryIcon.split(':');
			_this.pantsIconImg = createCanvas(16,64);
			_this.pantsIconFile = starReadFile(_this.pantsItemData.dir+'/'+_this.pantsIconFrames[0]);
			if (_this.pantsIconFile != false) {
				new bPNG().parse(_this.pantsIconFile.buf, function(err, image) {
					_this.render(_this.pantsIconImg, image);
					itemsLoaded += 1;
				});
				itemsToLoad++;
			}

			_this.doPantsArmor = true;

			_this.pantsArmorIdleOffset = (_.invert(_this.pantsFrameData.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];
			if (_this.normalizeItemParam(_this.pantsItem).data['directives']) {
				_this.pantsArmorDirectives = directive2ColorArray(_this.normalizeItemParam(_this.pantsItem).data['directives'].data);
			} else if (_this.normalizeItemParam(_this.pantsItem).data['colorIndex']) {
				_this.pantsArmorDirectives = directive2ColorArray(getDefaultColors(_this.pantsItemData, _this.normalizeItemParam(_this.pantsItem).data['colorIndex'].data));
			} else {
				_this.pantsArmorDirectives = directive2ColorArray(getDefaultColors(_this.pantsItemData));
			}
			_this.pantsArmorODirectives = $.extend(true, {}, _this.pantsArmorDirectives);
			
			_this.pantsArmorImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
				new bPNG().parse(starReadFile(_this.pantsItemData.dir+'/'+_this.pantsItemData[_this.PlayerEntity.data['identity'].data['gender'].data+'Frames']).buf, function(err, image) {
					_this.render(_this.pantsArmorImg, image);
					itemsLoaded += 1;
				});
				itemsToLoad++;
		}

		_this.backVanity = false;
		_this.backItem;
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[3].data !== null) {
			_this.backItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[3].data;
			if (_this.backItem) {
				_this.backItem = _this.normalizeItem(_this.backItem);
				_this.backItemData = starItemData(_this.backItem['name'].data);
				if (_this.backItemData.statusEffects && _this.backItemData.statusEffects.length) {
					_this.backItemData.statusEffects.forEach(parseEffects);
				}
			}
		}
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[7].data !== null) {
			_this.backItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[7].data;
			_this.backVanity = true;
			if (_this.backItem) {
				_this.backItem = _this.normalizeItem(_this.backItem);
				_this.backItemData = starItemData(_this.backItem['name'].data);
				if (_this.backItemData.statusEffects && _this.backItemData.statusEffects.length) {
					_this.backItemData.statusEffects.forEach(parseEffects);
				}
			}
		}
		if (_this.backItem && _this.backItemData) {
			_this.backFrameData = parseJSON(starReadFile('/items/armors/back.frames').buf.toString());
			_this.backIconFrames = _this.backItemData.inventoryIcon.split(':');
			_this.backIconImg = createCanvas(16,64);
			_this.backIconFile = starReadFile(_this.backItemData.dir+'/'+_this.backIconFrames[0]);
			if (_this.backIconFile) {
				new bPNG().parse(_this.backIconFile.buf, function(err, image) {
					_this.render(_this.backIconImg, image);
					itemsLoaded += 1;
				});
				itemsToLoad++;
			}

			_this.doBackArmor = true;
			if (_this.normalizeItemParam(_this.backItem).data['directives']) {
				_this.backArmorDirectives = directive2ColorArray(_this.normalizeItemParam(_this.backItem).data['directives'].data);
			} else if (_this.normalizeItemParam(_this.backItem).data['colorIndex']) {
				_this.backArmorDirectives = directive2ColorArray(getDefaultColors(_this.backItemData, _this.normalizeItemParam(_this.backItem).data['colorIndex'].data));
			} else {
				_this.backArmorDirectives = directive2ColorArray(getDefaultColors(_this.backItemData));
			}
			_this.backArmorODirectives = $.extend(true, {}, _this.backArmorDirectives);

			_this.backArmorIdleOffset = (_.invert(_this.backFrameData.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];

			_this.backArmorImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
				new bPNG().parse(starReadFile(_this.backItemData.dir+'/'+_this.backItemData[_this.PlayerEntity.data['identity'].data['gender'].data+'Frames']).buf, function(err, image) {
					_this.render(_this.backArmorImg, image);
					itemsLoaded += 1;
				});
				itemsToLoad++;
		}

		_this.headVanity = false;
		_this.headItem;
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[0].data !== null) {
			_this.headItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[0].data;
			if (_this.headItem) {
				_this.headItem = _this.normalizeItem(_this.headItem);
				_this.headItemData = starItemData(_this.headItem['name'].data);
				if (_this.headItemData.statusEffects && _this.headItemData.statusEffects.length) {
					_this.headItemData.statusEffects.forEach(parseEffects);
				}
			}
		}
		if (_this.PlayerEntity.data['inventory'].data['equipment'].data[4].data !== null) {
			_this.headItem = _this.PlayerEntity.data['inventory'].data['equipment'].data[4].data;
			_this.headVanity = true;
			if (_this.headItem) {
				_this.headItem = _this.normalizeItem(_this.headItem);
				_this.headItemData = starItemData(_this.headItem['name'].data);
				if (_this.headItemData.statusEffects && _this.headItemData.statusEffects.length) {
					_this.headItemData.statusEffects.forEach(parseEffects);
				}
			}
		}
		if (_this.headItem && _this.headItemData) {
			_this.headArmorFrameData = parseJSON(starReadFile('/items/armors/head.frames').buf.toString());
			_this.headIconFrames = _this.headItemData.inventoryIcon.split(':');
			_this.headIconImg = createCanvas(16,64);
			_this.headIconFile = starReadFile(_this.headItemData.dir+'/'+_this.headIconFrames[0]);
			if (_this.headIconFile != false) {
				new bPNG().parse(_this.headIconFile.buf, function(err, image) {
					_this.render(_this.headIconImg, image);
					itemsLoaded += 1;
				});
				itemsToLoad++;
			}

			_this.doHeadArmor = true;
			if (_this.normalizeItemParam(_this.headItem).data['directives']) {
				_this.headArmorDirectives = directive2ColorArray(_this.normalizeItemParam(_this.headItem).data['directives'].data);
			} else if (_this.normalizeItemParam(_this.headItem).data['colorIndex']) {
				_this.headArmorDirectives = directive2ColorArray(getDefaultColors(_this.headItemData, _this.normalizeItemParam(_this.headItem).data['colorIndex'].data));
			} else {
				_this.headArmorDirectives = directive2ColorArray(getDefaultColors(_this.headItemData));
			}
			_this.headArmorODirectives = $.extend(true, {}, _this.headArmorDirectives);

			_this.headArmorImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
				_this.headArmorImg.canvas.debugID = uuid.v4();
				new bPNG().parse(starReadFile(_this.headItemData.dir+'/'+_this.headItemData[_this.PlayerEntity.data['identity'].data['gender'].data+'Frames']).buf, function(err, image) {
					_this.render(_this.headArmorImg, image);
					itemsLoaded += 1;
				});
				itemsToLoad++;

			// Handle hair mask
			if (_this.headItemData['mask']) {
				_this.hairMaskImg = createCanvas(_this.sourceWidth, _this.sourceHeight);
				PNG.load(starReadFile(_this.headItemData.dir+'/'+_this.headItemData['mask']).buf.toString('base64'), _this.hairMaskImg.canvas, function() {
					itemsLoaded += 1;
				});
				itemsToLoad++;
			}
		}

		for (var pose in _this.bodyFrameOffsets) {
			if ((_this.backArmArmorFrameOffsets && !_this.backArmArmorFrameOffsets[pose]) || (_this.frontArmArmorFrameOffsets && !_this.frontArmArmorFrameOffsets[pose])) {
				delete _this.bodyFrameOffsets[pose];
				var index = _this.bodyFrameList.indexOf(pose);
				_this.bodyFrameList.splice(index, 1);
			}
		}

		var doneLoading = function() {
			var percentLoaded = ( itemsLoaded / itemsToLoad ) * 100;
			if (percentLoaded >= 100) {
				try {

				if (Emotes[_this.PlayerEntity.data['identity'].data['species'].data] == undefined) {
					var TempArray = [];
					for (y in _this.emoteData.frameGrid.names) {
						var row = _this.emoteData.frameGrid.names[y];
						for (x in row) {
							var emote = row[x];
							if (emote != null) {
								var toAdd = createCanvas(_this.emoteData.frameGrid.size[0],_this.emoteData.frameGrid.size[1]);
									toAdd.extra = {name: emote};

								toAdd.context.paintToCanvas(_this.emotesImg.canvas, x*_this.emoteData.frameGrid.size[0], y*_this.emoteData.frameGrid.size[1], 
												_this.emoteData.frameGrid.size[0], 
												_this.emoteData.frameGrid.size[1],
												0, 0, 
												_this.emoteData.frameGrid.size[0],
												_this.emoteData.frameGrid.size[1], Array(Array(), Array()));

								TempArray.push(toAdd);
							}
						}
					}
					Emotes[_this.PlayerEntity.data['identity'].data['species'].data] = TempArray;
				}
				
				var previewPNG = _this.drawCharacter({spriteMult: 2}).toDataURL("image/png");
				if ((update === undefined || update === false) && (backup === undefined || backup === false)) {
					$('#player_list .ul-players').append('<li class="playerli" data-uuid="'+_this.uuid+'" data-pid="'+_this.pid+'" data-file="'+_this.file+'" data-time="'+new Date(_this.filestats.mtime).getTime()+'" onclick="editPlayer(\''+_this.file+'\');"><img class="player_icon" src="'+previewPNG+'" /> \
												<div class="playerli_desc"><span class="playerli_name">'+_this.PlayerEntity.data['identity'].data['name'].data+'</span> '+DifficultyList[_this.PlayerEntity.data['modeType'].data]+'<br />\
												<div class="pull-left playerli_playtime" style="padding-right: 5px; font-size: 10px; margin-right: 5px; ">Playtime: '+String(_this.PlayerEntity.data['playTime'].data).toHHMMSS()+'</div><br />\
												<div class="pull-left playerli_lastplayed" style="font-size: 10px;">Last Played: '+new Date(_this.filestats.mtime).format("MM-dd-yyyy h:mm:ss")+'</div></div>\
												<div class="playerli-icons"><i title="Save Preview Image" class="fa fa-camera"></i> <i title="View Backups" class="fa fa-history"></i> <i title="Hold To Delete" class="fa fa-trash"></i></div>\
												<div class="playerli-delbg"></div></li>');
					window.playLoaded++;
				} else if ((update === undefined || update === false) && backup == true) {
					$('#player_list .ul-backups').append('<li class="playerli" data-uuid="'+_this.uuid+'" data-pid="'+_this.pid+'" data-file="'+_this.file+'" data-time="'+new Date(_this.filestats.mtime).getTime()+'"><img class="player_icon" src="'+previewPNG+'" /> \
												<div class="playerli_desc"><span class="playerli_name">'+_this.PlayerEntity.data['identity'].data['name'].data+'</span> '+DifficultyList[_this.PlayerEntity.data['modeType'].data]+'<br />\
												<div class="pull-left playerli_playtime" style="padding-right: 5px; font-size: 10px; margin-right: 5px; ">Playtime: '+String(_this.PlayerEntity.data['playTime'].data).toHHMMSS()+'</div><br />\
												<div class="pull-left playerli_lastplayed" style="font-size: 10px;">File Date: '+new Date(_this.filestats.mtime).format("MM-dd-yyyy h:mm:ss")+'</div></div>\
												<div class="playerli-icons"><i title="Restore This Backup" class="fa fa-rotate-right"></i> <i title="Hold To Delete" class="fa fa-trash"></i></div>\
												<div class="playerli-delbg"></div></li>');
					window.backLoaded++;
				} else {
					$('li[data-uuid="'+_this.uuid+'"] .player_icon').attr('src', previewPNG);					
					$('li[data-uuid="'+_this.uuid+'"] .playerli_name').text(_this.PlayerEntity.data['identity'].data['name'].data);
					$('li[data-uuid="'+_this.uuid+'"] .playerli_playtime').text('Playtime: '+String(_this.PlayerEntity.data['playTime'].data).toHHMMSS());
					$('li[data-uuid="'+_this.uuid+'"] .playerli_lastplayed').text('Last Played: '+new Date(_this.filestats.mtime).format("MM-dd-yyyy h:mm:ss"));
				}
				} catch(e) {
					console.log(_this.pantsArmorDirectives);
					console.log(e.stack);
				}
			} else {
				global.setImmediate(doneLoading);
			}
		}

		global.setImmediate(doneLoading);
	}

	this.drawCharacter = function(options) {
		if (!options) { options = {}; }

		var adv = options['advanced']||false;
		var spriteMult = options['spriteMult']||1;
		var showArmor = (options['showArmor']!=undefined)?options['showArmor']:true;
		var base = createCanvas(_this.sourceWidth,_this.sourceHeight);
		var output = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);

		base.context.paintToCanvas(_this.backArmImg.canvas, (_this.backArmIdleOffset.x*_this.sourceWidth), (_this.backArmIdleOffset.y*_this.sourceHeight), _this.sourceWidth, _this.sourceHeight,
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.bodyDirectivesAdv:_this.bodyDirectives); // Back Arm
		output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);

		if (_this.doChestArmor && showArmor) {
			base.context.paintToCanvas(_this.backArmArmorImg.canvas, (_this.backArmArmorIdleOffset.x*_this.backArmFrameData.frameGrid.size[0]), (_this.backArmArmorIdleOffset.y*_this.backArmFrameData.frameGrid.size[1]), _this.backArmFrameData.frameGrid.size[0], _this.backArmFrameData.frameGrid.size[1],
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.chestArmorDirectivesAdv:_this.chestArmorDirectives); // Back Arm Armor
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		}

		if (_this.doBackArmor && showArmor) {
			base.context.paintToCanvas(_this.backArmorImg.canvas, (_this.backArmorIdleOffset*_this.backFrameData.frameGrid.size[0]), 0, _this.backFrameData.frameGrid.size[0], _this.backFrameData.frameGrid.size[1], 0, 0, _this.sourceWidth, _this.sourceHeight, (adv)?_this.backArmorDirectivesAdv:_this.backArmorDirectives); // Back Arm Armor
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		}

		base.context.paintToCanvas(_this.headImg.canvas, _this.headFrames.frameList.normal[0], _this.headFrames.frameList.normal[1], 
										(_this.headFrames.frameList.normal[2]-_this.headFrames.frameList.normal[0]), 
										(_this.headFrames.frameList.normal[3]-_this.headFrames.frameList.normal[1]),
										_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
										_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.bodyDirectivesAdv:_this.bodyDirectives); // Head
		output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);

		if (options['emote'] != undefined && Emotes[_this.PlayerEntity.data['identity'].data['species'].data][options['emote']]) {
			var emote = Emotes[_this.PlayerEntity.data['identity'].data['species'].data][options['emote']];
			base.context.paintToCanvas(emote.canvas, 0, 0, _this.emoteData.frameGrid.size[0], _this.emoteData.frameGrid.size[1],
													 _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.emoteData.frameGrid.size[0], _this.emoteData.frameGrid.size[1],
													 _this.emoteDirectives);
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);			
		}

		base.context.paintToCanvas(options['hair']||_this.hairImg.canvas, _this.hairFrames.frameList.normal[0], _this.hairFrames.frameList.normal[1], 
										(_this.hairFrames.frameList.normal[2]-_this.hairFrames.frameList.normal[0]), 
										(_this.hairFrames.frameList.normal[3]-_this.hairFrames.frameList.normal[1]),
										_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
										_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.hairDirectivesAdv:_this.hairDirectives); // hair
		if (_this.hairMaskImg && showArmor) {
			base.context.globalCompositeOperation = "destination-in";
			base.context.drawImage(_this.hairMaskImg.canvas, _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data,
								   _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight);
			base.context.globalCompositeOperation = "source-over";
		}
		output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);

		base.context.paintToCanvas(_this.bodyImg.canvas, (_this.bodyIdleOffset*_this.sourceWidth), 0, _this.sourceWidth, _this.sourceHeight, 0, 0, _this.sourceWidth, _this.sourceHeight, (adv)?_this.bodyDirectivesAdv:_this.bodyDirectives); // Body
		output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);

		if (_this.doPantsArmor && showArmor) {
			base.context.paintToCanvas(_this.pantsArmorImg.canvas, (_this.pantsArmorIdleOffset*_this.pantsFrameData.frameGrid.size[0]), 0, _this.pantsFrameData.frameGrid.size[0], _this.pantsFrameData.frameGrid.size[1], 0, 0, _this.sourceWidth, _this.sourceHeight, (adv)?_this.pantsArmorDirectivesAdv:_this.pantsArmorDirectives); // Chest Armor
		output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		}

		if (_this.doChestArmor && showArmor) {
			base.context.paintToCanvas(_this.chestArmorImg.canvas, _this.chestFrameData[0], _this.chestFrameData[1], (_this.chestFrameData[2]-_this.chestFrameData[0]), (_this.chestFrameData[3]-_this.chestFrameData[1]), 0, 0, _this.sourceWidth, _this.sourceHeight, (adv)?_this.chestArmorDirectivesAdv:_this.chestArmorDirectives); // Chest Armor
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		}

		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
			base.context.paintToCanvas(_this.facialHairImg.canvas, _this.facialHairFrames.frameList.normal[0], _this.facialHairFrames.frameList.normal[1], 
											(_this.facialHairFrames.frameList.normal[2]-_this.facialHairFrames.frameList.normal[0]), 
											(_this.facialHairFrames.frameList.normal[3]-_this.facialHairFrames.frameList.normal[1]),
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.facialHairDirectivesAdv:_this.facialHairDirectives); // hair
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		}

		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
			base.context.paintToCanvas(_this.facialMaskImg.canvas, _this.facialMaskFrames.frameList.normal[0], _this.facialMaskFrames.frameList.normal[1], 
											(_this.facialMaskFrames.frameList.normal[2]-_this.facialMaskFrames.frameList.normal[0]), 
											(_this.facialMaskFrames.frameList.normal[3]-_this.facialMaskFrames.frameList.normal[1]),
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.facialMaskDirectivesAdv:_this.facialMaskDirectives); // hair
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		}

		if (_this.doHeadArmor && showArmor) {
			base.context.paintToCanvas(_this.headArmorImg.canvas, _this.headArmorFrameData.frameList.normal[0], _this.headArmorFrameData.frameList.normal[1], 
											(_this.headArmorFrameData.frameList.normal[2]-_this.headArmorFrameData.frameList.normal[0]), 
											(_this.headArmorFrameData.frameList.normal[3]-_this.headArmorFrameData.frameList.normal[1]),
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.headArmorDirectivesAdv:_this.headArmorDirectives); // Head Armor
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);		
		}

		base.context.paintToCanvas(_this.frontArmImg.canvas, (_this.frontArmIdleOffset.x*_this.sourceWidth), (_this.frontArmIdleOffset.y*_this.sourceHeight), _this.sourceWidth, _this.sourceHeight,
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.bodyDirectivesAdv:_this.bodyDirectives); // Front Arm
		output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);

		if (_this.doChestArmor && showArmor) {
			base.context.paintToCanvas(_this.frontArmArmorImg.canvas, (_this.frontArmArmorIdleOffset.x*_this.frontArmFrameData.frameGrid.size[0]), (_this.frontArmArmorIdleOffset.y*_this.frontArmFrameData.frameGrid.size[1]), _this.frontArmFrameData.frameGrid.size[0], _this.frontArmFrameData.frameGrid.size[1], 
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, (adv)?_this.chestArmorDirectivesAdv:_this.chestArmorDirectives); // Front Arm Armor
			output.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		}

		delete base;
		return output.canvas;
	}

	this.drawAvatar = function(options) {
		if (!options) { options = {}; }
		options.advanced = $('#advanced-check').is(':checked');
		var spriteMult = options['spriteMult']||1;
		var size = 23*spriteMult;		
		var character = this.drawCharacter(options);
		var output = createCanvas(size, size);
			output.context.drawImage(character, 8*spriteMult,4*spriteMult, size, size, 0, 0, size, size);

		return output.canvas;
	}

	this.beginEdit = function() {
		$('.editor_content #zcolors').html('');
		$('.editor_content #zcolors-adv').html('');
		$('.editor_content #zinfo').html('');
		$('.player_cnv').html('');
		var cname = "";
		var ihtml = "";
		var palette = new Array();

		_this.currentEmote = null;
		var base = createCanvas(_this.sourceWidth,_this.sourceHeight);
		var spriteMult = 3;

		// This is a special case for Avians who have feathers, belly and feet all lumped into one directive.
		if (_this.PlayerEntity.data['identity'].data['species'].data == "avian" && _this.bodyDirectives[0].length == 1) {
			var tempDirective = new Array(Array(Array(), Array(), Array()), Array(Array(), Array(), Array()));
			for (var x in _this.bodyDirectives[0]) {
				for (var y in _this.bodyDirectives[0][x]) {
					if (Array('#a85636','#ffca8a','#e0975c','#6f2919').indexOf(_this.bodyDirectives[0][x][y]) > -1) {
						tempDirective[0][0].push(_this.bodyDirectives[0][x][y]);
						tempDirective[1][0].push(_this.bodyDirectives[1][x][y]);
					}
					if (Array('#735e3a','#d9c189','#a38d59').indexOf(_this.bodyDirectives[0][x][y]) > -1) {
						tempDirective[0][1].push(_this.bodyDirectives[0][x][y]);
						tempDirective[1][1].push(_this.bodyDirectives[1][x][y]);
					}
					if (Array('#951500','#be1b00','#dc1f00','#f32200').indexOf(_this.bodyDirectives[0][x][y]) > -1 || parseInt(y) > 10) {
						tempDirective[0][2].push(_this.bodyDirectives[0][x][y]);
						tempDirective[1][2].push(_this.bodyDirectives[1][x][y]);
					}
				}
			}
			if (tempDirective[0][2].length < 1 || tempDirective[1][2].length < 1) {
				if (tempDirective[0][2]) {
					delete tempDirective[0][2];
				}
				if (tempDirective[1][2]) {
					delete tempDirective[1][2];
				}
			}
			if (tempDirective[0][1].length < 1 || tempDirective[1][1].length < 1) {
				if (tempDirective[0][1]) {
					delete tempDirective[0][1];
				}
				if (tempDirective[1][1]) {
					delete tempDirective[1][1];
				}
			}
			if (tempDirective[0][0].length < 1 || tempDirective[1][0].length < 1) {
				if (tempDirective[0][0]) {
					delete tempDirective[0][0];
				}
				if (tempDirective[1][0]) {
					delete tempDirective[1][0];
				}
			}
			_this.bodyDirectives = tempDirective;
		}
		/* ADVANCED MODE */
		$('.editor_content #zcolors-adv').append('<li id="bodyDirectives-adv">Body Directives<br /><div class="row"></div></li>');
		_this.bodyDirectivesAdv = new Array(Array(), Array());
		var bodyPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
			bodyPickerBase.context.drawImage(_this.backArmImg.canvas, (_this.backArmIdleOffset.x*_this.sourceWidth), (_this.backArmIdleOffset.y*_this.sourceHeight),_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			bodyPickerBase.context.drawImage(_this.headImg.canvas, _this.headFrames.frameList.normal[0], _this.headFrames.frameList.normal[1], 
							(_this.headFrames.frameList.normal[2]-_this.headFrames.frameList.normal[0]), 
							(_this.headFrames.frameList.normal[3]-_this.headFrames.frameList.normal[1]),
							_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data*spriteMult, 
							_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data*spriteMult,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);							
			bodyPickerBase.context.drawImage(_this.bodyImg.canvas, (_this.bodyIdleOffset*_this.sourceWidth), 0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			bodyPickerBase.context.drawImage(_this.frontArmImg.canvas, (_this.frontArmIdleOffset.x*_this.sourceWidth), (_this.frontArmIdleOffset.y*_this.sourceHeight),_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		var bodyUpdate = function() {
			_this.drawBackArm();
			_this.drawBody();
			_this.drawHead();
			_this.drawFrontArm();
		}
		/* END ADVANCED MODE */
		for (key in _this.bodyDirectives[0]) {
			/* ADVANCED MODE */
			_this.bodyDirectivesAdv[0][key] = new Array();
			_this.bodyDirectivesAdv[1][key] = new Array();
			for (cy in _this.bodyDirectives[0][key]) {
				_this.bodyDirectivesAdv[0][key][cy] = _this.bodyDirectives[0][key][cy];
				_this.bodyDirectivesAdv[1][key][cy] = _this.bodyDirectives[1][key][cy];

				addColor('bodyDirectives', 'bodycolor', key, cy, _this.bodyDirectivesAdv, bodyPickerBase, bodyUpdate);
			}
			/* END ADVANCED MODE */
			/* BASIC MODE */
			palette = new Array();
			if (key == 0 && _this.species.charGenTextLabels[0].indexOf('COLOR') != -1) {
				cname = _this.species.charGenTextLabels[0];
				for (z in _this.species.bodyColor) {
					palette.push(_.values(_this.species.bodyColor[z])[1]);
				}
			} else if (key == 1 && _this.species.charGenTextLabels[4].indexOf('COLOR') != -1 && _this.species['hairColorAsBodySubColor'] != true) {
				cname = _this.species.charGenTextLabels[4];
				for (z in _this.species.undyColor) {
					palette.push(_.values(_this.species.undyColor[z])[1]);
				}
			} else if (key == 2 && _this.species.charGenTextLabels[4].indexOf('COLOR') != -1 && _this.species['hairColorAsBodySubColor'] == true) {
				cname = _this.species.charGenTextLabels[4];
				for (z in _this.species.undyColor) {
					palette.push(_.values(_this.species.undyColor[z])[1]);
				}
			} else if (key == 1 && _this.PlayerEntity.data['identity'].data['species'].data == "avian") {
				cname = "TALON COLOR ";
			} else if (key == 2 && _this.PlayerEntity.data['identity'].data['species'].data == "avian") {
				cname = "BELLY COLOR ";
			} else {
				cname = "BODY COLOR "+(parseInt(key)+1);
			}
			var spColor = "";
			if (_this.bodyDirectives[1][key][1] != undefined) {
				spColor = _this.bodyDirectives[1][key][1].substring(7,9)+_this.bodyDirectives[1][key][1].substring(1,7);
			} else {
				spColor = _this.bodyDirectives[1][key][0].substring(7,9)+_this.bodyDirectives[1][key][0].substring(1,7);
			}
			$('.editor_content #zcolors').append('<li>'+cname+'<br /><input type="text" id="bodycolor_'+key+'" class="ecpicker" /></li>');
			$("#bodycolor_"+key).spectrum({
				preferredFormat: "hex8",
			    flat: true,
			    showInput: true,
    			showAlpha: true,
				showContrast: true,
			    showBrightness:true,
			    clickoutFiresChange: true,
			    move: function(color) {
			    	var hex8 = color.toHex8();
			    	var alpha = hex8.substring(0,2);
			    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
			    	$(this).val(hex8);
					var toColor = new Array();
					var xx = parseInt($(this).attr('id').replace('bodycolor_',''));
					for (i in _this.bodyDirectives[0][xx]) {
						// Get source grey
						var c = tinycolor(_this.bodyDirectives[0][xx][i]);
						var crgb = c.toRgb();
						
						var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
						var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

						var brightMul = brightness < 0 ? - brightness : brightness;
						var brightAdd = brightness < 0 ? 0 : brightness;

							contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
						var contrastAdd = - (contrast - 0.5) * 255;

						var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
							grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
							grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

						var d = tinycolor(color.toHexString());
						var hue = d.toHsv();
							hue.s = 1;
							hue.v = 1;

						var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

						toColor[i] = tinycolor(final).toHexString()+alpha;
					}
					_this.bodyDirectives[1][xx] = toColor;
					_this.drawBackArm();
					_this.drawBody();
					_this.drawHead();
					_this.drawFrontArm();
			    },
			    color: '#'+spColor,
			    showPalette: true,
			    palette: [
			        palette
			    ]
			});
			/* END BASIC MODE */
		}
		$('#bodyDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="abodybutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
		$('#abodybutton').on('click', function(){
			var x = _this.bodyDirectivesAdv[0].length-1;
			if (x < 0) { x=0; }
			if (_this.bodyDirectivesAdv[0][x] == undefined) {
				_this.bodyDirectivesAdv[0][x] = Array();
				_this.bodyDirectivesAdv[1][x] = Array();
			}
			var y = _this.bodyDirectivesAdv[0][x].length;
			_this.bodyDirectivesAdv[0][x][y] = "#000000FF";
			_this.bodyDirectivesAdv[1][x][y] = "#000000FF";
			addColor('bodyDirectives', 'bodycolor', x, y, _this.bodyDirectivesAdv, bodyPickerBase, bodyUpdate);
			$(this).parents('.col-xs-1').appendTo('#bodyDirectives-adv .row');
		});

		// This is another special case for Florans who have their hair split into Hair + Flower 
		if (_this.PlayerEntity.data['identity'].data['species'].data == "floran" && _this.hairDirectives[0].length == 1) {
			var tempDirective = new Array(Array(Array(), Array()), Array(Array(), Array()));
			for (var x in _this.hairDirectives[0]) {
				for (var y in _this.hairDirectives[0][x]) {
					if (Array('#f32200','#dc1f00','#be1b00').indexOf(_this.hairDirectives[0][x][y]) > -1) {
						tempDirective[0][0].push(_this.hairDirectives[0][x][y]);
						tempDirective[1][0].push(_this.hairDirectives[1][x][y]);
					}
					if (Array('#f7e7b2','#d9c189','#a38d59','#735e3a').indexOf(_this.hairDirectives[0][x][y]) > -1 || parseInt(y) > 6) {
						tempDirective[0][1].push(_this.hairDirectives[0][x][y]);
						tempDirective[1][1].push(_this.hairDirectives[1][x][y]);
					}
				}
			}
			if (tempDirective[0][1].length < 1 || tempDirective[1][1].length < 1) {
				if (tempDirective[0][1]) {
					delete tempDirective[0][1];
				}
				if (tempDirective[1][1]) {
					delete tempDirective[1][1];
				}
			}
			if (tempDirective[0][0].length < 1 || tempDirective[1][0].length < 1) {
				if (tempDirective[0][0]) {
					delete tempDirective[0][0];
				}
				if (tempDirective[1][0]) {
					delete tempDirective[1][0];
				}
			}
			_this.hairDirectives = tempDirective;
		}

		/* ADVANCED MODE */
		$('.editor_content #zcolors-adv').append('<li id="emoteDirectives-adv">Emote Directives<br /><div class="row"></div></li>');
		_this.emotePickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
		if (_this.currentEmote != null) {
			var emote = Emotes[_this.PlayerEntity.data['identity'].data['species'].data][_this.currentEmote];
				_this.emotePickerBase.context.drawImage(emote.canvas, 0, 0, _this.emoteData.frameGrid.size[0], _this.emoteData.frameGrid.size[1],
													 _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.emoteData.frameGrid.size[0]*spriteMult, _this.emoteData.frameGrid.size[1]*spriteMult);
		}
		var emoteUpdate = function() {
			_this.drawEmote();
		}
		/* END ADVANCED MODE */
		for (key in _this.emoteDirectives[0]) {
			/* ADVANCED MODE */
			for (cy in _this.emoteDirectives[0][key]) {
				addColor('emoteDirectives', 'emotecolor', key, cy, _this.emoteDirectives, _this.emotePickerBase, emoteUpdate);
			}
			/* END ADVANCED MODE */
		}
		$('#emoteDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="aemotebutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
		$('#aemotebutton').on('click', function(){
			var x = _this.emoteDirectives[0].length-1;
			if (x < 0) { x=0; }
			if (_this.emoteDirectives[0][x] == undefined) {
				_this.emoteDirectives[0][x] = Array();
				_this.emoteDirectives[1][x] = Array();
			}
			var y = _this.emoteDirectives[0][x].length;
			_this.emoteDirectives[0][x][y] = "#000000FF";
			_this.emoteDirectives[1][x][y] = "#000000FF";
			addColor('emoteDirectives', 'emotecolor', x, y, _this.emoteDirectives, _this.emotePickerBase, emoteUpdate);
			$(this).parents('.col-xs-1').appendTo('#emoteDirectives-adv .row');
		});

		/* ADVANCED MODE */
		$('.editor_content #zcolors-adv').append('<li id="hairDirectives-adv">Hair Directives<br /><div class="row"></div></li>');
		_this.hairDirectivesAdv = new Array(Array(), Array());
		var hairPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
			hairPickerBase.context.drawImage(_this.hairImg.canvas, _this.hairFrames.frameList.normal[0], _this.hairFrames.frameList.normal[1], 
							(_this.hairFrames.frameList.normal[2]-_this.hairFrames.frameList.normal[0]), 
							(_this.hairFrames.frameList.normal[3]-_this.hairFrames.frameList.normal[1]),
							_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data*spriteMult, 
							_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data*spriteMult,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
		var hairUpdate = function() {
			_this.drawHair();
		}
		/* END ADVANCED MODE */
		for (key in _this.hairDirectives[0]) {
			/* ADVANCED MODE */
			_this.hairDirectivesAdv[0][key] = new Array();
			_this.hairDirectivesAdv[1][key] = new Array();
			for (cy in _this.hairDirectives[0][key]) {
				_this.hairDirectivesAdv[0][key][cy] = _this.hairDirectives[0][key][cy];
				_this.hairDirectivesAdv[1][key][cy] = _this.hairDirectives[1][key][cy];

				addColor('hairDirectives', 'haircolor', key, cy, _this.hairDirectivesAdv, hairPickerBase, hairUpdate);
			}
			/* END ADVANCED MODE */
			palette = new Array();
			if (key == 0 && _this.species.charGenTextLabels[5].indexOf('COLOR') != -1) {
				cname = _this.species.charGenTextLabels[5];
				for (z in _this.species.hairColor) {
					palette.push(_.values(_this.species.hairColor[z])[1]);
				}
			} else if (key == 1 && _this.PlayerEntity.data['identity'].data['species'].data == "floran") {
				cname = _this.species.charGenTextLabels[4];
			} else {
				cname = "HAIR COLOR "+(parseInt(key)+1);
			}
			var spColor = "";
			if (_this.hairDirectives[1][key][1] != undefined) {
				spColor = _this.hairDirectives[1][key][1].substring(7,9)+_this.hairDirectives[1][key][1].substring(1,7);
			} else {
				spColor = _this.hairDirectives[1][key][0].substring(7,9)+_this.hairDirectives[1][key][0].substring(1,7);
			}
			$('.editor_content #zcolors').append('<li>'+cname+'<br /><input type="text" id="haircolor_'+key+'" class="ecpicker" /></li>');
			$("#haircolor_"+key).spectrum({
				preferredFormat: "hex8",
			    flat: true,
			    showInput: true,
			    showAlpha:true,
			    showContrast:true,
			    showBrightness:true,
			    clickoutFiresChange: true,
			    move: function(color) {
			    	var hex8 = color.toHex8();
			    	var alpha = hex8.substring(0,2);
			    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
			    	$(this).val(hex8);
					var toColor = new Array();
					var xx = parseInt($(this).attr('id').replace('haircolor_',''));
					for (i in _this.hairDirectives[0][xx]) {
						// Get source grey
						var c = tinycolor(_this.hairDirectives[0][xx][i]);
						var crgb = c.toRgb();
						
						var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
						var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

						var brightMul = brightness < 0 ? - brightness : brightness;
						var brightAdd = brightness < 0 ? 0 : brightness;

							contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
						var contrastAdd = - (contrast - 0.5) * 255;

						var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
							grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
							grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

						var d = tinycolor(color.toHexString());
						var hue = d.toHsv();
							hue.s = 1;
							hue.v = 1;

						var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

						toColor[i] = tinycolor(final).toHexString()+alpha;
					}
					_this.hairDirectives[1][xx] = toColor;
					_this.drawHair();
			    },
			    color: '#'+spColor,
			    showPalette: true,
			    palette: [
			        palette
			    ]
			});
		}
		$('#hairDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="ahairbutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
		$('#ahairbutton').on('click', function(){
			var x = _this.hairDirectivesAdv[0].length-1;
			if (x < 0) { x=0; }
			if (_this.hairDirectivesAdv[0][x] == undefined) {
				_this.hairDirectivesAdv[0][x] = Array();
				_this.hairDirectivesAdv[1][x] = Array();
			}
			var y = _this.hairDirectivesAdv[0][x].length;
			_this.hairDirectivesAdv[0][x][y] = "#000000FF";
			_this.hairDirectivesAdv[1][x][y] = "#000000FF";
			addColor('hairDirectives', 'haircolor', x, y, _this.hairDirectivesAdv, hairPickerBase, hairUpdate);
			$(this).parents('.col-xs-1').appendTo('#hairDirectives-adv .row');
		});

		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
			/* ADVANCED MODE */
			$('.editor_content #zcolors-adv').append('<li id="facialHairDirectives-adv">Facial Hair Directives<br /><div class="row"></div></li>');
			_this.facialHairDirectivesAdv = new Array(Array(), Array());
			var facialHairPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
				facialHairPickerBase.context.drawImage(_this.facialHairImg.canvas, _this.facialHairFrames.frameList.normal[0], _this.facialHairFrames.frameList.normal[1], 
								(_this.facialHairFrames.frameList.normal[2]-_this.facialHairFrames.frameList.normal[0]), 
								(_this.facialHairFrames.frameList.normal[3]-_this.facialHairFrames.frameList.normal[1]),
								_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data*spriteMult, 
								_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data*spriteMult,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			var facialHairUpdate = function() {
				_this.drawFacialHair();
			}
			/* END ADVANCED MODE */
			cname = "FACIAL HAIR COLOR";
			for (key in _this.facialHairDirectives[0]) {
				/* ADVANCED MODE */
				_this.facialHairDirectivesAdv[0][key] = new Array();
				_this.facialHairDirectivesAdv[1][key] = new Array();
				for (cy in _this.facialHairDirectives[0][key]) {
					_this.facialHairDirectivesAdv[0][key][cy] = _this.facialHairDirectives[0][key][cy];
					_this.facialHairDirectivesAdv[1][key][cy] = _this.facialHairDirectives[1][key][cy];

					addColor('facialHairDirectives', 'facialhaircolor', key, cy, _this.facialHairDirectivesAdv, facialHairPickerBase, facialHairUpdate);
				}
				/* END ADVANCED MODE */
				palette = new Array();
				var spColor = "";
				if (_this.facialHairDirectives[1][key][1] != undefined) {
					spColor = _this.facialHairDirectives[1][key][1].substring(7,9)+_this.facialHairDirectives[1][key][1].substring(1,7);
				} else {
					spColor = _this.facialHairDirectives[1][key][0].substring(7,9)+_this.facialHairDirectives[1][key][0].substring(1,7);
				}
				$('.editor_content #zcolors').append('<li>'+cname+'<br /><input type="text" id="facialhaircolor_'+key+'" class="ecpicker" /></li>');
				$("#facialhaircolor_"+key).spectrum({
					preferredFormat: "hex8",
				    flat: true,
				    showInput: true,
				    showAlpha: true,
					showContrast: true,
					showBrightness: true,
				    clickoutFiresChange: true,
				    move: function(color) {
				    	var hex8 = color.toHex8();
				    	var alpha = hex8.substring(0,2);
				    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
				    	$(this).val(hex8);
						var toColor = new Array();
						var xx = parseInt($(this).attr('id').replace('facialhaircolor_',''));
						for (i in _this.facialHairDirectives[0][xx]) {
							// Get source grey
							var c = tinycolor(_this.facialHairDirectives[0][xx][i]);
							var crgb = c.toRgb();
						
							var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
							var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

							var brightMul = brightness < 0 ? - brightness : brightness;
							var brightAdd = brightness < 0 ? 0 : brightness;

								contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
							var contrastAdd = - (contrast - 0.5) * 255;

							var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
								grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
								grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

							var d = tinycolor(color.toHexString());
							var hue = d.toHsv();
								hue.s = 1;
								hue.v = 1;

							var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

							toColor[i] = tinycolor(final).toHexString()+alpha;
						}
						_this.facialHairDirectives[1][xx] = toColor;
						_this.drawFacialHair();
				    },
				    color: '#'+spColor,
				    showPalette: true,
				    palette: [
				        palette
				    ]
				});
			}
			$('#facialHairDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="afacialhairbutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
			$('#afacialhairbutton').on('click', function(){
				var x = _this.facialHairDirectivesAdv[0].length-1;
				if (x < 0) { x=0; }
				if (_this.facialHairDirectivesAdv[0][x] == undefined) {
					_this.facialHairDirectivesAdv[0][x] = Array();
					_this.facialHairDirectivesAdv[1][x] = Array();
				}
				var y = _this.facialHairDirectivesAdv[0][x].length;
				_this.facialHairDirectivesAdv[0][x][y] = "#000000FF";
				_this.facialHairDirectivesAdv[1][x][y] = "#000000FF";
				addColor('facialHairDirectives', 'facialhaircolor', x, y, _this.facialHairDirectivesAdv, facialHairPickerBase, facialHairUpdate);
				$(this).parents('.col-xs-1').appendTo('#facialHairDirectives-adv .row');
			});
		}

		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
			/* ADVANCED MODE */
			$('.editor_content #zcolors-adv').append('<li id="facialMaskDirectives-adv">Facial Mask Directives<br /><div class="row"></div></li>');
			_this.facialMaskDirectivesAdv = new Array(Array(), Array());
			var facialMaskPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
				facialMaskPickerBase.context.drawImage(_this.facialMaskImg.canvas, _this.facialMaskFrames.frameList.normal[0], _this.facialMaskFrames.frameList.normal[1], 
								(_this.facialMaskFrames.frameList.normal[2]-_this.facialMaskFrames.frameList.normal[0]), 
								(_this.facialMaskFrames.frameList.normal[3]-_this.facialMaskFrames.frameList.normal[1]),
								_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data*spriteMult, 
								_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data*spriteMult,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			var facialMaskUpdate = function() {
				_this.drawFacialMask();
			}
			/* END ADVANCED MODE */
			cname = "FACE MASK COLOR";
			for (key in _this.facialMaskDirectives[0]) {
				/* ADVANCED MODE */
				_this.facialMaskDirectivesAdv[0][key] = new Array();
				_this.facialMaskDirectivesAdv[1][key] = new Array();
				for (cy in _this.facialMaskDirectives[0][key]) {
					_this.facialMaskDirectivesAdv[0][key][cy] = _this.facialMaskDirectives[0][key][cy];
					_this.facialMaskDirectivesAdv[1][key][cy] = _this.facialMaskDirectives[1][key][cy];

					addColor('facialMaskDirectives', 'facialmaskcolor', key, cy, _this.facialMaskDirectivesAdv, facialMaskPickerBase, facialMaskUpdate);
				}
				/* END ADVANCED MODE */
				palette = new Array();
				var spColor = "";
				if (_this.facialMaskDirectives[1][key][1] != undefined) {
					spColor = _this.facialMaskDirectives[1][key][1].substring(7,9)+_this.facialMaskDirectives[1][key][1].substring(1,7);
				} else {
					spColor = _this.facialMaskDirectives[1][key][0].substring(7,9)+_this.facialMaskDirectives[1][key][0].substring(1,7);
				}
				$('.editor_content #zcolors').append('<li>'+cname+'<br /><input type="text" id="facialmaskcolor_'+key+'" class="ecpicker" /></li>');
				$("#facialmaskcolor_"+key).spectrum({
					preferredFormat: "hex8",
				    flat: true,
				    showInput: true,
				    showAlpha: true,
					showContrast: true,
					showBrightness: true,
				    clickoutFiresChange: true,
				    move: function(color) {
				    	var hex8 = color.toHex8();
				    	var alpha = hex8.substring(0,2);
				    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
				    	$(this).val(hex8);
						var toColor = new Array();
						var xx = parseInt($(this).attr('id').replace('facialmaskcolor_',''));
						for (i in _this.facialMaskDirectives[0][xx]) {
							// Get source grey
							var c = tinycolor(_this.facialMaskDirectives[0][xx][i]);
							var crgb = c.toRgb();
						
							var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
							var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

							var brightMul = brightness < 0 ? - brightness : brightness;
							var brightAdd = brightness < 0 ? 0 : brightness;

								contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
							var contrastAdd = - (contrast - 0.5) * 255;

							var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
								grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
								grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

							var d = tinycolor(color.toHexString());
							var hue = d.toHsv();
								hue.s = 1;
								hue.v = 1;

							var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

							toColor[i] = tinycolor(final).toHexString()+alpha;
						}
						_this.facialMaskDirectives[1][xx] = toColor;
						_this.drawFacialMask();
				    },
				    color: '#'+spColor,
				    showPalette: true,
				    palette: [
				        palette
				    ]
				});
			}
			$('#facialMaskDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="afacialmaskbutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
			$('#afacialmaskbutton').on('click', function(){
				var x = _this.facialMaskDirectivesAdv[0].length-1;
				if (x < 0) { x=0; }
				if (_this.facialMaskDirectivesAdv[0][x] == undefined) {
					_this.facialMaskDirectivesAdv[0][x] = Array();
					_this.facialMaskDirectivesAdv[1][x] = Array();
				}
				var y = _this.facialMaskDirectivesAdv[0][x].length;
				_this.facialMaskDirectivesAdv[0][x][y] = "#000000FF";
				_this.facialMaskDirectivesAdv[1][x][y] = "#000000FF";
				addColor('facialMaskDirectives', 'facialmaskcolor', x, y, _this.facialMaskDirectivesAdv, facialMaskPickerBase, facialMaskUpdate);
				$(this).parents('.col-xs-1').appendTo('#facialMaskDirectives-adv .row');
			});
		}

		if (_this.doChestArmor) {
			_this.chestIconCanvas = createCanvas(16,16);
			_this.chestIconCanvasAdv = createCanvas(16,16);
			if (_this.chestIconFrames[1]) {
				_this.chestIconBounds = _this.armorIconFrames.frameList[_this.chestIconFrames[1]];
			}
			if (!_this.chestIconBounds || _this.chestIconBounds==undefined) {
				_this.chestIconBounds = [0,0,16,16];
			}
			/* ADVANCED MODE */
			$('.editor_content #zcolors-adv').append('<li id="chestArmorDirectives-adv">'+_this.chestItemData.shortdescription+' Directives<br /><div class="row"></div></li>');
			_this.chestArmorDirectivesAdv = new Array(Array(), Array());
			_this.drawChestIcon = function() {
				var palette = _this.chestArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.chestArmorDirectivesAdv; }
				_this.chestIconCanvas.context.paintToCanvas(_this.chestIconImg.canvas, _this.chestIconBounds[0], _this.chestIconBounds[1], (_this.chestIconBounds[2]-_this.chestIconBounds[0]), (_this.chestIconBounds[3]-_this.chestIconBounds[1]), 0, 0, 16, 16, palette);
				_this.chestIconCanvasAdv.context.paintToCanvas(_this.chestIconImg.canvas, _this.chestIconBounds[0], _this.chestIconBounds[1], (_this.chestIconBounds[2]-_this.chestIconBounds[0]), (_this.chestIconBounds[3]-_this.chestIconBounds[1]), 0, 0, 16, 16, palette);
			}
			var chestArmorPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
				chestArmorPickerBase.context.drawImage(_this.backArmArmorImg.canvas, (_this.backArmArmorIdleOffset.x*_this.backArmFrameData.frameGrid.size[0]), (_this.backArmArmorIdleOffset.y*_this.frontArmFrameData.frameGrid.size[1]), _this.backArmFrameData.frameGrid.size[0], _this.backArmFrameData.frameGrid.size[1], 0, 0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				chestArmorPickerBase.context.drawImage(_this.chestArmorImg.canvas, _this.chestFrameData[0], _this.chestFrameData[1], (_this.chestFrameData[2]-_this.chestFrameData[0]), (_this.chestFrameData[3]-_this.chestFrameData[1]), 0, 0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				chestArmorPickerBase.context.drawImage(_this.frontArmArmorImg.canvas, (_this.frontArmArmorIdleOffset.x*_this.frontArmFrameData.frameGrid.size[0]), (_this.frontArmArmorIdleOffset.y*_this.frontArmFrameData.frameGrid.size[1]), _this.frontArmFrameData.frameGrid.size[0], _this.frontArmFrameData.frameGrid.size[1], 0, 0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			var chestArmorUpdate = function() {
				_this.drawBackArmArmor();
				_this.drawChestArmor();
				_this.drawFrontArmArmor();
				_this.drawChestIcon();
			}
			/* END ADVANCED MODE */
			cname = _this.chestItemData.shortdescription.toUpperCase() + " COLOR";
			for (key in _this.chestArmorDirectives[0]) {
				/* ADVANCED MODE */
				_this.chestArmorDirectivesAdv[0][key] = new Array();
				_this.chestArmorDirectivesAdv[1][key] = new Array();
				for (cy in _this.chestArmorDirectives[0][key]) {
					_this.chestArmorDirectivesAdv[0][key][cy] = _this.chestArmorDirectives[0][key][cy];
					_this.chestArmorDirectivesAdv[1][key][cy] = _this.chestArmorDirectives[1][key][cy];

					addColor('chestArmorDirectives', 'chestarmorcolor', key, cy, _this.chestArmorDirectivesAdv, chestArmorPickerBase, chestArmorUpdate);
				}
				/* END ADVANCED MODE */
				palette = new Array();
				for (z in _this.chestItemData.colorOptions) {
					palette.push(_.values(_this.chestItemData.colorOptions[z])[1]);
				}
				var spColor = "";
				if (_this.chestArmorDirectives[1][key][1] != undefined) {
					spColor = _this.chestArmorDirectives[1][key][1].substring(7,9)+_this.chestArmorDirectives[1][key][1].substring(1,7);
				} else {
					spColor = _this.chestArmorDirectives[1][key][0].substring(7,9)+_this.chestArmorDirectives[1][key][0].substring(1,7);
				}
				$('.editor_content #zcolors').append('<li id="chestarmorli">'+cname+'<br /><input type="text" id="chestarmorcolor_'+key+'" class="ecpicker" /></li>');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.chestIconCanvas.canvas).addClass('chestIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.chestItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#chestarmorli');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.chestIconCanvasAdv.canvas).addClass('chestIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.chestItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#chestArmorDirectives-adv');
				$("#chestarmorcolor_"+key).spectrum({
					preferredFormat: "hex8",
				    flat: true,
				    showInput: true,
				    showAlpha: true,
					showContrast: true,
					showBrightness: true,
				    clickoutFiresChange: true,
				    move: function(color) {
				    	var hex8 = color.toHex8();
				    	var alpha = hex8.substring(0,2);
				    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
				    	$(this).val(hex8);
						var toColor = new Array();
						var xx = parseInt($(this).attr('id').replace('chestarmorcolor_',''));
						for (i in _this.chestArmorDirectives[0][xx]) {
							// Get source grey
							var c = tinycolor(_this.chestArmorDirectives[0][xx][i]);
							var crgb = c.toRgb();
						
							var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
							var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

							var brightMul = brightness < 0 ? - brightness : brightness;
							var brightAdd = brightness < 0 ? 0 : brightness;

								contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
							var contrastAdd = - (contrast - 0.5) * 255;

							var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
								grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
								grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

							var d = tinycolor(color.toHexString());
							var hue = d.toHsv();
								hue.s = 1;
								hue.v = 1;

							var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

							toColor[i] = tinycolor(final).toHexString()+alpha;
						}
						_this.chestArmorDirectives[1][xx] = toColor;
						_this.drawBackArmArmor();
						_this.drawChestArmor();
						_this.drawFrontArmArmor();
						_this.drawChestIcon();
				    },
				    color: '#'+spColor,
				    showPalette: true,
				    palette: [
				        palette
				    ]
				});
			}
			$('#chestArmorDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="achestarmorbutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
			$('#achestarmorbutton').on('click', function(){
				var x = _this.chestArmorDirectivesAdv[0].length-1;
				if (x < 0) { x=0; }
				if (_this.chestArmorDirectivesAdv[0][x] == undefined) {
					_this.chestArmorDirectivesAdv[0][x] = Array();
					_this.chestArmorDirectivesAdv[1][x] = Array();
				}
				var y = _this.chestArmorDirectivesAdv[0][x].length;
				_this.chestArmorDirectivesAdv[0][x][y] = "#000000FF";
				_this.chestArmorDirectivesAdv[1][x][y] = "#000000FF";
				addColor('chestArmorDirectives', 'chestarmorcolor', x, y, _this.chestArmorDirectivesAdv, chestArmorPickerBase, chestArmorUpdate);
				$(this).parents('.col-xs-1').appendTo('#chestArmorDirectives-adv .row');
			});
			_this.drawChestIcon();
		}

		if (_this.doPantsArmor) {
			_this.pantsIconCanvas = createCanvas(16,16);
			_this.pantsIconCanvasAdv = createCanvas(16,16);
			if (_this.pantsIconFrames[1]) {
				_this.pantsIconBounds = _this.armorIconFrames.frameList[_this.pantsIconFrames[1]];
			}
			if (!_this.pantsIconBounds || _this.pantsIconBounds==undefined) {
				_this.pantsIconBounds = [0,0,16,16];
			}
			/* ADVANCED MODE */
			$('.editor_content #zcolors-adv').append('<li id="pantsArmorDirectives-adv">'+_this.pantsItemData.shortdescription+' Directives<br /><div class="row"></div></li>');
			_this.pantsArmorDirectivesAdv = new Array(Array(), Array());
			_this.drawPantsIcon = function() {
				var palette = _this.pantsArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.pantsArmorDirectivesAdv; }
				_this.pantsIconCanvas.context.paintToCanvas(_this.pantsIconImg.canvas, _this.pantsIconBounds[0], _this.pantsIconBounds[1], (_this.pantsIconBounds[2]-_this.pantsIconBounds[0]), (_this.pantsIconBounds[3]-_this.pantsIconBounds[1]), 0, 0, 16, 16, palette);
				_this.pantsIconCanvasAdv.context.paintToCanvas(_this.pantsIconImg.canvas, _this.pantsIconBounds[0], _this.pantsIconBounds[1], (_this.pantsIconBounds[2]-_this.pantsIconBounds[0]), (_this.pantsIconBounds[3]-_this.pantsIconBounds[1]), 0, 0, 16, 16, palette);
			}
			var pantsArmorPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
				pantsArmorPickerBase.context.drawImage(_this.pantsArmorImg.canvas, (_this.pantsArmorIdleOffset*_this.pantsFrameData.frameGrid.size[0]), 0, _this.pantsFrameData.frameGrid.size[0], _this.pantsFrameData.frameGrid.size[1], 0, 0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			var pantsArmorUpdate = function() {
				_this.drawPantsArmor();
				_this.drawPantsIcon();
			}
			/* END ADVANCED MODE */
			cname = _this.pantsItemData.shortdescription.toUpperCase() + " COLOR";
			for (key in _this.pantsArmorDirectives[0]) {
				/* ADVANCED MODE */
				_this.pantsArmorDirectivesAdv[0][key] = new Array();
				_this.pantsArmorDirectivesAdv[1][key] = new Array();
				for (cy in _this.pantsArmorDirectives[0][key]) {
					_this.pantsArmorDirectivesAdv[0][key][cy] = _this.pantsArmorDirectives[0][key][cy];
					_this.pantsArmorDirectivesAdv[1][key][cy] = _this.pantsArmorDirectives[1][key][cy];

					addColor('pantsArmorDirectives', 'pantsarmorcolor', key, cy, _this.pantsArmorDirectivesAdv, pantsArmorPickerBase, pantsArmorUpdate);
				}
				/* END ADVANCED MODE */
				palette = new Array();
				for (z in _this.pantsItemData.colorOptions) {
					palette.push(_.values(_this.pantsItemData.colorOptions[z])[1]);
				}
				var spColor = "";
				if (_this.pantsArmorDirectives[1][key][1] != undefined) {
					spColor = _this.pantsArmorDirectives[1][key][1].substring(7,9)+_this.pantsArmorDirectives[1][key][1].substring(1,7);
				} else {
					spColor = _this.pantsArmorDirectives[1][key][0].substring(7,9)+_this.pantsArmorDirectives[1][key][0].substring(1,7);
				}
				$('.editor_content #zcolors').append('<li id="pantsarmorli">'+cname+'<br /><input type="text" id="pantsarmorcolor_'+key+'" class="ecpicker" /></li>');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.pantsIconCanvas.canvas).addClass('pantsIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.pantsItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#pantsarmorli');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.pantsIconCanvasAdv.canvas).addClass('pantsIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.pantsItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#pantsArmorDirectives-adv');
				$("#pantsarmorcolor_"+key).spectrum({
					preferredFormat: "hex8",
				    flat: true,
				    showInput: true,
				    showAlpha: true,
					showContrast: true,
					showBrightness: true,
				    clickoutFiresChange: true,
				    move: function(color) {
				    	var hex8 = color.toHex8();
				    	var alpha = hex8.substring(0,2);
				    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
				    	$(this).val(hex8);
						var toColor = new Array();
						var xx = parseInt($(this).attr('id').replace('pantsarmorcolor_',''));
						for (i in _this.pantsArmorDirectives[0][xx]) {
							// Get source grey
							var c = tinycolor(_this.pantsArmorDirectives[0][xx][i]);
							var crgb = c.toRgb();
						
							var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
							var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

							var brightMul = brightness < 0 ? - brightness : brightness;
							var brightAdd = brightness < 0 ? 0 : brightness;

								contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
							var contrastAdd = - (contrast - 0.5) * 255;

							var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
								grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
								grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

							var d = tinycolor(color.toHexString());
							var hue = d.toHsv();
								hue.s = 1;
								hue.v = 1;

							var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

							toColor[i] = tinycolor(final).toHexString()+alpha;
						}
						_this.pantsArmorDirectives[1][xx] = toColor;
						_this.drawPantsArmor();
						_this.drawPantsIcon();
				    },
				    color: '#'+spColor,
				    showPalette: true,
				    palette: [
				        palette
				    ]
				});
			}
			$('#pantsArmorDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="apantsarmorbutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
			$('#apantsarmorbutton').on('click', function(){
				var x = _this.pantsArmorDirectivesAdv[0].length-1;
				if (x < 0) { x=0; }
				if (_this.pantsArmorDirectivesAdv[0][x] == undefined) {
					_this.pantsArmorDirectivesAdv[0][x] = Array();
					_this.pantsArmorDirectivesAdv[1][x] = Array();
				}
				var y = _this.pantsArmorDirectivesAdv[0][x].length;
				_this.pantsArmorDirectivesAdv[0][x][y] = "#000000FF";
				_this.pantsArmorDirectivesAdv[1][x][y] = "#000000FF";
				addColor('pantsArmorDirectives', 'pantsarmorcolor', x, y, _this.pantsArmorDirectivesAdv, pantsArmorPickerBase, pantsArmorUpdate);
				$(this).parents('.col-xs-1').appendTo('#pantsArmorDirectives-adv .row');
			});
			_this.drawPantsIcon();
		}

		if (_this.doBackArmor) {
			_this.backIconCanvas = createCanvas(16,16);
			_this.backIconCanvasAdv = createCanvas(16,16);
			if (_this.backIconFrames[1]) {
				_this.backIconBounds = _this.armorIconFrames.frameList[_this.backIconFrames[1]];
			}
			if (!_this.backIconBounds || _this.backIconBounds==undefined) {
				_this.backIconBounds = [0,0,16,16];
			}
			/* ADVANCED MODE */
			$('.editor_content #zcolors-adv').append('<li id="backArmorDirectives-adv">'+_this.backItemData.shortdescription+' Directives<br /><div class="row"></div></li>');
			_this.backArmorDirectivesAdv = new Array(Array(), Array());
			_this.drawBackIcon = function() {
				var palette = _this.backArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.backArmorDirectivesAdv; }
				_this.backIconCanvas.context.paintToCanvas(_this.backIconImg.canvas, _this.backIconBounds[0], _this.backIconBounds[1], (_this.backIconBounds[2]-_this.backIconBounds[0]), (_this.backIconBounds[3]-_this.backIconBounds[1]), 0, 0, 16, 16, palette);
				_this.backIconCanvasAdv.context.paintToCanvas(_this.backIconImg.canvas, _this.backIconBounds[0], _this.backIconBounds[1], (_this.backIconBounds[2]-_this.backIconBounds[0]), (_this.backIconBounds[3]-_this.backIconBounds[1]), 0, 0, 16, 16, palette);
			}
			var backArmorPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
				backArmorPickerBase.context.drawImage(_this.backArmorImg.canvas, (_this.backArmorIdleOffset*_this.backFrameData.frameGrid.size[0]), 0, _this.backFrameData.frameGrid.size[0], _this.backFrameData.frameGrid.size[1], 0, 0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			var backArmorUpdate = function() {
				_this.drawBackArmor();
				_this.drawBackIcon();
			}
			/* END ADVANCED MODE */
			cname = _this.backItemData.shortdescription.toUpperCase() + " COLOR";
			for (key in _this.backArmorDirectives[0]) {
				/* ADVANCED MODE */
				_this.backArmorDirectivesAdv[0][key] = new Array();
				_this.backArmorDirectivesAdv[1][key] = new Array();
				for (cy in _this.backArmorDirectives[0][key]) {
					_this.backArmorDirectivesAdv[0][key][cy] = _this.backArmorDirectives[0][key][cy];
					_this.backArmorDirectivesAdv[1][key][cy] = _this.backArmorDirectives[1][key][cy];

					addColor('backArmorDirectives', 'backarmorcolor', key, cy, _this.backArmorDirectivesAdv, backArmorPickerBase, backArmorUpdate);
				}
				/* END ADVANCED MODE */
				palette = new Array();
				for (z in _this.backItemData.colorOptions) {
					palette.push(_.values(_this.backItemData.colorOptions[z])[1]);
				}
				var spColor = "";
				if (_this.backArmorDirectives[1][key][1] != undefined) {
					spColor = _this.backArmorDirectives[1][key][1].substring(7,9)+_this.backArmorDirectives[1][key][1].substring(1,7);
				} else {
					spColor = _this.backArmorDirectives[1][key][0].substring(7,9)+_this.backArmorDirectives[1][key][0].substring(1,7);
				}
				$('.editor_content #zcolors').append('<li id="backarmorli">'+cname+'<br /><input type="text" id="backarmorcolor_'+key+'" class="ecpicker" /></li>');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.backIconCanvas.canvas).addClass('backIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.backItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#backarmorli');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.backIconCanvasAdv.canvas).addClass('backIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.backItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#backArmorDirectives-adv');
				$("#backarmorcolor_"+key).spectrum({
					preferredFormat: "hex8",
				    flat: true,
				    showInput: true,
				    showAlpha: true,
					showContrast: true,
					showBrightness: true,
				    clickoutFiresChange: true,
				    move: function(color) {
				    	var hex8 = color.toHex8();
				    	var alpha = hex8.substring(0,2);
				    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
				    	$(this).val(hex8);
						var toColor = new Array();
						var xx = parseInt($(this).attr('id').replace('backarmorcolor_',''));
						for (i in _this.backArmorDirectives[0][xx]) {
							// Get source grey
							var c = tinycolor(_this.backArmorDirectives[0][xx][i]);
							var crgb = c.toRgb();
						
							var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
							var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

							var brightMul = brightness < 0 ? - brightness : brightness;
							var brightAdd = brightness < 0 ? 0 : brightness;

								contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
							var contrastAdd = - (contrast - 0.5) * 255;

							var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
								grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
								grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

							var d = tinycolor(color.toHexString());
							var hue = d.toHsv();
								hue.s = 1;
								hue.v = 1;

							var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

							toColor[i] = tinycolor(final).toHexString()+alpha;
						}
						_this.backArmorDirectives[1][xx] = toColor;
						_this.drawBackArmor();
						_this.drawBackIcon();
				    },
				    color: '#'+spColor,
				    showPalette: true,
				    palette: [
				        palette
				    ]
				});
			}
			$('#backArmorDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="abackarmorbutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
			$('#abackarmorbutton').on('click', function(){
				var x = _this.backArmorDirectivesAdv[0].length-1;
				if (x < 0) { x=0; }
				if (_this.backArmorDirectivesAdv[0][x] == undefined) {
					_this.backArmorDirectivesAdv[0][x] = Array();
					_this.backArmorDirectivesAdv[1][x] = Array();
				}
				var y = _this.backArmorDirectivesAdv[0][x].length;
				_this.backArmorDirectivesAdv[0][x][y] = "#000000FF";
				_this.backArmorDirectivesAdv[1][x][y] = "#000000FF";
				addColor('backArmorDirectives', 'backarmorcolor', x, y, _this.backArmorDirectivesAdv, backArmorPickerBase, backArmorUpdate);
				$(this).parents('.col-xs-1').appendTo('#backArmorDirectives-adv .row');
			});
			_this.drawBackIcon();
		}
		if (_this.doHeadArmor) {
			_this.headIconCanvas = createCanvas(16,16);
			_this.headIconCanvasAdv = createCanvas(16,16);
			if (_this.headIconFrames[1]) {
				_this.headIconBounds = _this.armorIconFrames.frameList[_this.headIconFrames[1]];
			}
			if (!_this.headIconBounds || _this.headIconBounds==undefined) {
				_this.headIconBounds = [0,0,16,16];
			}
			/* ADVANCED MODE */
			$('.editor_content #zcolors-adv').append('<li id="headArmorDirectives-adv">'+_this.headItemData.shortdescription+' Directives<br /><div class="row"></div></li>');
			_this.headArmorDirectivesAdv = new Array(Array(), Array());		
			_this.drawHeadIcon = function() {
				var palette = _this.headArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.headArmorDirectivesAdv; }
				_this.headIconCanvas.context.paintToCanvas(_this.headIconImg.canvas, _this.headIconBounds[0], _this.headIconBounds[1], (_this.headIconBounds[2]-_this.headIconBounds[0]), (_this.headIconBounds[3]-_this.headIconBounds[1]), 0, 0, 16, 16, palette);
				_this.headIconCanvasAdv.context.paintToCanvas(_this.headIconImg.canvas, _this.headIconBounds[0], _this.headIconBounds[1], (_this.headIconBounds[2]-_this.headIconBounds[0]), (_this.headIconBounds[3]-_this.headIconBounds[1]), 0, 0, 16, 16, palette);
			}
			var headArmorPickerBase = createCanvas(_this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
				headArmorPickerBase.context.drawImage(_this.headArmorImg.canvas, _this.headArmorFrameData.frameList.normal[0], _this.headArmorFrameData.frameList.normal[1], 
								(_this.headArmorFrameData.frameList.normal[2]-_this.headArmorFrameData.frameList.normal[0]), 
								(_this.headArmorFrameData.frameList.normal[3]-_this.headArmorFrameData.frameList.normal[1]),
								_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data*spriteMult, 
								_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data*spriteMult,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);	
			var headArmorUpdate = function() {
				_this.drawHeadArmor();
				_this.drawHeadIcon();
			}
			/* END ADVANCED MODE */
			cname = _this.headItemData.shortdescription.toUpperCase() + " COLOR";
			for (key in _this.headArmorDirectives[0]) {
				/* ADVANCED MODE */
				_this.headArmorDirectivesAdv[0][key] = new Array();
				_this.headArmorDirectivesAdv[1][key] = new Array();
				for (cy in _this.headArmorDirectives[0][key]) {
					_this.headArmorDirectivesAdv[0][key][cy] = _this.headArmorDirectives[0][key][cy];
					_this.headArmorDirectivesAdv[1][key][cy] = _this.headArmorDirectives[1][key][cy];

					addColor('headArmorDirectives', 'headarmorcolor', key, cy, _this.headArmorDirectivesAdv, headArmorPickerBase, headArmorUpdate);
				}
				/* END ADVANCED MODE */
				palette = new Array();
				for (z in _this.headItemData.colorOptions) {
					palette.push(_.values(_this.headItemData.colorOptions[z])[1]);
				}
				var spColor = "";
				if (_this.headArmorDirectives[1][key][1] != undefined) {
					spColor = _this.headArmorDirectives[1][key][1].substring(7,9)+_this.headArmorDirectives[1][key][1].substring(1,7);
				} else {
					spColor = _this.headArmorDirectives[1][key][0].substring(7,9)+_this.headArmorDirectives[1][key][0].substring(1,7);
				}
				$('.editor_content #zcolors').append('<li id="headarmorli">'+cname+'<br /><input type="text" id="headarmorcolor_'+key+'" class="ecpicker" /></li>');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.headIconCanvas.canvas).addClass('headIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.headItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#headarmorli');
				ihtml = $('<div class="item_icon"></div>');
				$(_this.headIconCanvasAdv.canvas).addClass('headIconCanvas').prependTo(ihtml);
				$('<img src="'+RarityList[_this.headItemData.rarity.toLowerCase()].src+'" />').prependTo(ihtml);
				ihtml.prependTo('#headArmorDirectives-adv');
				$("#headarmorcolor_"+key).spectrum({
					preferredFormat: "hex8",
				    flat: true,
				    showInput: true,
				    showAlpha: true,
					showContrast: true,
					showBrightness: true,
				    clickoutFiresChange: true,
				    move: function(color) {
				    	var hex8 = color.toHex8();
				    	var alpha = hex8.substring(0,2);
				    		hex8 = "#"+hex8.substring(2,8)+hex8.substring(0,2);
				    	$(this).val(hex8);
						var toColor = new Array();
						var xx = parseInt($(this).attr('id').replace('headarmorcolor_',''));
						for (i in _this.headArmorDirectives[0][xx]) {
							// Get source grey
							var c = tinycolor(_this.headArmorDirectives[0][xx][i]);
							var crgb = c.toRgb();
						
							var contrast = ((($(this).spectrum('contrast')*2)-1).clamp(-1,1))/2;
							var brightness = 1+((($(this).spectrum('brightness')*2)-1).clamp(-1,1));

							var brightMul = brightness < 0 ? - brightness : brightness;
							var brightAdd = brightness < 0 ? 0 : brightness;

								contrast = 0.5 * Math.tan((contrast + 1) * Math.PI/4);
							var contrastAdd = - (contrast - 0.5) * 255;

							var grey = Math.floor(crgb.r * 0.2126 + crgb.g * 0.7152 + crgb.b * 0.0722);
								grey = (grey + grey * brightMul + brightAdd) * contrast + contrastAdd;
								grey = tinycolor("rgb "+grey+" "+grey+" "+grey);

							var d = tinycolor(color.toHexString());
							var hue = d.toHsv();
								hue.s = 1;
								hue.v = 1;

							var final = blendColor(tinycolor(hue).toRgb(), d.toHsl().s, (d.toHsl().l*2)-1, grey.toHsv().v);

							toColor[i] = tinycolor(final).toHexString()+alpha;
						}
						_this.headArmorDirectives[1][xx] = toColor;
						_this.drawHeadArmor();
						_this.drawHeadIcon();
				    },
				    color: '#'+spColor,
				    showPalette: true,
				    palette: [
				        palette
				    ]
				});
			}
			$('#headArmorDirectives-adv .row').append('<div class="col-xs-1"><div class="color-adv"><button id="aheadarmorbutton" class="btn btn-info" style="width: 116px;padding: 5px 5px 4px 5px;">Add New</button></div></div>');
			$('#aheadarmorbutton').on('click', function(){
				var x = _this.headArmorDirectivesAdv[0].length-1;
				if (x < 0) { x=0; }
				if (_this.headArmorDirectivesAdv[0][x] == undefined) {
					_this.headArmorDirectivesAdv[0][x] = Array();
					_this.headArmorDirectivesAdv[1][x] = Array();
				}
				var y = _this.headArmorDirectivesAdv[0][x].length;
				_this.headArmorDirectivesAdv[0][x][y] = "#000000FF";
				_this.headArmorDirectivesAdv[1][x][y] = "#000000FF";
				addColor('headArmorDirectives', 'headarmorcolor', x, y, _this.headArmorDirectivesAdv, headArmorPickerBase, headArmorUpdate);
				$(this).parents('.col-xs-1').appendTo('#headArmorDirectives-adv .row');
			});
			_this.drawHeadIcon();	
		}

		var backArmCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
		_this.drawBackArm = function() {
			var palette = _this.bodyDirectives;
			if ($('#advanced-check').is(':checked')) { palette = _this.bodyDirectivesAdv; }
			base.context.paintToCanvas(_this.backArmImg.canvas, (_this.backArmIdleOffset.x*_this.sourceWidth), (_this.backArmIdleOffset.y*_this.sourceHeight), _this.sourceWidth, _this.sourceHeight,
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Back Arm
			if ($('#backArmCanvas').length > 0) {
				document.getElementById("backArmCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
				document.getElementById("backArmCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			} else {
				$(backArmCanvas.canvas).attr('id', 'backArmCanvas').appendTo('.player_cnv');
				backArmCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			}
			// Gotta draw the player avatar
			$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
		}
		_this.drawBackArm();

		if (_this.doChestArmor) {
			var backArmArmorCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawBackArmArmor = function() {
				var palette = _this.chestArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.chestArmorDirectivesAdv; }
				base.context.paintToCanvas(_this.backArmArmorImg.canvas, (_this.backArmArmorIdleOffset.x*_this.backArmFrameData.frameGrid.size[0]), (_this.backArmArmorIdleOffset.y*_this.backArmFrameData.frameGrid.size[1]), _this.backArmFrameData.frameGrid.size[0], _this.backArmFrameData.frameGrid.size[1], 
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Back Arm Armor
				if ($('#backArmArmorCanvas').length > 0) {
					document.getElementById("backArmArmorCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("backArmArmorCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(backArmArmorCanvas.canvas).addClass('armor').attr('id', 'backArmArmorCanvas').appendTo('.player_cnv');
					backArmArmorCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawBackArmArmor();
		}

		if (_this.doBackArmor) {
			var backArmorCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawBackArmor = function() {
				var palette = _this.backArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.backArmorDirectivesAdv; }
				base.context.paintToCanvas(_this.backArmorImg.canvas, (_this.backArmorIdleOffset*_this.backFrameData.frameGrid.size[0]), 0, _this.backFrameData.frameGrid.size[0], _this.backFrameData.frameGrid.size[1], 0, 0, _this.sourceWidth, _this.sourceHeight, palette); // Back Arm Armor
				if ($('#backArmorCanvas').length > 0) {
					document.getElementById("backArmorCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("backArmorCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(backArmorCanvas.canvas).addClass('armor').attr('id', 'backArmorCanvas').appendTo('.player_cnv');
					backArmorCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawBackArmor();
		}

		var headCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
		_this.drawHead = function() {
			var palette = _this.bodyDirectives;
			if ($('#advanced-check').is(':checked')) { palette = _this.bodyDirectivesAdv; }
			base.context.paintToCanvas(_this.headImg.canvas, _this.headFrames.frameList.normal[0], _this.headFrames.frameList.normal[1], 
											(_this.headFrames.frameList.normal[2]-_this.headFrames.frameList.normal[0]), 
											(_this.headFrames.frameList.normal[3]-_this.headFrames.frameList.normal[1]),
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Head
			if ($('#headCanvas').length > 0) {
				document.getElementById("headCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
				document.getElementById("headCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			} else {
				$(headCanvas.canvas).attr('id', 'headCanvas').appendTo('.player_cnv');
				headCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			}
			// Gotta draw the player avatar
			$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
		}
		_this.drawHead();

		var emoteCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
		_this.drawEmote = function() {
			var palette = _this.emoteDirectives;
			if (_this.currentEmote != null) {
				var emote = Emotes[_this.PlayerEntity.data['identity'].data['species'].data][_this.currentEmote];
				base.context.paintToCanvas(emote.canvas, 0, 0, _this.emoteData.frameGrid.size[0], _this.emoteData.frameGrid.size[1],
													 _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, _this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.emoteData.frameGrid.size[0], _this.emoteData.frameGrid.size[1],
													 _this.emoteDirectives);
			} else {
				// We don't have an emote, so just blank this shit
				base.context.clearRect(0,0,_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			}
			if ($('#emoteCanvas').length > 0) {
				document.getElementById("emoteCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
				document.getElementById("emoteCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			} else {
				$(emoteCanvas.canvas).attr('id', 'emoteCanvas').appendTo('.player_cnv');
				emoteCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			}
		}
		_this.drawEmote();

		var hairCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
		var hairMaskCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
		_this.drawHair = function() {
			var palette = _this.hairDirectives;
			if ($('#advanced-check').is(':checked')) { palette = _this.hairDirectivesAdv; }
			base.context.paintToCanvas(_this.hairImg.canvas, _this.hairFrames.frameList.normal[0], _this.hairFrames.frameList.normal[1], 
											(_this.hairFrames.frameList.normal[2]-_this.hairFrames.frameList.normal[0]), 
											(_this.hairFrames.frameList.normal[3]-_this.hairFrames.frameList.normal[1]),
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
											_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Hair
			if ($('#hairCanvas').length > 0) {
				document.getElementById("hairCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
				document.getElementById("hairCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);

				document.getElementById("hairMaskCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
				if (_this.hairMaskImg) {
					document.getElementById("hairMaskCanvas").getContext("2d").globalCompositeOperation = 'source-over';
					document.getElementById("hairMaskCanvas").getContext("2d").drawImage(_this.hairMaskImg.canvas,_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
													_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
					document.getElementById("hairMaskCanvas").getContext("2d").globalCompositeOperation = 'source-in';
				}
				document.getElementById("hairMaskCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			} else {
				$(hairCanvas.canvas).hide().addClass('hair').attr('id', 'hairCanvas').appendTo('.player_cnv');
				hairCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);

				$(hairMaskCanvas.canvas).addClass('hair').attr('id', 'hairMaskCanvas').appendTo('.player_cnv');
				if (_this.hairMaskImg) {
					hairMaskCanvas.context.drawImage(_this.hairMaskImg.canvas,_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
													_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth*spriteMult, _this.sourceHeight*spriteMult);
					hairMaskCanvas.context.globalCompositeOperation = 'source-in';
				}
				hairMaskCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			}
			// Gotta draw the player avatar
			$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
		}
		_this.drawHair();

		var bodyCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
		_this.drawBody = function() {
			var palette = _this.bodyDirectives;
			if ($('#advanced-check').is(':checked')) { palette = _this.bodyDirectivesAdv; }
			base.context.paintToCanvas(_this.bodyImg.canvas, (_this.bodyIdleOffset*_this.sourceWidth), 0, _this.sourceWidth, _this.sourceHeight, 0, 0, _this.sourceWidth, _this.sourceHeight, palette); // Body
			if ($('#bodyCanvas').length > 0) {
				document.getElementById("bodyCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
				document.getElementById("bodyCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			} else {
				$(bodyCanvas.canvas).attr('id', 'bodyCanvas').appendTo('.player_cnv');
				bodyCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			}
			// Gotta draw the player avatar
			$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
		}
		_this.drawBody();

		if (_this.doPantsArmor) {
			var pantsArmorCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawPantsArmor = function() {
				var palette = _this.pantsArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.pantsArmorDirectivesAdv; }
				base.context.paintToCanvas(_this.pantsArmorImg.canvas, (_this.pantsArmorIdleOffset*_this.pantsFrameData.frameGrid.size[0]), 0, _this.pantsFrameData.frameGrid.size[0], _this.pantsFrameData.frameGrid.size[1], 0, 0, _this.sourceWidth, _this.sourceHeight, palette); // Chest Armor
				if ($('#pantsArmorCanvas').length > 0) {
					document.getElementById("pantsArmorCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("pantsArmorCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(pantsArmorCanvas.canvas).addClass('armor').attr('id', 'pantsArmorCanvas').appendTo('.player_cnv');
					pantsArmorCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawPantsArmor();
		}

		if (_this.doChestArmor) {
			var chestArmorCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawChestArmor = function() {
				var palette = _this.chestArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.chestArmorDirectivesAdv; }
				base.context.paintToCanvas(_this.chestArmorImg.canvas, _this.chestFrameData[0], _this.chestFrameData[1], (_this.chestFrameData[2]-_this.chestFrameData[0]), (_this.chestFrameData[3]-_this.chestFrameData[1]), 0, 0, _this.sourceWidth, _this.sourceHeight, palette); // Chest Armor
				if ($('#chestArmorCanvas').length > 0) {
					document.getElementById("chestArmorCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("chestArmorCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(chestArmorCanvas.canvas).addClass('armor').attr('id', 'chestArmorCanvas').appendTo('.player_cnv');
					chestArmorCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawChestArmor();
		}


		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
			var facialHairCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawFacialHair = function() {
				var palette = _this.facialHairDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.facialHairDirectivesAdv; }
				base.context.paintToCanvas(_this.facialHairImg.canvas, _this.facialHairFrames.frameList.normal[0], _this.facialHairFrames.frameList.normal[1], 
												(_this.facialHairFrames.frameList.normal[2]-_this.facialHairFrames.frameList.normal[0]), 
												(_this.facialHairFrames.frameList.normal[3]-_this.facialHairFrames.frameList.normal[1]),
												_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
												_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Facial Hair
				if ($('#facialHairCanvas').length > 0) {
					document.getElementById("facialHairCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("facialHairCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(facialHairCanvas.canvas).attr('id', 'facialHairCanvas').appendTo('.player_cnv');
					facialHairCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawFacialHair();
		}

		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
			var facialMaskCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawFacialMask = function() {
				var palette = _this.facialMaskDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.facialMaskDirectivesAdv; }
				base.context.paintToCanvas(_this.facialMaskImg.canvas, _this.facialMaskFrames.frameList.normal[0], _this.facialMaskFrames.frameList.normal[1], 
												(_this.facialMaskFrames.frameList.normal[2]-_this.facialMaskFrames.frameList.normal[0]), 
												(_this.facialMaskFrames.frameList.normal[3]-_this.facialMaskFrames.frameList.normal[1]),
												_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
												_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Facial Mask
				if ($('#facialMaskCanvas').length > 0) {
					document.getElementById("facialMaskCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("facialMaskCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(facialMaskCanvas.canvas).attr('id', 'facialMaskCanvas').appendTo('.player_cnv');
					facialMaskCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawFacialMask();
		}

		if (_this.doHeadArmor) {
			var headArmorCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawHeadArmor = function() {
				var palette = _this.headArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.headArmorDirectivesAdv; }
				base.context.paintToCanvas(_this.headArmorImg.canvas, _this.headArmorFrameData.frameList.normal[0], _this.headArmorFrameData.frameList.normal[1], 
												(_this.headArmorFrameData.frameList.normal[2]-_this.headArmorFrameData.frameList.normal[0]), 
												(_this.headArmorFrameData.frameList.normal[3]-_this.headArmorFrameData.frameList.normal[1]),
												_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data, 
												_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Head Armor
				if ($('#headArmorCanvas').length > 0) {
					document.getElementById("headArmorCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("headArmorCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(headArmorCanvas.canvas).addClass('armor').attr('id', 'headArmorCanvas').appendTo('.player_cnv');
					headArmorCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawHeadArmor();
		}

		var frontArmCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
		_this.drawFrontArm = function() {
			var palette = _this.bodyDirectives;
			if ($('#advanced-check').is(':checked')) { palette = _this.bodyDirectivesAdv; }
			base.context.paintToCanvas(_this.frontArmImg.canvas, (_this.frontArmIdleOffset.x*_this.sourceWidth), (_this.frontArmIdleOffset.y*_this.sourceHeight), _this.sourceWidth, _this.sourceHeight, 
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Front Arm
			if ($('#frontArmCanvas').length > 0) {
				document.getElementById("frontArmCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
				document.getElementById("frontArmCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			} else {
				$(frontArmCanvas.canvas).attr('id', 'frontArmCanvas').appendTo('.player_cnv');
				frontArmCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
			}
			// Gotta draw the player avatar
			$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
		}
		_this.drawFrontArm();

		if (_this.doChestArmor) {
			var frontArmArmorCanvas = createCanvas(_this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
			_this.drawFrontArmArmor = function() {
				var palette = _this.chestArmorDirectives;
				if ($('#advanced-check').is(':checked')) { palette = _this.chestArmorDirectivesAdv; }
				base.context.paintToCanvas(_this.frontArmArmorImg.canvas, (_this.frontArmArmorIdleOffset.x*_this.frontArmFrameData.frameGrid.size[0]), (_this.frontArmArmorIdleOffset.y*_this.frontArmFrameData.frameGrid.size[1]), _this.frontArmFrameData.frameGrid.size[0], _this.frontArmFrameData.frameGrid.size[1], 
										_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data, 
										-_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data, _this.sourceWidth, _this.sourceHeight, palette); // Front Arm Armor
				if ($('#frontArmArmorCanvas').length > 0) {
					document.getElementById("frontArmArmorCanvas").getContext("2d").clearRect(0, 0, _this.sourceWidth*spriteMult,_this.sourceHeight*spriteMult);
					document.getElementById("frontArmArmorCanvas").getContext("2d").drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				} else {
					$(frontArmArmorCanvas.canvas).addClass('armor').attr('id', 'frontArmArmorCanvas').appendTo('.player_cnv');
					frontArmArmorCanvas.context.drawImage(base.canvas,0,0,_this.sourceHeight,_this.sourceHeight,0,0,_this.sourceHeight*spriteMult,_this.sourceHeight*spriteMult);
				}
				// Gotta draw the player avatar
				$('.player-avatar img').attr('src', _this.drawAvatar({spriteMult:3}).toDataURL());
			}
			_this.drawFrontArmArmor();
		}

		$('.player_info .pname').text(_this.PlayerEntity.data['identity'].data['name'].data);
		$('.uuid').text(_this.PlayerEntity.data['uuid'].data);
		$('#player_pixels_n').val(_this.PlayerEntity.data['inventory'].data['money'].data);

		// Arms Idle
		$('.pose-arm-pos-x input').val(_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data).unbind('change.sv')
		.bind('change.sv', function(e) {
			var val = Number($(this).val());
			if (isNaN(val)) {
				return;
			}
			_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data = val;
			_this.drawAll();
		});
		$('.pose-arm-pos-y input').val(_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data).unbind('change.sv')
		.bind('change.sv', function(e) {
			var val = Number($(this).val());
			if (isNaN(val)) {
				return;
			}
			_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data = val;
			_this.drawAll();
		});

		if (_this.PlayerEntity.data['status'] != undefined) { // Old Format
			var healthMax = _this.PlayerEntity.data['status'].data['healthSchema'].data['max'].data;
			var healthCur = _this.PlayerEntity.data['status'].data['healthSchema'].data['value'].data;
			var healthPer = Math.floor(healthCur / healthMax * 100);
			var energyMax = _this.PlayerEntity.data['status'].data['energySchema'].data['max'].data;
			var energyCur = _this.PlayerEntity.data['status'].data['energySchema'].data['value'].data;
			var energyPer = Math.floor(energyCur / energyMax * 100);
			var foodMax = _this.PlayerEntity.data['status'].data['foodSchema'].data['max'].data;
			var foodCur = _this.PlayerEntity.data['status'].data['foodSchema'].data['value'].data;
			var foodPer = Math.floor(foodCur / foodMax * 100);
			var warmthMax = _this.PlayerEntity.data['status'].data['warmthSchema'].data['max'].data;
			var warmthCur = _this.PlayerEntity.data['status'].data['warmthSchema'].data['value'].data;
			var warmthPer = Math.floor(warmthCur / warmthMax * 100);
			var breathMax = _this.PlayerEntity.data['status'].data['breathSchema'].data['max'].data;
			var breathCur = _this.PlayerEntity.data['status'].data['breathSchema'].data['value'].data;
			var breathPer = Math.floor(breathCur / breathMax * 100);
		} else if (_this.PlayerEntity.data['statusController'] != undefined) {
			if (_this.PlayerEntity.data['statusController'].data['resourcePercentages'] != undefined) { // pre pleased giraffe
				var healthMax = 100;
				var healthCur = _this.PlayerEntity.data['statusController'].data['resourcePercentages'].data['health'].data * 100;
				var healthPer = healthCur;
				var energyMax = 100;
				var energyCur = _this.PlayerEntity.data['statusController'].data['resourcePercentages'].data['energy'].data * 100;
				var energyPer = energyCur;
				var breathMax = 100;
				var breathCur = _this.PlayerEntity.data['statusController'].data['resourcePercentages'].data['breath'].data * 100;
				var breathPer = breathCur;
			} else {
				var healthMax = _this.maxHealth;
				var healthCur = _this.PlayerEntity.data['statusController'].data['resourceValues'].data['health'].data;
				var healthPer = healthCur;
				var energyMax = _this.maxEnergy;
				var energyCur = _this.PlayerEntity.data['statusController'].data['resourceValues'].data['energy'].data;
				var energyPer = energyCur;
				var breathMax = 100;
				var breathCur = _this.PlayerEntity.data['statusController'].data['resourceValues'].data['breath'].data;
				var breathPer = breathCur;
			}
		}

		// Let's make a preview picture
		var playericon = _this.drawAvatar({spriteMult:3});

		$('#zinfo').append('<li class="clearfix"><div class="player-avatar">\
								<img src="'+playericon.toDataURL()+'" /><div class="player-avatar-loader"><i class="fa fa-spin fa-refresh"></i></div></div>\
								<div class="statusController"></div>\
								<div class="clearfix hair-styles">\
									<div class="row">\
									</div>\
								</div>\
							</li>');
		$('#zinfo .statusController').append('<div class="progress" style="margin-top: 5px; margin-bottom:5px;height: 18px;">\
  									<div class="progress-bar progress-bar-danger" role="progressbar" aria-valuenow="'+healthCur+'" aria-valuemin="0" aria-valuemax="'+healthMax+'" style="width: '+healthPer+'%;height: 18px;text-align: left;">\
										<span style="margin-left:10px;">Health: '+Math.floor(healthCur)+'/'+healthMax+'</span>\
  									</div>\
								</div>\
								<div class="progress" style="margin-bottom:5px;height: 18px;">\
  									<div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="'+energyCur+'" aria-valuemin="0" aria-valuemax="'+energyMax+'" style="width: '+energyPer+'%;height: 18px;text-align: left;">\
										<span style="margin-left:10px;">Energy: '+Math.floor(energyCur)+'/'+energyMax+'</span>\
  									</div>\
								</div>');
		if (_this.PlayerEntity._version == false) { //16777216) {
			$('#zinfo .statusController').append('<div class="progress" style="margin-bottom:5px;height: 18px;">\
  									<div class="progress-bar progress-bar-warning" role="progressbar" aria-valuenow="'+foodCur+'" aria-valuemin="0" aria-valuemax="'+foodMax+'" style="width: '+foodPer+'%;height: 18px;text-align: left;">\
										<span style="margin-left:10px;">Hunger: '+Math.floor(foodCur)+'/'+foodMax+'</span>\
  									</div>\
								</div>');
		}
		$('#zinfo .statusController').append('<div class="progress" style="margin-bottom:5px;height: 18px;">\
  									<div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="'+breathCur+'" aria-valuemin="0" aria-valuemax="'+breathMax+'" style="width: '+breathPer+'%;height: 18px;text-align: left;">\
										<span style="margin-left:10px;">Breath: '+Math.floor(breathCur)+'/'+breathMax+'</span>\
  									</div>\
								</div>');
		$('#zinfo').append('<li class="edit-player-description clearfix"><blockquote class="player-description" style="margin-bottom: 0;"><p style="font-size: 14px;">'+_this.PlayerEntity.data['description'].data+'</p></blockquote></li>');

	}

	this.generateName = function(data) {
		if (!data) { // Top level, let's initialize this shit
			var generatedName = this.generateName(_this.nameGen.names);
			_this.PlayerEntity.data['identity'].data['name'].data = generatedName;
			$('.player_info .pname').text(generatedName);
		} else {
			if (!Array.isArray(data)) { console.log('No namegen data or empty.'); return "";  }
			var mode = data[0]['mode'];
			var titleCase = data[0]['titleCase'];
			var output = "";

			if (mode == "serie") { // Add the rest of the array in a sequence
				for (var i = 1; i < data.length; i++) {
					if (Array.isArray(data[i])) {
						output += this.generateName(data[i]);
					} else {
						console.log('Unexpected?');
					}
				}
			} else if (mode == "alts" || !mode) { // Pick a random key from the rest of the array to add
				var generate = _.random((!mode)?0:1,data.length-1);
				if (Array.isArray(data[generate])) {
					output += this.generateName(data[generate]);
				} else {
					output += data[generate];
				}
			} else if (mode == "markov") {
				var source = data[0]['source'];
				var targetLength = data[0]['targetLength'];
				if (!source) {
					console.log('Improperly formatted markov.');
					return;
				}

				var markovData = NameSource[source];

				if (!markovData) {
					console.log('Name Source not found.');
					return;
				}

				output += this.generateMarkovName(markovData, targetLength[0], targetLength[1]);
			}
			if (titleCase) {
				output = output.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
			}
			return output;
		}
	}

	this.generateMarkovName = function(source, min, max) {
		var prefixSize = source['prefixSize'];
		if (!prefixSize) { prefixSize = 1; }

		if (!source._chains) {
			source._chains = {};
			for (key in source['sourceNames']) {
				var word = source['sourceNames'][key];
				for (var letter = 0; letter < word.length - 2; letter++) {
					var token = word.substring(letter,letter + 2);
					var data = [];
					if (source._chains[token]) {
						data = source._chains[token];
					} else {
						source._chains[token] = data;
					}
					data.push(word[letter + 2]);
				}
			}
		}

		var n = _.random(0,source['sourceNames'].length);
		var length = _.random(min, max);
		var start = _.random(0,source['sourceNames'][n].length - prefixSize);
		var name = source['sourceNames'][n].substring(start, start+prefixSize);
		while (name.length < length) {
			var token = name.substring(name.length - 2, (name.length - 2) + 2);
			if (!source._chains[token]) { // Token Not Found
				break;
			} else {
				var letters = source._chains[token];
				var add = letters[_.random(0, letters.length - 1)];
				name += add;
			}
		}

		return name;
	}

	this.drawAll = function() {
		_this.drawBackArm();
		_this.drawBody();
		_this.drawHead();
		_this.drawFrontArm();
		_this.drawHair();
		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) { _this.drawFacialHair(); }
		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) { _this.drawFacialMask(); }
		if (_this.doHeadArmor) { _this.drawHeadArmor(); }
		if (_this.doChestArmor) {
			_this.drawBackArmArmor();
			_this.drawChestArmor();
			_this.drawFrontArmArmor();
		}
		if (_this.doPantsArmor) { _this.drawPantsArmor(); }
		if (_this.doBackArmor) { _this.drawBackArmor(); }
	}

	this.findPose = function(pose, personalities) {
		var currentPose = _this.PlayerEntity.data['identity'].data[pose].data;
		return personalities.indexOf(currentPose);
	}

	this.changeBodyPose = function(d) {
		var personalities = _this.personalitiesList;
		var currentPose =  _this.findPose('personalityIdle', personalities);
		var targetPose = currentPose + d;
		
		if (targetPose > personalities.length-1) {
			targetPose = 0;
		} else if (targetPose < 0) {
			targetPose = personalities.length-1;
		}

		_this.PlayerEntity.data['identity'].data['personalityIdle'].data = personalities[targetPose]; // Body should be first, then arms, head offset, arms offset
		_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[0].data = _this.personalitiesOffsetList[personalities[targetPose]].headOffset[0]; // Sets head position, should only matter when body is set
		_this.PlayerEntity.data['identity'].data['personalityHeadOffset'].data[1].data = _this.personalitiesOffsetList[personalities[targetPose]].headOffset[1];
		//_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data = _this.personalitiesOffsetList[personalities[targetPose]].armOffset[0];
		//_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data = _this.personalitiesOffsetList[personalities[targetPose]].armOffset[1];
		_this.bodyIdleOffset = (_.invert(_this.bodyFrames.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];

		if (_this.doPantsArmor) { _this.pantsArmorIdleOffset = (_.invert(_this.pantsFrameData.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data]; }
		if (_this.doBackArmor) { _this.backArmorIdleOffset = (_.invert(_this.backFrameData.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data]; }
		if (_this.doChestArmor) {
			_this.alias = _this.chestFrameDataO.aliases[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];
			_this.chestFrameData = _this.chestFrameDataO.frameList[_this.alias];
		}
		_this.drawAll();

	}

	this.changeArmPose = function(d) {
		var personalities = _this.bodyFrameList;
		var currentPose = _this.findPose('personalityArmIdle', personalities);
		var targetPose = currentPose + d;

		if (targetPose >= personalities.length) {
			targetPose = 0;
		} else if (targetPose < 0) {
			targetPose = personalities.length-1;
		}

		_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data = personalities[targetPose];
		//_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[0].data = 0;//personalities[targetPose][3][0];
		//_this.PlayerEntity.data['identity'].data['personalityArmOffset'].data[1].data = 0;//personalities[targetPose][3][1];
		_this.backArmIdleOffset = _this.backArmFrameOffsets[personalities[targetPose]];
		_this.frontArmIdleOffset = _this.frontArmFrameOffsets[personalities[targetPose]];

		if (_this.doChestArmor) {
			_this.backArmArmorIdleOffset = _this.backArmArmorFrameOffsets[personalities[targetPose]];
			_this.frontArmArmorIdleOffset = _this.frontArmArmorFrameOffsets[personalities[targetPose]];
		}
		_this.drawAll();
	}

	this.saveDirectives = function() {
		if ($('#advanced-check').is(':checked')) { // We're in advanced mode, so let's shove all the advanced directives over top of their basic counterparts!
			_this.bodyDirectives = _this.bodyDirectivesAdv;
			_this.hairDirectives = _this.hairDirectivesAdv;
			if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
				_this.facialHairDirectives = _this.facialHairDirectivesAdv;
			}
			if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
				_this.facialMaskDirectives = _this.facialMaskDirectivesAdv;
			}

			if (_this.doChestArmor) {
				_this.chestArmorDirectives = _this.chestArmorDirectivesAdv;
			}

			if (_this.doPantsArmor) {
				_this.pantsArmorDirectives = _this.pantsArmorDirectivesAdv;
			}

			if (_this.doBackArmor) {
				_this.backArmorDirectives = _this.backArmorDirectivesAdv;
			}

			if (_this.doHeadArmor) {
				_this.headArmorDirectives = _this.headArmorDirectivesAdv;
			}
		}
		// Convert Avian back to normal directive
		if (_this.PlayerEntity.data['identity'].data['species'].data == "avian" && _this.bodyDirectives[0].length != 1) {
			var tempDirective = new Array(Array(Array()), Array(Array()));
			for (var x in _this.bodyDirectives[0]) {
				for (var y in _this.bodyDirectives[0][x]) {
					if (parseInt(x) == 0) {
						var z = new Array(1,3,8,9);
						tempDirective[0][0][z[y]] = _this.bodyDirectives[0][x][y];
						tempDirective[1][0][z[y]] = _this.bodyDirectives[1][x][y];
					}
					if (parseInt(x) == 1) {
						var z = new Array(0,2,4);
						tempDirective[0][0][z[y]] = _this.bodyDirectives[0][x][y];
						tempDirective[1][0][z[y]] = _this.bodyDirectives[1][x][y];	
					}
					if (parseInt(x) == 2) {
						var z = new Array(5,6,7,10);
						if (z[y] != undefined) {
							tempDirective[0][0][z[y]] = _this.bodyDirectives[0][x][y];
							tempDirective[1][0][z[y]] = _this.bodyDirectives[1][x][y];		
						} else { // If another directive has been added by SBSE, we can tag it on to the end
							tempDirective[0][0].push(_this.bodyDirectives[0][x][y]);
							tempDirective[1][0].push(_this.bodyDirectives[1][x][y]);	
						}
					}
				}
			}
			_this.bodyDirectives = tempDirective;
		}
		// Convert Floran Hair back to normal directive
		if (_this.PlayerEntity.data['identity'].data['species'].data == "floran" && _this.hairDirectives[0].length != 1) {
			var tempDirective = new Array(Array(Array()), Array(Array()));
			for (var x in _this.hairDirectives[0]) {
				for (var y in _this.hairDirectives[0][x]) {
					if (parseInt(x) == 0) {
						var z = new Array(0,1,2);
						tempDirective[0][0][z[y]] = _this.hairDirectives[0][x][y];
						tempDirective[1][0][z[y]] = _this.hairDirectives[1][x][y];
					}
					if (parseInt(x) == 1) {
						var z = new Array(3,4,5,6);
						if (z[y] != undefined) {
							tempDirective[0][0][z[y]] = _this.hairDirectives[0][x][y];
							tempDirective[1][0][z[y]] = _this.hairDirectives[1][x][y];
						} else { // If another directive has been added by SBSE, we can tag it on to the end
							tempDirective[0][0].push(_this.hairDirectives[0][x][y]);
							tempDirective[1][0].push(_this.hairDirectives[1][x][y]);	
						}	
					}
				}
			}
			_this.hairDirectives = tempDirective;
		}
		_this.saveDirective(_this.emoteDirectives, _this.PlayerEntity.data['identity'].data['emoteDirectives'], _this.emotesImg.canvas.premultiplied);
		_this.saveDirective(_this.bodyDirectives, _this.PlayerEntity.data['identity'].data['bodyDirectives'], _this.bodyImg.canvas.premultiplied);
		_this.saveDirective(_this.hairDirectives, _this.PlayerEntity.data['identity'].data['hairDirectives'], _this.hairImg.canvas.premultiplied);
		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
			_this.saveDirective(_this.facialHairDirectives, _this.PlayerEntity.data['identity'].data['facialHairDirectives'], _this.facialHairImg.canvas.premultiplied);
		}
		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
			_this.saveDirective(_this.facialMaskDirectives, _this.PlayerEntity.data['identity'].data['facialMaskDirectives'], _this.facialMaskImg.canvas.premultiplied);
		}

		if (_this.doChestArmor) {
			var item_directive = _this.normalizeItemParam(_this.normalizeItem(_this.PlayerEntity.data['inventory'].data['equipment'].data[(_this.chestVanity)?5:1].data));
			if (!item_directive.data['directives']) { // Make directives if they don't exist
				item_directive.data['directives'] = new Variant();
				item_directive.data['directives'].type = 5;
				item_directive.data['directives'].variant = new UTF8StrVariant();
				item_directive.data['directives'].data = "";
			}
			_this.saveDirective(_this.chestArmorDirectives, item_directive.data['directives'], _this.chestArmorImg.canvas.premultiplied);
		}

		if (_this.doPantsArmor) {
			var item_directive = _this.normalizeItemParam(_this.normalizeItem(_this.PlayerEntity.data['inventory'].data['equipment'].data[(_this.pantsVanity)?6:2].data));
			if (!item_directive.data['directives']) { // Make directives if they don't exist
				item_directive.data['directives'] = new Variant();
				item_directive.data['directives'].type = 5;
				item_directive.data['directives'].variant = new UTF8StrVariant();
				item_directive.data['directives'].data = "";
			}
			_this.saveDirective(_this.pantsArmorDirectives, item_directive.data['directives'], _this.pantsArmorImg.canvas.premultiplied);
		}

		if (_this.doBackArmor) {
			var item_directive = _this.normalizeItemParam(_this.normalizeItem(_this.PlayerEntity.data['inventory'].data['equipment'].data[(_this.backVanity)?7:3].data));
			if (!item_directive.data['directives']) { // Make directives if they don't exist
				item_directive.data['directives'] = new Variant();
				item_directive.data['directives'].type = 5;
				item_directive.data['directives'].variant = new UTF8StrVariant();
				item_directive.data['directives'].data = "";
			}
			_this.saveDirective(_this.backArmorDirectives, item_directive.data['directives'], _this.backArmorImg.canvas.premultiplied);
		}

		if (_this.doHeadArmor) {
			var item_directive = _this.normalizeItemParam(_this.normalizeItem(_this.PlayerEntity.data['inventory'].data['equipment'].data[(_this.headVanity)?4:0].data));
			if (!item_directive.data['directives']) { // Make directives if they don't exist
				item_directive.data['directives'] = new Variant();
				item_directive.data['directives'].type = 5;
				item_directive.data['directives'].variant = new UTF8StrVariant();
				item_directive.data['directives'].data = "";
			}
			_this.saveDirective(_this.headArmorDirectives, item_directive.data['directives'], _this.headArmorImg.canvas.premultiplied);
		}
	}

	this.saveDirective = function(directive, target, premultiplied) {
		var result = "";
		for (var i=0;i<directive[0].length;i++) {
			result += "?replace";
			for (var x=0;x<directive[0][i].length;x++) {
				var cDest = directive[0][i][x].replace('#','');
				if (premultiplied && premultiplied[cDest]) {
					cDest = premultiplied[cDest];
				}
				result += ";"+cDest+'='+directive[1][i][x].replace('#','');
			}
		}
		target.data =  result;
	}

	this.resetDirectives = function() {
		_this.parse(_this.playerFile);
		_this.bodyIdleOffset = (_.invert(_this.bodyFrames.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];

		if (_this.doPantsArmor) { _this.pantsArmorIdleOffset = (_.invert(_this.pantsFrameData.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data]; }
		if (_this.doBackArmor) { _this.backArmorIdleOffset = (_.invert(_this.backFrameData.frameGrid.names[0]))[_this.PlayerEntity.data['identity'].data['personalityIdle'].data]; }
		if (_this.doChestArmor) {
			_this.alias = _this.chestFrameDataO.aliases[_this.PlayerEntity.data['identity'].data['personalityIdle'].data];
			_this.chestFrameData = _this.chestFrameDataO.frameList[_this.alias];
		}	
		_this.backArmIdleOffset = _this.backArmFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];
		_this.frontArmIdleOffset = _this.frontArmFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];

		if (_this.doChestArmor) {
			_this.backArmArmorIdleOffset = _this.backArmArmorFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];
			_this.frontArmArmorIdleOffset = _this.backArmArmorFrameOffsets[_this.PlayerEntity.data['identity'].data['personalityArmIdle'].data];
		}

		_this.emoteDirectives = $.extend(true, {}, _this.emoteODirectives);
		_this.bodyDirectives = $.extend(true, {}, _this.bodyODirectives);
		delete _this.bodyDirectivesAdv;
		_this.hairDirectives = $.extend(true, {}, _this.hairODirectives);
		delete _this.hairDirectivesAdv;
		if (_this.PlayerEntity.data['identity'].data['facialHairGroup'].data) {
			_this.facialHairDirectives = $.extend(true, {}, _this.facialHairODirectives);
			delete _this.facialHairDirectivesAdv;
		}
		if (_this.PlayerEntity.data['identity'].data['facialMaskGroup'].data) {
			_this.facialMaskDirectives = $.extend(true, {}, _this.facialMaskODirectives);
			delete _this.facialMaskDirectivesAdv;
		}

		if (_this.doChestArmor) {
			_this.chestArmorDirectives = $.extend(true, {}, _this.chestArmorODirectives);
			delete _this.chestArmorDirectivesAdv;
		}

		if (_this.doPantsArmor) {
			_this.pantsArmorDirectives = $.extend(true, {}, _this.pantsArmorODirectives);
			delete _this.pantsArmorDirectivesAdv;
		}

		if (_this.doBackArmor) {
			_this.backArmorDirectives = $.extend(true, {}, _this.backArmorODirectives);
			delete _this.backArmorDirectivesAdv;
		}

		if (_this.doHeadArmor) {
			_this.headArmorDirectives = $.extend(true, {}, _this.headArmorODirectives);
			delete _this.headArmorDirectivesAdv;
		}
	}

	this.render = function(dest, source) {
		dest.canvas.width = source.width;
		dest.canvas.height = source.height;
		var imgdata = dest.context.createImageData(source.width, source.height);
		this.copyToImageData(imgdata, source.data);
		dest.context.putImageData(imgdata, 0, 0);

		var premultiplied = {};
        var px = dest.context.getImageData(0,0,source.width,source.height);
        for (var i=0;i<px.data.length;i+=4) {
          if (px.data[i] == 0 && px.data[i+1] == 0 && px.data[i+2] == 0 && px.data[i+3] == 0) { continue; }
          if (px.data[i] != imgdata.data[i] || px.data[i+1] != imgdata.data[i+1] || px.data[i+2] != imgdata.data[i+2] || px.data[i+3] != imgdata.data[i+3]) {
            var og = rgba2hexAlt(imgdata.data[i],imgdata.data[i+1],imgdata.data[i+2],imgdata.data[i+3]);
            var to = rgba2hexAlt(px.data[i],px.data[i+1],px.data[i+2],px.data[i+3]);
            if (!premultiplied[to]) {
              premultiplied[to] = og;
            }
          }
        }
        dest.canvas.premultiplied = premultiplied;
	}

	this.copyToImageData = function(imageData, pixels) {
		var data, i, j, length;
		data = imageData.data || imageData;
		length = data.length;
		i = j = 0;
		while (i < length) {
			data[i++] = pixels[j++];
			data[i++] = pixels[j++];
			data[i++] = pixels[j++];
			data[i++] = pixels[j++];
		}
	}
}

function VersionedVariant() {
	var _this = this;
	this._version = 0;

	this.parseVariant = function(buffer) {
		// Fix for proper header read
		// This eats the 01 that no one seems to know the meaning of
		buffer.read_offset++;
		_this._version = buffer.readUInt32LE();

		var variant = new Variant();
		_this.variant = variant;
		_this.data = variant.parse(buffer);
		return _this;
	}

	this.packVariant = function(buffer) {
		buffer.writeUInt8(0x01);
		buffer.writeUInt32LE(_this._version);
		_this.variant.pack(buffer);
	}
}

function Variant() {
	var _this = this;
	this.type = 0;
	this.data = null;
	this.variant;

	this.variantMap = {
		2: {'class': 'DoubleVariant'},
		3: {'class': 'BoolVariant'},
		4: {'class': 'VLQIVariant'},
		5: {'class': 'UTF8StrVariant'},
		6: {'class': 'VariantList'},
		7: {'class': 'VariantMap'},
	};

	this.parse = function(buffer) {
		_this.type = buffer.readUInt8();
		if (_this.variantMap[_this.type] !== undefined) {
			var variantClass = _this.variantMap[_this.type]['class'];
			var variant = new window[variantClass]();
			_this.variant = variant;
			_this.debugID = uuid.v4();
			_this.data = variant.parseVariant(buffer);
			return _this.data;
		}
	}

	this.pack = function(buffer) {
		buffer.writeUInt8(_this.type);
		if (_this.type == 1) { return; }
		_this.variant.packVariant(_this.data, buffer);
	}
}

function DoubleVariant() {
	this.parseVariant = function(buffer) {
		var result = buffer.readDoubleBE();
		return result;
	}
	this.packVariant = function(data, buffer) {
		buffer.writeDoubleBE(data);
	}
}

function BoolVariant() {
	this.parseVariant = function(buffer) {
		return buffer.readUInt8();
	}
	this.packVariant = function(data, buffer) {
		buffer.writeUInt8(data);
	}
}

function VLQIVariant() {
	this.parseVariant = function(buffer) {
		return buffer.readVLQIValue(buffer.readVLQI());
	}
	this.packVariant = function(data, buffer) {
		buffer.writeVLQI(data);
	}
}

function UTF8StrVariant() {
	this.parseVariant = function(buffer) {
		return buffer.readUTF8Str();
	}
	this.packVariant = function(data, buffer) {
		buffer.writeUTF8Str(data);
	}
}

function VariantList() {
	var _this = this;

	this.parseVariant = function(buffer) {
		var size = buffer.readVLQUValue(buffer.readVLQU());

		var variants = new Array();
		var variant;
		for(var i=0;i<size;i++) {
			variant = new Variant();
			variant.parse(buffer);
			variants[i] = variant;
		}
		_this.variants = variants;
		return variants;
	}

	this.packVariant = function(data, buffer) {
		buffer.writeVLQU(data.length);
		for(var i=0;i<data.length;i++) {
			data[i].pack(buffer);
		}
	}
}

function VariantMap() {
	var _this = this;

	this.parseVariant = function(buffer) {
		var size = buffer.readVLQUValue(buffer.readVLQU());

		var variants = {};
		for(var i=0;i<size;i++) {
			var result = _this.variantMapPair(buffer);
			variants[result['key']] = result['val'];
		}
		return variants;
	}

	this.packVariant = function(data, buffer) {
		var size = _.size(data);
		buffer.writeVLQU(size);
		for(var key in data) {
			buffer.writeUTF8Str(key);
			data[key].pack(buffer);
		}
	}

	this.variantMapPair = function(buffer) {
		var result = new Array();
			result['key'] = buffer.readUTF8Str();

		var variant = new Variant();
			variant.parse(buffer);
			result['val'] = variant;
		return result;
	}
}

function createCanvas(width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d");
		context.imageSmoothingEnabled = false;
		context.mozImageSmoothingEnabled  = false;
		context.webkitImageSmoothingEnabled = false;
		context.msImageSmoothingEnabled = false;
		context.patternQuality = "fast";
    return {canvas: canvas, context: context};
}

function directive2ColorArray(directive) {
	var sourceArr = new Array();
	var destArr = new Array();

	console.log(directive);

	// Case sensitive
	directive = directive.toLowerCase();

	var x = 0;
	if (directive) {
		var replace = directive.split('?');
		for (var i in replace) {
			var rep = replace[i];
			if (rep) {
				rep = rep.split(';');
				if (rep[0] == "replace") {
					sourceArr[x] = new Array();
					destArr[x] = new Array();
					var y = 0;
					for (var z in rep) {
						var colors = rep[z];
						if (colors != "replace") {
							colors = colors.split('=');
							
							// Premultiplied Alpha Fix - Pre-converts Starbound's directives to/from premultiplied state.
							if (colors[0].length == 8) {
								var rgba = hexToRgb(colors[0]);

								var pc = document.createElement('canvas');
								var pctx = pc.getContext('2d');

								var px = pctx.getImageData(0,0,1,1);
								px.data[0] = rgba.r;
								px.data[1] = rgba.g;
								px.data[2] = rgba.b;
								px.data[3] = rgba.a;
								pctx.putImageData(px, 0, 0);

								var px2 = pctx.getImageData(0,0,1,1);
								colors[0] = rgba2hexAlt(px2.data[0], px2.data[1], px2.data[2], px2.data[3]);
								delete pc, pctx;
							}

							var sourceColor = '#'+colors[0];
							var destColor = '#'+colors[1];

							sourceArr[x].push(sourceColor);
							destArr[x].push(destColor);

							y++;
						}
					}
					x++;
				}
			}
		}
	}

	return [sourceArr, destArr];
}

function hexToRgb(hex) {
    var output = {};
    hex = hex.replace('#','');
    
    output['r'] = parseInt(hex.substring(0,2), 16);
    output['g'] = parseInt(hex.substring(2,4), 16);
    output['b'] = parseInt(hex.substring(4,6), 16);
    if (hex.length > 6) {
            output['a'] = parseInt(hex.substring(6,8), 16);
    }

    return output;
}

function rgba2hex(r, g, b, a) {
    if (r > 255 || g > 255 || b > 255 || a > 255)
        throw "Invalid color component";
    return a.toString(16) + ((1 << 24) + (r << 16) | (g << 8) | b).toString(16).substr(1);
}

function rgba2hexAlt(r, g, b, a) {
    if (r > 255 || g > 255 || b > 255 || a > 255)
        throw "Invalid color component";
    return ((1 << 24) + (r << 16) | (g << 8) | b).toString(16).substr(1) + a.toString(16);
}

function applyColors(context, sourcecolors, destcolors) {
	var imgd = context.getImageData(0, 0, 43, 43),
	    pix = imgd.data;
	
	// Loops through all of the pixels and modifies the components.
	for (var i = 0, n = pix.length; i <n; i += 4) {
		if (pix[i+3] == 0) { break; }
		for (var c = 0; c < sourcecolors.length; c++) {
			sourceColor = hexToRgb(sourcecolors[c]);
			destColor = hexToRgb(destcolors[c]);
			if (pix[i] == sourceColor.r && pix[i+1] == sourceColor.g && pix[i+2] == sourceColor.b) {
				pix[i] = destColor.r;   // Red component
				pix[i+1] = destColor.g; // Green component
				pix[i+2] = destColor.b; // Blue component
			}
		}
	}
	context.putImageData(imgd, 0, 0);
	return context;
}

function toSingleArray(colorArray) {
	var out = new Array();
	for (i=0;i<colorArray.length;i++) {
		if (colorArray[i] instanceof Array) {
			out = out.concat(colorArray[i]);
		}
	}
	return out;
}

function getDefaultColors(itemData, index) {
	console.log('===========================');
	console.log(itemData, index);
	var result = "?replace";
	if (index == undefined) {
		index = 0;
	}
	if (!itemData) {
		return false;
	}
	if (itemData['colorOptions'] && itemData.colorOptions[index]) { // Check if the color index exists in the item's Color Options
		for (var source in itemData.colorOptions[index]) {
			var dest = itemData.colorOptions[index][source];
			result = result + ";" + source + "=" + dest;
		}
	} else { // If it doesn't, it's likely a hex8 (RGBA format) stored as a 32-bit float.
		var hex8 = index.toString(16); // Convert decimal to hex8
		console.log(hex8);
		for (var source in itemData.colorOptions[0]) {
			result = result + ";" + source + "=" + source;
		}
	}
	console.log('===========================');
	return result;
}

function starMerge(source, merge) {
	var overwrite = new Array();
	var instructions = merge['__merge'];
	for (iList in instructions) {
		var instruction = instructions[iList][0];
		var target = instructions[iList][1];
		if (instruction == "delete") { // Delete from source
			delete source[target];
		} else if (instruction == "overwrite" || instruction == "update") {
			overwrite.push(target);
		}
	}
	for (k in merge) {
		if (merge.hasOwnProperty(k)) {
			if (_.has(merge[k], "__merge")) {
				starMerge(source[k], merge[k]);
			} else if (k != "__merge") {
				source[k] = merge[k];
			}
		}
	}
}

function starReadFile(file) {
	file = file.toLowerCase();
	var result = Assets.getFile(file);
	var isJSON = false;
	if (!result) {
		result = {};
		isJSON = true;
	} else {
		try {
			result = parseJSON(result.buf.toString().replace('[-.', '[-0.'));
			isJSON = true;
		} catch(e) {}
	}
	var toMerge = new Array();
	for(m in Mods) {

		if (Mods[m].type == "folder") {
			if (fs.existsSync(Mods[m].path+file)) {
				var contents = new OffsetBuffer(fs.readFileSync(Mods[m].path+file));
			}
		} else if(Mods[m].type == "pak") {
			var contents = Mods[m].getFile(file);
		}
		if (contents) {
			try {
				var json = parseJSON(stripJsonComments(contents.buf.toString()).replace('[-.', '[-0.'));
				if (_.has(json, "__merge")) { // Contains merge instructions
					toMerge.push(json);
				} else { // No merge instructions, overwrite
					//_.extend(result, json);
					result = json;
				}
				isJSON = true;
			} catch (e) {
				result = contents;
				isJSON = false;
			}
		}
	}
	if (isJSON) {
		if (toMerge.length > 0) {
			for (i in toMerge) {
				starMerge(result, toMerge[i]);
			}
		}

		if (_.isEmpty(result)) {
			result = false;
		}

		if (result) { result = new OffsetBuffer(JSON.stringify(result)); }
	}

	return result;
}

function starReadFile2(file) {
	var result = false;
	for(m in Mods) {
		if (Mods[m].type == "folder") {
			if (fs.existsSync(Mods[m].path+file)) {
				result = new OffsetBuffer(fs.readFileSync(Mods[m].path+file));
			}
		} else if(Mods[m].type == "pak") {
			result = Mods[m].getFile(file);
		}
	}
	if (!result) {
		result = Assets.getFile(file);
	}

	return result;
}


function starItemData(file) {
	var result = false;
	for(m in Mods) {
		if (Mods[m].type == "folder") {
			if (Mods[m].modItemDB) {
				if (Mods[m].modItemDB[file]) {
					result = Mods[m].modItemDB[file];
				}

				for (var i in Mods[m].modItemDB) { // Wasn't found, do it the hard way!
					var item = Mods[m].modItemDB[i];

					if (item.itemName == file) {
						result = item;
						break;
					}
				}
			}
		} else if (Mods[m].type == "pak") {
			result = Mods[m].getItemData(file);
		}
		if (result) {
			return result;
		}
	}
	if (!result) { // Result still not found, search normal assets
		return Assets.getItemData(file);
	}

	return result;
}

function advOnChange(colors, x, y, color, callback) {
	var hex8 = color.toHex8();
	var alpha = hex8.substring(0,2);
	colors[x][y] = "#"+hex8.substring(2,8)+hex8.substring(0,2);
	if (callback) {
		callback();
	}
}

function addColor(li_el, color_el, ccx, ccy, colors_ary, pickerBase, callback) {
	var key = ccx;
	var cy = ccy;
	$('#'+li_el+'-adv .row').append('<div class="col-xs-1"><div class="color-adv"><input type="text" id="'+color_el+'-adv-source-'+key+'-'+cy+'" /> <i class="fa fa-arrow-right"></i>\
									 <input type="text" id="'+color_el+'-adv-dest-'+key+'-'+cy+'" />');
	$('#'+color_el+'-adv-source-'+key+'-'+cy).data('cx', key).data('cy', cy).spectrum({
		preferredFormat: "hex8",
		clickoutFiresChange: true,
		showInput: true,
		showAlpha: true,
		color: colors_ary[0][key][cy].substring(7,9)+colors_ary[0][key][cy].substring(1,7),
		change: function(color) {
			advOnChange(colors_ary[0], $(this).data('cx'), $(this).data('cy'), color, callback);
		},
		move: function(color) {
			advOnChange(colors_ary[0], $(this).data('cx'), $(this).data('cy'), color, callback);
		},
		show: function(color) {
			var picker_e = $(this);
			var ogColor = color;
			$('.player_cnv canvas').css({opacity: 0.1});
			$('.player_mod').hide();

			$(pickerBase.canvas).attr('id', 'colorPickerCanvas').css({zIndex: 21, cursor: "url('images/colorpicker.png') 0 14, auto"}).prependTo('.player_cnv');
			$('#colorPickerCanvas').on('mousemove', function(e) {
			    var pos = findPos(this);
			    var x = e.pageX - pos.x;
			    var y = e.pageY - pos.y;
			    var coord = "x=" + x + ", y=" + y;
			    var c = this.getContext('2d');
			    var p = c.getImageData(x, y, 1, 1).data;
			    var hex = "#" + rgba2hex(p[0], p[1], p[2], p[3]);
			    if (hex != "#00000000") {
			    	picker_e.spectrum("set", hex);
			    } else {
			    	picker_e.spectrum("set", ogColor);
			    }
			});
		},
		hide: function(color) {
			$('#colorPickerCanvas').unbind('mousemove').remove();
			$('.player_cnv canvas').css({opacity: 1});
			$('.player_mod').show();
			advOnChange(colors_ary[0], $(this).data('cx'), $(this).data('cy'), color, callback);
		}
	});
	$('#'+color_el+'-adv-dest-'+key+'-'+cy).data('cx', key).data('cy', cy).spectrum({
		preferredFormat: "hex8",
		clickoutFiresChange: true,
		showInput: true,
		showAlpha: true,
		color: colors_ary[1][key][cy].substring(7,9)+colors_ary[1][key][cy].substring(1,7),
		change: function(color) {
			advOnChange(colors_ary[1], $(this).data('cx'), $(this).data('cy'), color, callback);
		},
		move: function(color) {
			advOnChange(colors_ary[1], $(this).data('cx'), $(this).data('cy'), color, callback);
		},
		hide: function(color) {
			advOnChange(colors_ary[1], $(this).data('cx'), $(this).data('cy'), color, callback);
		}
	});
	$('#'+li_el+'-adv .row').append('</div></div>');
}