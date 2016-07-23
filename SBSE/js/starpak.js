function StarPak() {
	var _this = this;
	this.fd = null;
	this.stats = null;
	this.currentOffset = 0;
	this.buffer = null;
	this.header = {};
	this.DBheader = {};
	this.versions = new Array("SBBF02", "SBBF03");
	this.itemDB = {};
	this.ignoreItems = new Array('.sai', '.psd', '.wav','.ogg','.lua','.treasurepools','.png','.config','.frames','.coinitem','.db','.ds_store');
	this.BlockType = {
		Index: 0,
		Leaf: 1,
		Unknown: 2
	};

	this.open = function(pakFile, callback) {
		fs.open(pakFile,'r',function(err,fd) {
			fs.fstat(fd,function(err, stats) {
				_this.fd = fd;
				_this.stats = stats;

				if (path.basename(pakFile) == "packed.pak") {

					if (stats.mtime != localStorage.getItem('mtime_'+path.basename(pakFile))) {
						localStorage.setItem('mtime_'+path.basename(pakFile), stats.mtime);
						_this.parse(pakFile, callback);
					} else {
						_this.buffer = new OffsetBuffer(75);
						_this.header = JSON.parse(localStorage.getItem('header_'+path.basename(pakFile)));
						_this.DBheader = JSON.parse(localStorage.getItem('DBheader_'+path.basename(pakFile)));
						_this.fileList = JSON.parse(localStorage.getItem('fileList_'+path.basename(pakFile)));
						_this.itemDB = JSON.parse(localStorage.getItem('itemDB_'+path.basename(pakFile)));
						if (callback) {
							callback();
						}
					}

				} else {

					if (stats.mtime == localStorage.getItem('mtime_'+path.basename(pakFile))) {

						var shasum;
						var s = fs.ReadStream(pakFile);
						s.on('data', function(d) {
							if (_this.DBheader['content'] == "Assets1") {
								shasum = sha(d, { asBytes: true });
							} else {
								shasum = c.createHash('sha256');
								shasum.update(d);
								shasum = shasum.digest('hex');
							}
						});

						s.on('end', function() {
							var d = shasum;
							if (localStorage.getItem('hash_'+path.basename(pakFile)) != d) {
								localStorage.setItem('hash_'+path.basename(pakFile), d);
								_this.parse(pakFile, callback);
							} else {
								_this.buffer = new OffsetBuffer(75);
								_this.header = JSON.parse(localStorage.getItem('header_'+path.basename(pakFile)));
								_this.DBheader = JSON.parse(localStorage.getItem('DBheader_'+path.basename(pakFile)));
								_this.fileList = JSON.parse(localStorage.getItem('fileList_'+path.basename(pakFile)));
								_this.itemDB = JSON.parse(localStorage.getItem('itemDB_'+path.basename(pakFile)));
								if (callback) {
									callback();
								}
							}
						});
						
					} else {
						localStorage.setItem('mtime_'+path.basename(pakFile), stats.mtime);
						_this.parse(pakFile, callback);
					}
				}
			});
		});
	}

	this.parse = function(pakFile, callback) {
		_this.buffer = new OffsetBuffer(75);
		var buffer = _this.buffer;
		fs.read(_this.fd,buffer.buf,0,buffer.buf.length,0,function(e,l,b){
			_this.header['version'] = buffer.buf.slice(0,6).toString();
			buffer.read_offset += 6;

			if ($.inArray(_this.header['version'], _this.versions) == -1) {
				console.log('Unsupported File Type');
				return false;
			}

			_this.header['header_size'] = buffer.readUInt32BE();
			_this.header['block_size'] = buffer.readUInt32BE();

			// Database Header
			buffer.read_offset = 32;
			_this.DBheader['type'] = buffer.buf.slice(buffer.read_offset,buffer.read_offset+12).toString().fulltrim();
			buffer.read_offset += 12;
			if (_this.DBheader['type'] != "BTreeDB4") {
				console.log('Invalid Database File Identifier: '+_this.DBheader['type']);
				return false;
			}

			_this.DBheader['content'] = buffer.buf.slice(buffer.read_offset,buffer.read_offset+12).toString().fulltrim();
			buffer.read_offset += 12;
			if (_this.DBheader['content'] != "Assets1") {
				//console.log('Invalid Database Content Identifier: ' + _this.DBheader['content']);
				//return false;
			}

			_this.DBheader['key_size'] = buffer.readUInt32BE();
			if (_this.DBheader['key_size'] != 32) {
				console.log('Invalid Database Key Size.');
				return false;
			}

			var useAltRoot = buffer.readUInt8();
			buffer.read_offset = (useAltRoot)?70:62;

			_this.DBheader['rootBlock'] = buffer.readUInt32BE();
			_this.DBheader['rootIsLeaf'] = buffer.readUInt8();

			_this.fileList = _this.getFileList();
			for (i in _this.fileList) {
				if (_this.fileList[i].indexOf('modinfo') != -1) {					
					try {
						var con = stripJsonComments(_this.getFile(_this.fileList[i]).buf.toString());
						modfile = JSON.parse(con.replace('[-.', '[-0.'));
						_this.modfile = modfile;
						console.log(_this.modfile);
					} catch (e) {}
					break;
				}
			}
			if (!_this.isMod) {
				$('#init_status').text('Building Item Database...');
			} else {
				$('#init_status').text('Building '+_this.modfile['name']+' Item Database...');
			}
			_this.createItemDB();

			var literate = function() {
				if (_this.itemDBLoaded == true) {
					window.clearInterval( l );
					localStorage.setItem('header_'+path.basename(pakFile), JSON.stringify(_this.header));
					localStorage.setItem('DBheader_'+path.basename(pakFile), JSON.stringify(_this.DBheader));
					localStorage.setItem('fileList_'+path.basename(pakFile), JSON.stringify(_this.fileList));
					localStorage.setItem('itemDB_'+path.basename(pakFile), JSON.stringify(_this.itemDB));

					if (callback != undefined) {
						callback();
					}
				}
			}
			var l = window.setInterval( literate, 10 );
		});
	}

	this.getFile = function(filename) {
		if ( !Buffer.isBuffer(_this.buffer.buf) ) {
			console.log('Error: No file opened!');
			return false;
		}


		if (_this.DBheader['content'] == "Assets1") {
			var shasum = sha(filename, { asBytes: true });
		} else {
			var shasum = c.createHash('sha256');
				shasum.update(filename);
				shasum = shasum.digest();
		}

		if (!_this.locateFile(new OffsetBuffer(shasum))) {
			return false;
		}

		//log('Found '+filename+' at: '+(_this.currentOffset + _this.buffer.read_offset));
		//x = true;
		return _this.readLeafData(_this.readVLQU());

	}

	this.getFileList = function() {
        var files = new Array();
		if ( !Buffer.isBuffer(_this.buffer.buf) ) {
			console.log('Error: No file opened!');
			return false;
		}

		var shasum = sha("_index", { asBytes: true });

		if (!_this.locateFile(new OffsetBuffer(shasum))) {
			console.log('Error: File table not found!');
			return false;
		}

        _this.readVLQU(); // Skip file size
        var numEntries = _this.readVLQU();

        for (var i = 0; i < numEntries; i++) {
        	var result = _this.readLeafData(_this.readVLQU());
        	if(_this.DBheader['content'] == "Assets2") {
        		_this.skipLeafData(33);
        	}
            files.push(result.buf.toString());
        }

        return files;
    }

    this.createItemDB = function() {
		if ( !Buffer.isBuffer(_this.buffer.buf) ) {
			console.log('Error: No file opened!');
			return false;
		}

		var i=0;
		var iterate = function() {
			// Patching this in to get namesources while loading items
			if ((_this.fileList[i].split('/'))[1] == "names" && path.extname(_this.fileList[i]) == '.namesource') {
				var content = _this.getFile(_this.fileList[i]);
				if (Buffer.isBuffer(content.buf)) {
					content = content.buf.toString();
					try
					{
						var json = parseJSON(stripJsonComments(content.replace('[-.', '[-0.')));
							json.dir = path.dirname(_this.fileList[i]);
						if (json.name) {
							NameSource[json.name] = json;
						}
					} catch(e) {
						console.log('Error reading file: '+_this.fileList[i]);
					}
				}
			}
			if ((_this.fileList[i].split('/'))[1] == "items" && $.inArray(path.extname(_this.fileList[i]), _this.ignoreItems) == -1) {

				var content = _this.getFile(_this.fileList[i]); 
				if (Buffer.isBuffer(content.buf)) {
					content = content.buf.toString();
					try
					{
						var json = parseJSON(stripJsonComments(content.replace('[-.', '[-0.')));
							json.dir = path.dirname(_this.fileList[i]);
						if (json.itemName) {
							_this.itemDB[json.itemName] = json;
						} else {
							_this.itemDB[path.basename(_this.fileList[i])] = json;
						}
					} catch(e) {
						console.log('Error reading file: '+_this.fileList[i]);
					}
				}

			}
			i++;
			if (!_this.isMod) {
				$('#init_status').html('Building Item Database...<br />'+Math.floor((i / _this.fileList.length)*100)+'%');
			} else {
				$('#init_status').html('Building '+_this.modfile['name']+' Item Database...<br />'+Math.floor((i / _this.fileList.length)*100)+'%');
			}
			if (i >= _this.fileList.length) {
				_this.itemDBLoaded = true;
			} else {
				global.setImmediate( iterate );
			}
		}

		global.setImmediate( iterate );
    }

    this.getItemData = function(itemName) {
		if ( !Buffer.isBuffer(_this.buffer.buf) ) {
			console.log('Error: No file opened!');
			return false;
		}

		if (_this.itemDB[itemName]) {
			return _this.itemDB[itemName];
		}

		for (var i in _this.itemDB) {
			var item = _this.itemDB[i];

			if (item.itemName == itemName) {
				return item;
			}
		}

		return false;
    }

    this.getItemData3 = function(itemName) {
		if ( !Buffer.isBuffer(_this.buffer.buf) ) {
			console.log('Error: No file opened!');
			return false;
		}

		console.log('Searching for '+itemName+'...');

    	_this.goToBlock(_this.DBheader['rootBlock']);

    	while(true) {
	        switch (_this.getCurrentBlockType())
	        {
		        case _this.BlockType.Index:
		            _this.searchIndex(itemName, _this.DBheader['rootBlock']);
		            break;
		        case _this.BlockType.Leaf:
		            return _this.searchLeaf(itemName);
		        case _this.BlockType.Unknown:
					throw new Error('Unknown Block Type Encountered');
	        }
		}

		return false;
    }

    this.searchIndex = function(itemName, selfIndex) {
    	//console.log('Searching index...');
	    var entries, left, right, indexKey, result;

	    _this.buffer.read_offset += 1;
	    entries = _this.buffer.readUInt32BE();
	    left = _this.buffer.readUInt32BE();

	    right = left;

	    //console.log('Found '+entries+' index entries.')

	    for (var i = 0; i != entries; i++) {
	        indexKey = _this.readKey();
	        right = _this.buffer.readUInt32BE();
	        var currentReadOffset = _this.buffer.read_offset;

            if (!_this.goToBlock(left)) {
                throw new Error("Invalid block referred to by index");
            }
			switch (_this.getCurrentBlockType())
	        {
		        case _this.BlockType.Index:
		            _this.searchIndex(itemName, left);
		            if (!_this.goToBlock(selfIndex, currentReadOffset)) {
		                throw new Error("fuq");
		            }
		            left = right;
		            break;
		        case _this.BlockType.Leaf:
		            result = _this.searchLeaf(itemName);
		            if (result) {
		            	return result;
		            }
		            if (!_this.goToBlock(selfIndex, currentReadOffset)) {
		                throw new Error("fuq");
		            }
		            left = right;
		            break;
		        case _this.BlockType.Unknown:
					throw new Error('Unknown Block Type Encountered');
	        }

	        left = right;
	    }

	    if (!_this.goToBlock(right)) {
	        throw new Error("Invalid block referred to by index");		
	    }
    }

    this.searchLeaf = function(itemName) {
 		var numEntries = _this.buffer.readUInt32BE();

	    for (var i = 0; i != numEntries; i++) {
	        var leafKey = _this.readKey();

	        var result = _this.searchLeafData(_this.readVLQU(), itemName);
	        if (result) {
	        	return result;
	        }
	        break;
	    }   	
	    return false;
    }

	this.getCurrentBlockType = function() {
	    var magic = _this.buffer.buf.slice(_this.buffer.read_offset,_this.buffer.read_offset+2).toString();
	    _this.buffer.read_offset += 2;

	    if (magic == "II") {
	        return _this.BlockType.Index;
	    } else if (magic == "LL") {
	        return _this.BlockType.Leaf;
	    }

	    return _this.BlockType.Unknown;
	}

	this.locateFile = function(key) {
    	_this.goToBlock(_this.DBheader['rootBlock']);

	    while (true)
	    {
	        switch (_this.getCurrentBlockType())
	        {
		        case _this.BlockType.Index:
		            _this.traverseIndex(key);
		            break;
		        case _this.BlockType.Leaf:
		            return _this.traverseLeaf(key);
		        case _this.BlockType.Unknown:
					throw new Error('Unknown Block Type Encountered');
	        }
	    }
	}

	this.traverseIndex = function(key) {
	    var entries, left, right, indexKey;

	    _this.buffer.read_offset += 1;
	    entries = _this.buffer.readUInt32BE();
	    left = _this.buffer.readUInt32BE();

	    right = left;

	    for (var i = 0; i != entries; i++) {
	        indexKey = _this.readKey();
	        right = _this.buffer.readUInt32BE();

	        if (_this.compareKey(indexKey, key) < 0) {
	            if (!_this.goToBlock(left)) {
	                throw new Error("Invalid block referred to by index");
	            }
	            return;
	        }

	        left = right;
	    }

	    if (!_this.goToBlock(right)) {
	        throw new Error("Invalid block referred to by index");		
	    }
	}

	this.traverseLeaf = function(key) {
	    var numEntries = _this.buffer.readUInt32BE();

	    for (var i = 0; i != numEntries; i++) {
	        var leafKey = _this.readKey();

	        if (_this.compareKey(leafKey, key) == 0) {
	            return true;
	        }

	        _this.skipLeafData(_this.readVLQU());
	    }

	    return false;		
	}

	this.leafDataRemaining = function() {
		var result = (_this.header['block_size'] - 4) - ((_this.currentOffset + _this.buffer.read_offset - _this.header['header_size']) % _this.header['block_size']);
        return result;
    }

	this.goToBlock = function(index, readO) {
		_this.buffer = new OffsetBuffer(_this.header['block_size']);
		_this.currentOffset = (index * _this.header['block_size'] + _this.header['header_size']);
		var result = fs.readSync(_this.fd, _this.buffer.buf, 0, _this.header['block_size'], (index * _this.header['block_size'] + _this.header['header_size']));
		if (readO !== undefined) {
			_this.buffer.read_offset = readO;
		}
		return result;
	}

	this.readLeafData = function(bytes) {
        var pos = 0;
        var data = new OffsetBuffer(bytes);

        if (x) { log('Reading '+bytes+' bytes at: '+(_this.currentOffset + _this.buffer.read_offset)); }

        while (true) {
            var remaining = _this.leafDataRemaining();
            if (bytes <= remaining)
            {
                data.copyFrom(_this.buffer.buf, _this.buffer.read_offset, _this.buffer.read_offset + bytes);
                _this.buffer.read_offset += bytes;
                return data;	
            }
            else
            {
                data.copyFrom(_this.buffer.buf, _this.buffer.read_offset, _this.buffer.read_offset + remaining);
                bytes -= remaining;
                _this.buffer.read_offset += remaining;

                var nextBlock = _this.buffer.readUInt32BE();
                if (nextBlock == -1) {
                    throw new Error("Premature end of leaf block");
                }

                if (!_this.goToBlock(nextBlock)) {
                    throw new Error("Invalid leaf block continuation index '"+nextBlock+"'");
                }

                if (_this.getCurrentBlockType() != _this.BlockType.Leaf) {
                    throw new Error("Invalid leaf block continuation");
                }
            }
        }
    }

	this.searchLeafData = function(bytes, itemName) {
        var pos = 0;
        var data = new OffsetBuffer(bytes);

        while (true) {
            var remaining = _this.leafDataRemaining();
            if (bytes <= remaining)
            {
                data.copyFrom(_this.buffer.buf, _this.buffer.read_offset, _this.buffer.read_offset + bytes);
                _this.buffer.read_offset += bytes;
                return false;
                var content = data.buf.toString();
                if (content.indexOf(itemName) == -1) {
                	return false;
                }
                try
                {
                	var json = parseJSON(content);
                } catch (e) {
                	return false;
                }
                if ((_.invert(json))[itemName] == "itemName") {
                	console.log('Found!');
                	return json;
                }
                return false;
            }
            else
            {
                data.copyFrom(_this.buffer.buf, _this.buffer.read_offset, _this.buffer.read_offset + remaining);
                bytes -= remaining;
                _this.buffer.read_offset += remaining;

                var nextBlock = _this.buffer.readUInt32BE();
                if (nextBlock == -1) {
                    throw new Error("Premature end of leaf block");
                }

                if (!_this.goToBlock(nextBlock)) {
                    throw new Error("Invalid leaf block continuation index '"+nextBlock+"'");
                }

                if (_this.getCurrentBlockType() != _this.BlockType.Leaf) {
                    throw new Error("Invalid leaf block continuation");
                }
            }
        }
    }

    this.skipLeafData = function(bytes) {

        while(true) {
            var remaining = _this.leafDataRemaining();
            if (bytes <= remaining)
            {
                _this.buffer.read_offset += bytes;
                return;
            }
            else
            {
                _this.buffer.read_offset += remaining;
                bytes -= remaining;

                var nextBlock = _this.buffer.readUInt32BE();
                if (nextBlock == -1) {
                    throw new Error("Premature end of leaf block");
                }

                if (!_this.goToBlock(nextBlock)) {
                    throw new Error("Invalid leaf block continuation index '"+nextBlock+"'");
                }

                if (_this.getCurrentBlockType() != _this.BlockType.Leaf) {
                    throw new Error("Invalid leaf block continuation");
                }
            }
        }
    }

    this.readVLQU = function() {
        var vlqu = 0;

        while(true) {
            if (_this.leafDataRemaining() == 0) {
                var nextBlock = _this.buffer.readUInt32BE();
                if (nextBlock == -1) {
                    throw new Error("Premature end of leaf block");
                }

                if (!_this.goToBlock(nextBlock)) {
                    throw new Error("Invalid leaf block continuation index '"+nextBlock+"'");
                }

                if (_this.getCurrentBlockType() != _this.BlockType.Leaf) {
                    throw new Error("Invalid leaf block continuation");
                }
            }

            var byte = _this.buffer.readUInt8();

            if (byte & 0x80)
            {
                vlqu |= (byte & 0x7F);
                vlqu <<= 7;
            }
            else
            {
                vlqu |= byte;
                return vlqu;
            }
        }
    }

	this.readKey = function() {
	    return _this.readLeafData(_this.DBheader['key_size']);
	}

	this.compareKey = function(key, target) {

		for (var i = 0, n = Math.min(key.buf.length, target.buf.length); i != n; i++) {
            if (target.buf[i] < key.buf[i]) {
                return -1;
            } else if (target.buf[i] > key.buf[i]) {
                return 1;
            }
        }

        return 0;
    }
}