/**
 * 全局音乐播放状态管理
 */
import { reactive, ref, computed } from 'vue'
import { getSongDetail, getSongUrl, getLyric, getSongComment, getSongRedCount, toggleSongLike, checkSongLike } from './api.js'

// 当前播放请求ID，用于处理并发播放请求
let currentPlayId = 0

// 预加载的歌曲列表数据 (用于存储完整的歌单信息，支持懒加载)
const preloadPlaylistData = {
	playlistId: null, // 歌单 ID
	totalCount: 0,    // 总歌曲数
	songs: [],        // 已加载的歌曲
	hasMore: false,   // 是否还有更多歌曲
	loadAllPromise: null, // 加载全部歌曲的 Promise
	isLoadingAll: false // 是否正在加载全部歌曲
}

// 音频播放器管理器
const AudioPlayerManager = (() => {
	let audioContext = null
	let currentPlayId = 0
	let isPlaying = false
	let pendingPlayPromise = null
	
	// 初始化音频实例
	const initAudio = () => {
		if (audioContext) return audioContext
		
		audioContext = uni.createInnerAudioContext()
		
		// 监听播放事件
		audioContext.onPlay(() => {
			isPlaying = true
			state.isPlaying = true
		})
		
		// 监听暂停事件
		audioContext.onPause(() => {
			isPlaying = false
			state.isPlaying = false
		})
		
		// 监听停止事件
		audioContext.onStop(() => {
			isPlaying = false
			state.isPlaying = false
			state.currentTime = 0
		})
		
		// 监听播放结束
		audioContext.onEnded(() => {
			isPlaying = false
			state.isPlaying = false
			state.currentTime = 0
			
			// 根据循环模式决定是否播放下一首
			if (state.playMode === 'single') {
				// 单曲循环，重新播放当前歌曲
				if (state.songUrl) {
					audioContext.play()
				}
			} else {
				// 列表循环或随机播放，播放下一首
				playNext()
			}
		})
		
		// 监听时间更新
		audioContext.onTimeUpdate(() => {
			state.currentTime = audioContext.currentTime || 0
			state.duration = audioContext.duration || 0
			// 更新当前歌词索引
			updateCurrentLyricIndex()
		})
		
		// 监听可播放
		audioContext.onCanplay(() => {
			state.duration = audioContext.duration || 0
			state.loading = false
		})
		
		// 监听错误
		audioContext.onError((err) => {
			console.error('音频播放错误:', err)
			isPlaying = false
			state.isPlaying = false
			state.loading = false
		})
		
		return audioContext
	}
	
	// 安全播放
	const safePlay = async (url) => {
		const audio = initAudio()
		const playId = ++currentPlayId
		let playPromise = null
		
		// 如果有正在等待的播放Promise，先取消它
		if (pendingPlayPromise) {
			// console.log('取消之前的播放请求')
		}
		
		// 如果正在播放，先停止
		if (isPlaying) {
			audio.stop()
		}
		
		// 设置新的播放源
		audio.src = url
		
		try {
			// 创建播放Promise
			playPromise = audio.play()
			pendingPlayPromise = playPromise
			
			if (playPromise !== undefined) {
				await playPromise
				
				// 检查是否还是当前的播放请求
				if (playId === currentPlayId) {
					// console.log('音频播放成功')
					isPlaying = true
					state.isPlaying = true
				} else {
					// console.log('播放成功但已被新请求取代')
				}
			}
		} catch (error) {
			// 检查是否还是当前的播放请求
			if (playId !== currentPlayId) {
				// console.log('播放错误已被新请求取代，忽略')
				return
			}
			
			// 处理具体的错误类型
			if (error.name === 'AbortError') {
				// console.log('播放被新请求中断，已忽略')
				return
			}
			
			if (error.name === 'NotAllowedError') {
				console.warn('浏览器需要用户交互才能播放音频')
				state.isPlaying = false
				isPlaying = false
				return
			}
			
			console.error('播放失败:', error)
			state.isPlaying = false
			isPlaying = false
		} finally {
			// 清理pending状态
			if (pendingPlayPromise && playPromise && pendingPlayPromise === playPromise) {
				pendingPlayPromise = null
			}
		}
	}
	
	// 停止播放
	const stop = () => {
		if (audioContext) {
			audioContext.stop()
		}
		isPlaying = false
		state.isPlaying = false
		state.currentTime = 0
		currentPlayId++ // 增加ID来取消任何pending的播放请求
	}
	
	// 暂停播放
	const pause = () => {
		if (audioContext && isPlaying) {
			audioContext.pause()
		}
	}
	
	// 恢复播放
	const resume = () => {
		if (audioContext && state.songUrl) {
			audioContext.play()
		}
	}
	
	// 跳转时间
	const seek = (time) => {
		if (audioContext) {
			audioContext.seek(time)
			state.currentTime = time
		}
	}
	
	return {
		initAudio,
		safePlay,
		stop,
		pause,
		resume,
		seek,
		get isPlaying() { return isPlaying },
		get currentPlayId() { return currentPlayId }
	}
})()

