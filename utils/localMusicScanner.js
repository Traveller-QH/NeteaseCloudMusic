/**
 * 本地音乐文件扫描工具
 * 支持 Android MediaStore API 扫描和文件 MD5 计算
 */

/**
 * 计算文件的 MD5 值（仅 App 端支持）
 * @param {String} filePath - 文件路径
 * @returns {Promise<String>} - MD5 值
 */
export const calculateFileMD5 = (filePath) => {
	return new Promise((resolve, reject) => {
		uni.getFileInfo({
			filePath,
			digestAlgorithm: 'md5',
			success: (res) => {
				// console.log('获取文件信息成功:', res);
				// console.log('文件大小：', res.size);
				// console.log('文件MD5：', res.digest);
				resolve(res.digest);
			},
			fail: (err) => {
				// console.error('获取文件信息失败:', err);
				reject(err);
			}
		});
	});
};

/**
 * 获取音频文件的元信息（标题、歌手、专辑、时长等）
 * @param {String} filePath - 文件路径
 * @returns {Promise<Object>} - 音频元信息
 */
export const getAudioMetadata = async (filePath) => {
	// #ifdef APP-PLUS
	return new Promise((resolve, reject) => {
		try {
			const context = plus.android.runtimeMainActivity();
			const mediaPlayer = plus.android.importClass('android.media.MediaPlayer');
			const mp = new mediaPlayer();
			
			// 设置数据源
			mp.setDataSource(filePath);
			mp.prepare();
			
			// 获取元数据
			const metadata = {
				title: mp.getMediaMetadataRetriever().extractMetadata(
					plus.android.importClass('android.media.MediaMetadataRetriever').METADATA_KEY_TITLE
				) || '',
				artist: mp.getMediaMetadataRetriever().extractMetadata(
					plus.android.importClass('android.media.MediaMetadataRetriever').METADATA_KEY_ARTIST
				) || '',
				album: mp.getMediaMetadataRetriever().extractMetadata(
					plus.android.importClass('android.media.MediaMetadataRetriever').METADATA_KEY_ALBUM
				) || '',
				duration: mp.getDuration() / 1000 // 毫秒转秒
			};
			
			mp.release();
			resolve(metadata);
		} catch (error) {
			console.error('获取音频元数据失败:', error);
			reject(error);
		}
	});
	// #endif
	
	// #ifndef APP-PLUS
	console.warn('H5 端不支持获取音频元数据');
	return Promise.resolve({ title: '', artist: '', album: '', duration: 0 });
	// #endif
};

/**
 * 扫描系统音乐文件 - 使用 MediaStore API
 * @returns {Promise<Array>} - 本地音乐文件列表
 */
export const scanSystemMusicFiles = () => {
	// #ifdef APP-PLUS
	return new Promise((resolve, reject) => {
		// 1. 检查 Android 版本和权限
		if (plus.os.name !== 'Android') {
			reject('仅支持 Android 平台');
			return;
		}

		// 动态申请权限（如果还没有）
		const androidVersion = parseInt(plus.os.version || '0');
		let permissionNeeded = '';
		if (androidVersion >= 33) {
			permissionNeeded = 'android.permission.READ_MEDIA_AUDIO';
		} else {
			permissionNeeded = 'android.permission.READ_EXTERNAL_STORAGE';
		}

		plus.android.requestPermissions(
			[permissionNeeded],
			(result) => {
				if (result.deniedAlways.length > 0) {
					reject('需要存储权限才能扫描本地音乐');
				} else {
					// 权限已授予，执行查询
					doQuery(resolve, reject);
				}
			},
			(err) => reject('权限申请失败：' + err)
		);
	});
	// #endif
	
	// #ifndef APP-PLUS
	console.warn('非 App 端不支持扫描本地音乐');
	return Promise.resolve([]);
	// #endif
};

/**
 * 执行 MediaStore 查询
 */
