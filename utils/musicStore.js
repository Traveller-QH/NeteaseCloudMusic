/**
 * 全局音乐播放状态管理
 */
import { reactive, ref, computed } from 'vue'
import { getSongDetail, getSongUrl, getLyric, getSongComment, getSongRedCount, toggleSongLike, checkSongLike } from './api.js'

// 当前播放请求ID，用于处理并发播放请求
let currentPlayId = 0

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
			console.log('取消之前的播放请求')
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
					console.log('音频播放成功')
					isPlaying = true
					state.isPlaying = true
				} else {
					console.log('播放成功但已被新请求取代')
				}
			}
		} catch (error) {
			// 检查是否还是当前的播放请求
			if (playId !== currentPlayId) {
				console.log('播放错误已被新请求取代，忽略')
				return
			}
			
			// 处理具体的错误类型
			if (error.name === 'AbortError') {
				console.log('播放被新请求中断，已忽略')
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
	{ level: 'hires', name: '高解析度无损 Hi-Res', icon: 'H', description: '更饱满清晰的高解析度音质，最高 192kHz/24bit' },
	{ level: 'jyeffect', name: '高清臻音 Spatial Audio', icon: 'SP', description: '高频细节还原与清晰沉浸感，96kHz/24bit' },
	{ level: 'sky', name: '沉浸环绕音 Surround Sound', icon: 'SU', description: '环绕音感 最高 5.1 声道' },
	{ level: 'dolby', name: '杜比全景音 Dolby Atmos', icon: 'DA', description: '沉浸三维空间音频，最高 7.1.4 声道' },
	{ level: 'jymaster', name: '超清母带 Master', icon: 'M', description: '极致细节 192kHz/24bit' }
]

// 全局音乐状态
const state = reactive({
	// 当前歌曲信息
	currentSong: null,
	// 播放状态
	isPlaying: false,
	// 当前播放时间（秒）
	currentTime: 0,
	// 总时长（秒）
	duration: 0,
	// 播放地址
	songUrl: '',
	// 加载状态
	loading: false,
	// 歌词列表 [{ time: 秒数，text: '歌词内容' }]
	lyrics: [],
	// 当前歌词索引
	currentLyricIndex: 0,
	// 评论数量
	commentCount: 0,
	// 红心数量
	redCount: 0,
	// 红心数量描述（后端返回的格式化字符串）
	redCountDesc: '0',
	// 歌曲是否被喜欢
	isLiked: false,
	// 当前音质等级
	currentQuality: 'standard',
	// 可用音质列表
	availableQualities: []
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
			console.log('有新的播放请求，取消当前请求')
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
		
		// 获取播放地址
		const urlRes = await getSongUrl(id, 'standard')
		
		// 再次检查是否是最新的请求
		if (requestId !== currentPlayId) {
			console.log('有新的播放请求，取消当前请求')
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
			console.log('有新的播放请求，忽略错误')
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

// 切换音质
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
		console.log('检查喜欢状态接口返回:', res)
		if (res.code === 200) {
			// 如果返回的 ids 数组包含该歌曲 id，说明已被喜欢
			// 如果没有喜欢的歌曲，ids 数组为空或者不包含当前 id
			const likedIds = res.ids || []
			// 转为数字类型进行比较，避免类型不匹配的问题
			const songId = Number(id)
			state.isLiked = likedIds.some(likedId => Number(likedId) === songId)
			console.log(`歌曲${id}的喜欢状态:`, state.isLiked ? '已喜欢' : '未喜欢', 'likedIds:', likedIds, 'songId:', songId)
		} else {
			state.isLiked = false
			console.log('检查喜欢状态失败，code:', res.code)
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
		console.log('切换喜欢状态，当前状态:', state.isLiked ? '已喜欢' : '未喜欢', '目标状态:', newLikeState ? '已喜欢' : '未喜欢')
		const res = await toggleSongLike(id, newLikeState)
		console.log('切换喜欢状态接口返回:', res)
		
		if (res.code === 200) {
			// 喜欢成功，更新状态
			state.isLiked = newLikeState
			console.log('切换喜欢状态成功，新状态:', state.isLiked ? '已喜欢' : '未喜欢')
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

// 设置进度（百分比 0-100）
const setProgress = (percent) => {
	if (!state.duration) return
	const time = (percent / 100) * state.duration
	seekTo(time)
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
		getQualityName,
		getQualityIcon,
		getQualityDescription,
		getQualityLevel
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
	getQualityLevel
}