// 音频实例
let audioContext = null

// 音质等级映射（从低到高）
const qualityLevels = [
	{ level: 'standard', name: '标准', icon: '标', description: '128kbps' },
	{ level: 'higher', name: '较高 High', icon: 'HI', description: '较标准音质更丰富的细节体验，最高 192kbps' },
	{ level: 'exhigh', name: '极高 HQ', icon: 'HQ', description: '近 CD 音质的细节体验，最高 320kbps' },
	{ level: 'lossless', name: '无损 SQ', icon: 'SQ', description: '高保真无损音质，最高 48kHz/16bit' },
	{ level: 'hires', name: '高解析度无损 Hi-Res', icon: 'H', description: '更饱满清晰的高解析度音质，192kHz/24bit' },
	{ level: 'jyeffect', name: '高清臻音 Spatial Audio', icon: 'SP', description: '高频细节还原与清晰沉浸感，96kHz/24bit' },
	{ level: 'sky', name: '沉浸环绕音 Surround Sound', icon: 'SU', description: '环绕音感 最高 5.1 声道' },
	{ level: 'dolby', name: '杜比全景音 Dolby Atmos', icon: 'DA', description: '沉浸三维空间音频，最高 7.1.4 声道' },
	{ level: 'jymaster', name: '超清母带 Master', icon: 'M', description: '极致细节 192kHz/24bit' }
]

// 全局音质设置（持久化存储）
const GLOBAL_QUALITY_KEY = 'netease_music_global_quality'

// 获取全局音质设置
const getGlobalQuality = () => {
	// 优先使用本地存储的设置，如果没有则使用默认值
	try {
		const saved = uni.getStorageSync(GLOBAL_QUALITY_KEY)
		if (saved && qualityLevels.some(q => q.level === saved)) {
			return saved
		}
	} catch (error) {
		console.warn('读取全局音质设置失败:', error)
	}
	return 'standard' // 默认标准音质
}

// 保存全局音质设置
const saveGlobalQuality = (level) => {
	try {
		uni.setStorageSync(GLOBAL_QUALITY_KEY, level)
		console.log('全局音质设置已保存:', level)
	} catch (error) {
		console.error('保存全局音质设置失败:', error)
	}
}

// 全局音乐状态
const state = reactive({
	// 当前歌曲信息
	currentSong: null,
	// 播放状态
	isPlaying: false,
	// 当前播放时间 (秒)
	currentTime: 0,
	// 总时长 (秒)
	duration: 0,
	// 播放地址
	songUrl: '',
	// 加载状态
	loading: false,
	// 歌词列表 [{time: 秒数，text: '歌词内容'}]
	lyrics: [],
	// 当前歌词索引
	currentLyricIndex: 0,
	// 评论数量
	commentCount: 0,
	// 红心数量
	redCount: 0,
	// 红心数量描述 (后端返回的格式化字符串)
	redCountDesc: '0',
	// 歌曲是否被喜欢
	isLiked: false,
	// 当前音质等级
	currentQuality: getGlobalQuality(), // 初始化时使用全局设置
	// 可用音质列表
	availableQualities: [],
	// 播放列表
	playlist: [],
	// 播放列表中当前播放歌曲的索引
	playlistIndex: -1,
	// 循环模式:'list'(列表循环),'single'(单曲循环),'random'(随机播放)
	playMode: 'list',
	// 播放历史栈 (记录随机播放时的路径，用于上一首功能)
	playHistory: [],
})