function doQuery(resolve, reject) {
	try {
		// 获取当前的 Activity（应用的主活动）
		const mainActivity = plus.android.runtimeMainActivity();
		// console.log('获取 mainActivity 成功:', mainActivity);

		// 获取 ContentResolver
		const contentResolver = mainActivity.getContentResolver();
		// console.log('获取 contentResolver 成功:', contentResolver);

		// 导入 MediaStore 类
		const MediaStore = plus.android.importClass('android.provider.MediaStore');
		const AudioMedia = MediaStore.Audio.Media;
		// console.log('导入 MediaStore 成功');

		// 构建查询 URI（外部存储的音频）
		const uri = AudioMedia.EXTERNAL_CONTENT_URI;
		// console.log('获取 URI 成功:', uri);

		// 需要查询的字段（使用 MediaStore 的常量）
		const projection = [
			AudioMedia._ID,
			AudioMedia.TITLE,
			AudioMedia.ARTIST,
			AudioMedia.ALBUM,
			AudioMedia.DURATION,
			AudioMedia.DATA,           // 文件路径
			AudioMedia.SIZE,
			AudioMedia.DATE_MODIFIED
		];
		// console.log('projection 数组:', projection);

		// 查询条件：只选择音乐文件
		const selection = AudioMedia.IS_MUSIC + " != 0";
		// console.log('selection:', selection);

		// 排序：按标题排序
		const sortOrder = AudioMedia.TITLE + " ASC";
		// console.log('sortOrder:', sortOrder);

		// 执行查询 - 使用 invoke 方法调用
		// console.log('准备调用 query 方法...');
		const cursor = plus.android.invoke(
			contentResolver,
			'query',
			uri,
			projection,
			selection,
			null,
			sortOrder
		);
		// console.log('query 调用成功，cursor:', cursor);

		const musicList = [];

		if (cursor) {
			try {
				// 获取各字段的索引 - 使用 invoke 方法
				const idIdx = plus.android.invoke(cursor, 'getColumnIndex', '_id');
				const titleIdx = plus.android.invoke(cursor, 'getColumnIndex', 'title');
				const artistIdx = plus.android.invoke(cursor, 'getColumnIndex', 'artist');
				const albumIdx = plus.android.invoke(cursor, 'getColumnIndex', 'album');
				const durationIdx = plus.android.invoke(cursor, 'getColumnIndex', 'duration');
				const dataIdx = plus.android.invoke(cursor, 'getColumnIndex', '_data');
				const sizeIdx = plus.android.invoke(cursor, 'getColumnIndex', '_size');

				// 遍历结果集 - 使用 invoke 方法
				while (plus.android.invoke(cursor, 'moveToNext')) {
					const filePath = plus.android.invoke(cursor, 'getString', dataIdx);
					if (!filePath) continue;

					const song = {
						id: 'local_' + plus.android.invoke(cursor, 'getLong', idIdx),
						name: plus.android.invoke(cursor, 'getString', titleIdx) || '未知歌曲',
						artist: plus.android.invoke(cursor, 'getString', artistIdx) || '未知歌手',
						album: plus.android.invoke(cursor, 'getString', albumIdx) || '',
						duration: plus.android.invoke(cursor, 'getLong', durationIdx) / 1000, // 毫秒转秒
						localPath: filePath,
						size: plus.android.invoke(cursor, 'getLong', sizeIdx),
						isLocalFile: true
					};
					musicList.push(song);
				}
			} finally {
				// 关闭游标 - 使用 invoke 方法
				plus.android.invoke(cursor, 'close');
				// console.log('cursor 已关闭');
			}
		}

		// console.log(`扫描完成，共找到 ${musicList.length} 首歌曲`);
		resolve(musicList);

	} catch (error) {
		console.error('MediaStore 查询失败:', error);
		console.error('错误堆栈:', error.stack);
		reject(error);
	}
}

/**
 * 从文件名解析歌曲信息（格式：歌曲名 - 歌手名.mp3）
 * @param {String} fileName - 文件名
 * @returns {Object} - 解析结果
 */
export const parseFileName = (fileName) => {
	if (!fileName) return { title: '', artist: '' };
	
	// 去除扩展名
	const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
	
	// 尝试按 "歌曲名 - 歌手名" 格式解析
	const parts = nameWithoutExt.split('-');
	if (parts.length >= 2) {
		// 最后一部分是歌手名，前面的是歌曲名
		const artist = parts.pop().trim();
		const title = parts.join('-').trim();
		return { title, artist };
	}
	
	// 无法解析，返回空
	return { title: nameWithoutExt.trim(), artist: '' };
};