// 歌曲名称
const songName = computed(() => state.currentSong?.name || '')

// 歌手名称
const artistNames = computed(() => {
	const artists = state.currentSong?.ar || state.currentSong?.artists || []
	if (!artists.length) return ''
	return artists.map(a => a.name).join(' / ')
})

// 专辑封面
const albumCover = computed(() => {
	const al = state.currentSong?.al || state.currentSong?.album
	return al?.picUrl || ''
})

// 播放进度百分比
const progress = computed(() => {
	if (!state.duration) return 0
	return (state.currentTime / state.duration) * 100
})

// 格式化时间
const formatTime = (seconds) => {
	if (!seconds || isNaN(seconds)) return '00:00'
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 当前时间格式化
const currentTimeStr = computed(() => formatTime(state.currentTime))

// 总时长格式化
const durationStr = computed(() => formatTime(state.duration))

// 评论数量格式化
const commentCountStr = computed(() => {
	const count = state.commentCount
	if (!count) return '0'
	
	// 小于 1000，显示实际数字
	if (count < 1000) {
		return count.toString()
	}
	
	// 大于等于 1000，以万为单位向下取整
	const wanCount = Math.floor(count / 10000)
	if (wanCount >= 1) {
		return `${wanCount}w+`
	}
	
	// 1000-9999 之间，显示 999+
	return '999+'
})

// 红心数量格式化（直接使用后端返回的 countDesc）
const redCountStr = computed(() => {
	return state.redCountDesc || '0'
})

// 初始化音频实例
const initAudio = () => {
	return AudioPlayerManager.initAudio()
}

// 播放歌曲（通过歌曲id）
const playSongById = async (id) => {
	if (!id) return
	
	// 生成新的播放请求ID
	const requestId = ++currentPlayId
	
	state.loading = true
	state.lyrics = []
	state.currentLyricIndex = 0
	state.commentCount = 0
	state.redCount = 0
	
	try {
		// 获取歌曲详情
		const detailRes = await getSongDetail(id)
		if (detailRes.code === 200 && detailRes.songs && detailRes.songs.length > 0) {
			state.currentSong = detailRes.songs[0]
					
			// 从 privileges 中获取音质信息
			if (detailRes.privileges && detailRes.privileges.length > 0) {
				const privilege = detailRes.privileges[0]
				// 使用 maxBrLevel 获取最高音质等级
				const maxLevel = privilege.maxBrLevel || privilege.playMaxBrLevel || 'standard'
				// 根据最高音质生成可用音质列表（从低到高）
				generateAvailableQualities(maxLevel)
			} else {
				// 如果没有返回 privileges，使用默认列表
				state.availableQualities = [...qualityLevels].reverse()
			}
		}
				
		// 检查是否是最新的请求
		if (requestId !== currentPlayId) {
			// console.log('有新的播放请求，取消当前请求')
			state.loading = false
			return
		}
				
		// 获取歌词
		fetchLyric(id)
		
		// 获取评论数量
		fetchCommentCount(id)
		
		// 获取红心数量
		fetchRedCount(id)
		
		// 检查喜欢状态
		checkLikeStatus(id)
		
		// 获取播放地址（使用全局音质设置）
		const urlRes = await getSongUrl(id, state.currentQuality)
		
		// 再次检查是否是最新的请求
		if (requestId !== currentPlayId) {
			// console.log('有新的播放请求，取消当前请求')
			state.loading = false
			return
		}
		
		if (urlRes.code === 200 && urlRes.data && urlRes.data.length > 0) {
			const url = urlRes.data[0].url
			if (url) {
				state.songUrl = url
				// 播放音乐
				playMusic(url)
			} else {
				console.error('获取播放地址失败：无有效URL')
				state.loading = false
			}
		}
	} catch (error) {
		// 检查是否是最新的请求
		if (requestId !== currentPlayId) {
			// console.log('有新的播放请求，忽略错误')
			return
		}
		
		console.error('播放歌曲失败:', error)
		state.loading = false
	}
}

// 获取歌词
const fetchLyric = async (id) => {
	try {
		const res = await getLyric(id)
		if (res.code === 200 && res.lrc && res.lrc.lyric) {
			state.lyrics = parseLyric(res.lrc.lyric)
		}
	} catch (error) {
		console.error('获取歌词失败:', error)
	}
}

// 根据最高音质生成可用音质列表
const generateAvailableQualities = (maxLevel) => {
	// 找到最高音质的索引
	const maxIndex = qualityLevels.findIndex(q => q.level === maxLevel)
	
	if (maxIndex === -1) {
		// 如果找不到，使用默认列表
		state.availableQualities = [...qualityLevels].reverse()
		return
	}
	
	// 截取从 0 到最高音质的部分，然后反转（从高到低显示）
	state.availableQualities = qualityLevels.slice(0, maxIndex + 1).reverse()
}

// 切换音质（用于当前歌曲）
const switchQuality = async (newLevel) => {
	if (!state.currentSong?.id || newLevel === state.currentQuality) return
	
	try {
		state.loading = true
		
		// 获取新音质的 URL
		const urlRes = await getSongUrl(state.currentSong.id, newLevel)
		
		if (urlRes.code === 200 && urlRes.data && urlRes.data.length > 0) {
			const url = urlRes.data[0].url
			if (url) {
				// 保存当前播放进度
				const currentTime = state.currentTime
				
				// 更新音质和 URL
				state.currentQuality = newLevel
				state.songUrl = url
				
				// 重新播放
				await AudioPlayerManager.safePlay(url)
				
				// 恢复到之前的播放进度
				AudioPlayerManager.seek(currentTime)
				
				state.loading = false
				return true
			}
		}
		
		state.loading = false
		return false
	} catch (error) {
		console.error('切换音质失败:', error)
		state.loading = false
		return false
	}
}

// 切换全局音质（用于侧边栏设置）
const switchGlobalQuality = async (newLevel) => {
	if (newLevel === state.currentQuality) {
		// 如果切换的是当前音质，直接保存设置
		saveGlobalQuality(newLevel)
		return true
	}
	
	// 保存全局设置
	saveGlobalQuality(newLevel)
	
	// 如果当前有歌曲正在播放，重新获取播放地址
	if (state.currentSong?.id && state.songUrl) {
		try {
			state.loading = true
			
			// 根据歌曲的最高音质调整实际使用的音质
			let actualLevel = newLevel
			
			// 检查当前歌曲是否支持选择的音质
			if (state.availableQualities.length > 0) {
				const highestQuality = state.availableQualities[0]?.level // 最高音质在第一个
				const qualityIndex = qualityLevels.findIndex(q => q.level === newLevel)
				const highestIndex = qualityLevels.findIndex(q => q.level === highestQuality)
				
				// 如果选择的音质高于歌曲最高音质，则降级到歌曲最高音质
				if (qualityIndex > highestIndex) {
					actualLevel = highestQuality
					console.log(`音质降级：${newLevel} -> ${actualLevel}（歌曲最高音质）`)
				}
			}
			
			// 获取新音质的 URL
			const urlRes = await getSongUrl(state.currentSong.id, actualLevel)
			
			if (urlRes.code === 200 && urlRes.data && urlRes.data.length > 0) {
				const url = urlRes.data[0].url
				if (url) {
					// 保存当前播放进度
					const currentTime = state.currentTime
					const wasPlaying = state.isPlaying
					
					// 更新音质和 URL
					state.currentQuality = actualLevel
					state.songUrl = url
					
					// 如果之前正在播放，重新播放
					if (wasPlaying) {
						await AudioPlayerManager.safePlay(url)
						AudioPlayerManager.seek(currentTime)
					}
					
					state.loading = false
					return true
				}
			}
			
			state.loading = false
			return false
		} catch (error) {
			console.error('切换全局音质失败:', error)
			state.loading = false
			return false
		}
	}
	
	// 如果没有歌曲在播放，只需更新当前音质设置
	state.currentQuality = newLevel
	return true
}

// 获取评论数量
const fetchCommentCount = async (id) => {
	try {
		// 只获取 1 条评论，主要是为了获取 total 字段
		const res = await getSongComment(id, 1, 0)
		if (res.code === 200) {
			state.commentCount = res.total || 0
		}
	} catch (error) {
		console.error('获取评论数量失败:', error)
		state.commentCount = 0
	}
}

// 获取红心数量
const fetchRedCount = async (id) => {
	try {
		const res = await getSongRedCount(id)
		if (res.code === 200 && res.data) {
			state.redCount = res.data.count || 0
			state.redCountDesc = res.data.countDesc || '0'
		}
	} catch (error) {
		console.error('获取红心数量失败:', error)
		state.redCount = 0
		state.redCountDesc = '0'
	}
}

// 检查歌曲是否被喜欢
const checkLikeStatus = async (id) => {
	try {
		const res = await checkSongLike(id)
		// console.log('检查喜欢状态接口返回:', res)
		if (res.code === 200) {
			// 如果返回的 ids 数组包含该歌曲 id，说明已被喜欢
			// 如果没有喜欢的歌曲，ids 数组为空或者不包含当前 id
			const likedIds = res.ids || []
			// 转为数字类型进行比较，避免类型不匹配的问题
			const songId = Number(id)
			state.isLiked = likedIds.some(likedId => Number(likedId) === songId)
			// console.log(`歌曲${id}的喜欢状态:`, state.isLiked ? '已喜欢' : '未喜欢', 'likedIds:', likedIds, 'songId:', songId)
		} else {
			state.isLiked = false
			// console.log('检查喜欢状态失败，code:', res.code)
		}
	} catch (error) {
		console.error('检查喜欢状态失败:', error)
		state.isLiked = false
	}
}

// 切换喜欢状态
const toggleLike = async (id) => {
	try {
		// 切换当前状态
		const newLikeState = !state.isLiked
		// console.log('切换喜欢状态，当前状态:', state.isLiked ? '已喜欢' : '未喜欢', '目标状态:', newLikeState ? '已喜欢' : '未喜欢')
		const res = await toggleSongLike(id, newLikeState)
		// console.log('切换喜欢状态接口返回:', res)
		
		if (res.code === 200) {
			// 喜欢成功，更新状态
			state.isLiked = newLikeState
			// console.log('切换喜欢状态成功，新状态:', state.isLiked ? '已喜欢' : '未喜欢')
			return true
		} else {
			console.error('喜欢操作失败:', res)
			return false
		}
	} catch (error) {
		console.error('切换喜欢状态失败:', error)
		return false
	}
}

// 解析歌词（LRC格式）
const parseLyric = (lrcText) => {
	if (!lrcText) return []
	
	const lines = lrcText.split('\n')
	const lyrics = []
	// 匹配 [mm:ss.xx] 或 [mm:ss:xx] 格式
	const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g
	
	for (const line of lines) {
		// 获取所有时间标签
		const times = []
		let match
		while ((match = timeRegex.exec(line)) !== null) {
			const minutes = parseInt(match[1])
			const seconds = parseInt(match[2])
			const milliseconds = parseInt(match[3])
			// 转换为秒数
			const time = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1000 : 100)
			times.push(time)
		}
		
		// 获取歌词文本（移除时间标签）
		const text = line.replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g, '').trim()
		
		// 添加歌词
		if (text) {
			for (const time of times) {
				lyrics.push({ time, text })
			}
		}
	}
	
	// 按时间排序
	lyrics.sort((a, b) => a.time - b.time)
	
	return lyrics
}

// 更新当前歌词索引
const updateCurrentLyricIndex = () => {
	const { lyrics, currentTime } = state
	if (!lyrics.length) return
	
	// 查找当前时间对应的歌词
	let index = 0
	for (let i = 0; i < lyrics.length; i++) {
		if (lyrics[i].time <= currentTime) {
			index = i
		} else {
			break
		}
	}
	
	if (state.currentLyricIndex !== index) {
		state.currentLyricIndex = index
	}
}

// 获取音质等级显示名称
const getQualityName = (level) => {
	const quality = qualityLevels.find(q => q.level === level)
	return quality ? quality.name : level
}

// 获取音质图标
const getQualityIcon = (level) => {
	const quality = qualityLevels.find(q => q.level === level)
	return quality ? quality.icon : '标'
}

// 获取音质描述
const getQualityDescription = (level) => {
	const quality = qualityLevels.find(q => q.level === level)
	return quality ? quality.description : ''
}

// 获取音质等级映射
const getQualityLevel = (level) => {
	return qualityLevels.find(q => q.level === level) || null
}

// 播放音乐（通过 URL）
const playMusic = (url) => {
	AudioPlayerManager.safePlay(url)
}

// 播放/暂停切换
const togglePlay = () => {
	if (AudioPlayerManager.isPlaying) {
		AudioPlayerManager.pause()
	} else {
		if (state.songUrl) {
			AudioPlayerManager.resume()
		}
	}
}