/**
 * 为本地歌曲匹配网易云音乐信息
 * @param {Object} song - 本地歌曲对象
 * @param {Function} matchApi - 匹配接口函数
 * @returns {Promise<Object>} - 匹配后的歌曲信息
 */
export const matchSongInfo = async (song, matchApi) => {
	try {
		// #ifdef APP-PLUS
		// 从文件名解析歌曲名和歌手名
		const fileName = song.localPath ? song.localPath.split('/').pop() : '';
		const parsed = parseFileName(fileName);
		
		// 如果文件名解析失败，使用元数据
		let title = parsed.title || song.name || '';
		let artist = parsed.artist || song.artist || '';

		// 清理无效的歌手名
		if (artist === '<unknown>' || !artist || artist.trim() === '') {
			artist = '';
		}

		// 可选：清理标题中的无效值（如果你的数据中也可能出现）
		if (title === '<unknown>') {
			title = '';
		}

		// 计算文件 MD5
		let md5 = '';
		try {
			md5 = await calculateFileMD5(song.localPath);
			// console.log(`MD5 计算完成：${md5}`);
		} catch (error) {
			console.warn(`MD5 计算失败：${song.localPath}`, error);
		}
		
		// 准备匹配参数（不发送 album 参数）
		const params = {
			title: title || '',
			artist: artist || '',
			// album: '',
			duration: parseFloat((song.duration || 0).toFixed(2)), // 保留两位小数
			md5: md5
		};
		
		// console.log(`正在匹配歌曲：${params.title} - ${params.artist}, 时长：${params.duration}s, MD5:${params.md5 || ''}`);
		// console.log(`请求参数:`, JSON.stringify(params));
		
		// 调用匹配接口
		const result = await matchApi(params);
		// console.log('匹配接口返回:', result);
		
		if (result.code === 200 && result.result && result.result.songs && result.result.songs.length > 0) {
			// 匹配成功，返回第一首匹配的歌曲
			const matchedSong = result.result.songs[0];
			// console.log(`匹配成功：${matchedSong.name}`);
			
			// 合并本地信息和在线信息
			return {
				...song,
				id: matchedSong.id, // 更新为网易云音乐 ID
				name: matchedSong.name || song.name,
				artists: matchedSong.artists || [{ name: song.artist || '未知歌手' }],
				album: matchedSong.album || { name: song.album || '' },
				albumPic: matchedSong.album?.picUrl || '',
				matchSuccess: true
			};
		} else {
			// 匹配失败，保持原有信息
			// console.log(`匹配失败：${params.title}, 原因：`, result);
			return {
				...song,
				matchSuccess: false
			};
		}
		// #endif
		
		// #ifndef APP-PLUS
		console.warn('非 App 端不支持匹配');
		return {
			...song,
			matchSuccess: false
		};
		// #endif
	} catch (error) {
		console.error('匹配歌曲信息失败:', error);
		return {
			...song,
			matchSuccess: false
		};
	}
};

/**
 * 批量扫描并匹配本地歌曲
 * @param {Array} localSongs - 本地歌曲列表
 * @param {Function} matchApi - 匹配接口函数
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<Array>} - 匹配后的歌曲列表
 */
export const batchMatchSongs = async (localSongs, matchApi, onProgress) => {
	const matchedSongs = [];
	const total = localSongs.length;
	
	for (let i = 0; i < total; i++) {
		const song = localSongs[i];
		
		try {
			// 尝试匹配歌曲信息
			const matchedSong = await matchSongInfo(song, matchApi);
			matchedSongs.push(matchedSong);
			
			// 通知进度
			if (onProgress) {
				onProgress({
					current: i + 1,
					total: total,
					percent: Math.round(((i + 1) / total) * 100)
				});
			}
		} catch (error) {
			console.error(`匹配第 ${i + 1} 首歌曲失败:`, error);
			matchedSongs.push(song);
		}
		
		// 添加延迟避免请求过快
		if (i < total - 1) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}
	
	return matchedSongs;
};

export default {
	calculateFileMD5,
	getAudioMetadata,
	scanSystemMusicFiles,
	matchSongInfo,
	batchMatchSongs
};