// 播放
const play = () => {
	if (state.songUrl) {
		AudioPlayerManager.resume()
	}
}

// 暂停
const pause = () => {
	AudioPlayerManager.pause()
}

// 停止
const stop = () => {
	AudioPlayerManager.stop()
	state.currentTime = 0
}

// 跳转到指定时间
const seekTo = (time) => {
	AudioPlayerManager.seek(time)
	state.currentTime = time
}

// 设置进度 (百分比 0-100)
const setProgress = (percent) => {
	if (!state.duration) return
	const time = (percent / 100) * state.duration
	seekTo(time)
}

// 设置播放列表
const setPlaylist = (songs, currentSongId = null, preserveCurrentPlay = false) => {
	if (!songs || !Array.isArray(songs) || songs.length === 0) {
		console.warn('播放列表不能为空')
		return false
	}
	
	// 如果需要保留当前播放状态
	let shouldResumePlay = false
	let resumeTime = 0
	let resumePlaying = false
	
	if (preserveCurrentPlay && state.currentSong) {
		shouldResumePlay = true
		resumeTime = state.currentTime
		resumePlaying = state.isPlaying
	}
	
	state.playlist = songs
	
	// 如果指定了当前歌曲，设置播放索引
	if (currentSongId) {
		const index = songs.findIndex(s => String(s.id) === String(currentSongId))
		if (index !== -1) {
			state.playlistIndex = index
		} else {
			// 如果找不到，默认播放第一首
			state.playlistIndex = 0
		}
	} else {
		// 否则默认播放第一首
		state.playlistIndex = 0
	}
	
	// 清空播放历史（如果是保留当前播放状态，则不清空）
	if (!preserveCurrentPlay) {
		state.playHistory = []
	}
	
	// 如果需要保留当前播放状态，恢复播放进度
	if (shouldResumePlay && state.currentSong) {
		// 确保当前歌曲在播放列表中
		const currentIndex = state.playlist.findIndex(s => String(s.id) === String(state.currentSong.id))
		if (currentIndex !== -1) {
			state.playlistIndex = currentIndex
		}
		
		// 恢复播放进度
		setTimeout(() => {
			AudioPlayerManager.seek(resumeTime)
			// 如果之前在播放，继续播放
			if (resumePlaying) {
				AudioPlayerManager.resume()
			}
		}, 100)
	}
	
	return true
}

// 添加到播放列表 (在当前播放歌曲的下一首位置添加)
const addToPlaylist = (song) => {
	if (!song || !song.id) {
		console.warn('歌曲信息无效')
		return false
	}
	
	// 检查是否已在播放列表中
	const existingIndex = state.playlist.findIndex(s => String(s.id) === String(song.id))
	if (existingIndex !== -1) {
		// 已存在，直接切换到该歌曲
		state.playlistIndex = existingIndex
		state.currentSong = song
		playSongById(song.id)
		return true
	}
	
	// 在当前位置的下一首添加
	const insertIndex = state.playlistIndex + 1
	state.playlist.splice(insertIndex, 0, song)
	state.playlistIndex = insertIndex
	state.currentSong = song
	playSongById(song.id)
	
	return true
}

// 从播放列表中移除歌曲
const removeFromPlaylist = (songId) => {
	if (!songId) return false
	
	const index = state.playlist.findIndex(s => String(s.id) === String(songId))
	if (index === -1) return false
	
	// 如果移除的是当前播放的歌曲
	if (index === state.playlistIndex) {
		// 如果还有下一首，播放下一首
		if (state.playlist.length > index + 1) {
			const nextSong = state.playlist[index + 1]
			state.playlist.splice(index, 1)
			state.playlistIndex = index
			state.currentSong = nextSong
			playSongById(nextSong.id)
		} else if (state.playlist.length > 1) {
			// 如果是最后一首，播放上一首
			state.playlist.splice(index, 1)
			state.playlistIndex = Math.max(0, index - 1)
			const prevSong = state.playlist[state.playlistIndex]
			state.currentSong = prevSong
			playSongById(prevSong.id)
		} else {
			// 只剩这一首，停止播放
			state.playlist.splice(index, 1)
			state.playlistIndex = -1
			state.currentSong = null
			stop()
		}
	} else {
		// 移除的不是当前播放的歌曲
		state.playlist.splice(index, 1)
		// 如果移除的歌曲在当前播放歌曲之前，需要调整索引
		if (index < state.playlistIndex) {
			state.playlistIndex--
		}
	}
	
	return true
}

// 清空播放列表
const clearPlaylist = () => {
	state.playlist = []
	state.playlistIndex = -1
	state.currentSong = null
	state.playHistory = [] // 清空历史记录
	stop()
}

// 播放播放列表中的指定歌曲
const playFromPlaylist = (index, isHistoryOperation = false) => {
	if (index < 0 || index >= state.playlist.length) {
		console.warn('无效的播放索引')
		return false
	}
	
	// 将当前索引添加到历史记录 (如果不是随机播放模式，不需要记录；如果是历史操作，也不需要再记录)
	if (state.playMode === 'random' && state.playlistIndex >= 0 && !isHistoryOperation) {
		state.playHistory.push(state.playlistIndex)
	}
	
	state.playlistIndex = index
	const song = state.playlist[index]
	state.currentSong = song
	playSongById(song.id)
	
	return true
}

// 播放下一首
const playNext = () => {
	if (state.playlist.length === 0) return false
	
	let nextIndex
	
	if (state.playMode === 'random') {
		// 随机播放 - 每次都随机选择一首
		nextIndex = Math.floor(Math.random() * state.playlist.length)
	} else if (state.playMode === 'single') {
		// 单曲循环，重新播放当前歌曲
		nextIndex = state.playlistIndex
	} else {
		// 列表循环
		nextIndex = state.playlistIndex + 1
		if (nextIndex >= state.playlist.length) {
			nextIndex = 0 // 循环到第一首
		}
	}
	
	return playFromPlaylist(nextIndex)
}

// 播放上一首
const playPrevious = () => {
	if (state.playlist.length === 0) return false
	
	let prevIndex
	
	if (state.playMode === 'random') {
		// 随机播放模式下，从历史记录中返回上一首
		if (state.playHistory.length > 0) {
			// 从历史栈中弹出上一个索引
			prevIndex = state.playHistory.pop()
			// 直接设置状态并播放，标记为历史操作，避免再次记录历史
			state.playlistIndex = prevIndex
			const song = state.playlist[prevIndex]
			state.currentSong = song
			playSongById(song.id)
			return true
		} else {
			// 没有历史记录，随机播放一首
			prevIndex = Math.floor(Math.random() * state.playlist.length)
		}
	} else {
		// 列表循环或单曲循环
		prevIndex = state.playlistIndex - 1
		if (prevIndex < 0) {
			prevIndex = state.playlist.length - 1 // 循环到最后一首
		}
	}
	
	return playFromPlaylist(prevIndex)
}

// 切换循环模式
const togglePlayMode = () => {
	const modes = ['list', 'single', 'random']
	const currentIndex = modes.indexOf(state.playMode)
	const nextIndex = (currentIndex + 1) % modes.length
	state.playMode = modes[nextIndex]
	return state.playMode
}

// 获取预加载数据
const getPreloadData = () => preloadPlaylistData

// 设置预加载数据
const setPreloadData = (data) => {
	if (data && typeof data === 'object') {
		Object.assign(preloadPlaylistData, data)
	}
}

// 重置预加载数据
const resetPreloadData = () => {
	preloadPlaylistData.playlistId = null
	preloadPlaylistData.totalCount = 0
	preloadPlaylistData.songs = []
	preloadPlaylistData.hasMore = false
	preloadPlaylistData.loadAllPromise = null
	preloadPlaylistData.isLoadingAll = false
}

// 全量加载歌单歌曲 (后台静默加载，用于生成完整播放列表)
const loadAllSongsForPlaylist = async (playlistId, fetchFunction, options = {}) => {
	const {
		pageSize = 100,        // 每页数量
		maxSongs = 1000,       // 最大拉取数量
		delayMs = 50,          // 请求间隔 (避免限流)
		onProgress = null      // 进度回调函数
	} = options
	
	// 如果已经在加载中，返回 Promise
	if (preloadPlaylistData.isLoadingAll && preloadPlaylistData.loadAllPromise) {
		return preloadPlaylistData.loadAllPromise
	}
	
	// 如果是同一个歌单且已加载完成，直接返回
	if (preloadPlaylistData.playlistId === playlistId && 
	    !preloadPlaylistData.hasMore && 
	    preloadPlaylistData.songs.length > 0) {
		return Promise.resolve(preloadPlaylistData.songs)
	}
	
	// 如果是不同的歌单，清空之前的数据
	if (preloadPlaylistData.playlistId !== playlistId) {
		preloadPlaylistData.songs = []
		preloadPlaylistData.hasMore = true
		preloadPlaylistData.totalCount = 0
	}
	
	// 创建加载任务
	preloadPlaylistData.isLoadingAll = true
	preloadPlaylistData.playlistId = playlistId
	
	const loadAllTask = (async () => {
		try {
			// 先获取第一页
			let offset = 0
			let hasMore = true
			let loadedCount = 0
			
			while (hasMore && loadedCount < maxSongs) {
				const res = await fetchFunction(pageSize, offset)
				
				if (res.code === 200 && res.songs) {
					const newSongs = res.songs
					
					// 追加到预加载数据
					preloadPlaylistData.songs.push(...newSongs)
					loadedCount += newSongs.length
					offset += newSongs.length
					
					// 通知进度
					if (onProgress) {
						onProgress({
							loaded: loadedCount,
							total: res.total || 0,
							hasMore: newSongs.length >= pageSize
						})
					}
					
					// 判断是否还有更多
					hasMore = newSongs.length >= pageSize
					preloadPlaylistData.hasMore = hasMore
					
					// 如果有更多，延迟后继续加载
					if (hasMore && loadedCount < maxSongs) {
						await new Promise(resolve => setTimeout(resolve, delayMs))
					}
				} else {
					hasMore = false
				}
			}
			
			preloadPlaylistData.isLoadingAll = false
			return preloadPlaylistData.songs
		} catch (error) {
			console.error('全量加载歌曲失败:', error)
			preloadPlaylistData.isLoadingAll = false
			throw error
		}
	})()
	
	preloadPlaylistData.loadAllPromise = loadAllTask
	return loadAllTask
}

// 导出
export const useMusicStore = () => {
	return {
		state,
		songName,
		artistNames,
		albumCover,
		progress,
		currentTimeStr,
		durationStr,
		commentCountStr,
		redCountStr,
		playSongById,
		togglePlay,
		play,
		pause,
		stop,
		seekTo,
		setProgress,
		toggleLike,
		switchQuality,
		switchGlobalQuality,
		getQualityName,
		getQualityIcon,
		getQualityDescription,
		getQualityLevel,
		// 播放列表相关方法
		setPlaylist,
		addToPlaylist,
		removeFromPlaylist,
		clearPlaylist,
		playFromPlaylist,
		playNext,
		playPrevious,
		togglePlayMode,
		getPreloadData,
		setPreloadData,
		resetPreloadData,
		loadAllSongsForPlaylist // 全量加载歌曲
	}
}

export default {
	state,
	songName,
	artistNames,
	albumCover,
	progress,
	currentTimeStr,
	durationStr,
	commentCountStr,
	redCountStr,
	playSongById,
	togglePlay,
	play,
	pause,
	stop,
	seekTo,
	setProgress,
	toggleLike,
	switchQuality,
	getQualityName,
	getQualityIcon,
	getQualityDescription,
	getQualityLevel,
	// 播放列表相关方法
	setPlaylist,
	addToPlaylist,
	removeFromPlaylist,
	clearPlaylist,
	playFromPlaylist,
	playNext,
	playPrevious,
	togglePlayMode,
	getPreloadData,
	setPreloadData,
	resetPreloadData
}
