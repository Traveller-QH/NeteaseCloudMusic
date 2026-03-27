<template>
	<view class="player-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

		<!-- 背景模糊层 -->
		<view class="bg-blur">
			<view class="bg-image"></view>
			<view class="bg-mask"></view>
		</view>

		<!-- 顶部导航 -->
		<view class="nav-header">
			<view class="nav-left" @click="handleBack">
				<i class="iconfont icon-xiajiantou nav-icon" />
			</view>
			<view class="nav-center">
				<view class="song-name-wrapper">
					<view class="scroll-container" :class="{ 'scrolling': songNameNeedScroll }">
						<text class="song-name">{{ musicStore.songName.value || '加载中...' }}</text>
						<text class="song-name" v-if="songNameNeedScroll">{{ musicStore.songName.value || '加载中...' }}</text>
					</view>
				</view>
				<view class="artist-name-wrapper" @click="navigateToArtist">
					<view class="scroll-container" :class="{ 'scrolling': artistNameNeedScroll }">
						<text class="artist-name">{{ musicStore.artistNames.value || '未知歌手' }}</text>
						<text class="artist-name" v-if="artistNameNeedScroll">{{ musicStore.artistNames.value || '未知歌手' }}</text>
					</view>
				</view>
			</view>
			<view class="nav-right">
				<i class="iconfont icon-fenxiang1 nav-icon" />
			</view>
		</view>

		<!-- 唱片区域 -->
		<view class="disc-wrapper" :class="{ 'hidden': isFullscreenLyric }" @click="toggleFullscreenLyric">
			<!-- 唱针 -->
			<view class="needle">
				<view class="needle-arm"></view>
				<view class="needle-head"></view>
			</view>
			<!-- 唱片 -->
			<view class="disc-container">
				<view class="disc" :style="discStyle">
					<view class="disc-outer"></view>
					<view class="disc-inner">
						<view class="cover-wrapper">
							<image v-if="musicStore.albumCover.value" class="cover-img" :src="musicStore.albumCover.value" mode="aspectFill"></image>
							<i v-else class="iconfont icon-yinle cover-icon" />
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 歌词区域 -->
		<view class="lyric-wrapper" :class="{ 'hidden': isFullscreenLyric }" @click="toggleFullscreenLyric">
			<scroll-view
				scroll-y
				class="lyric-scroll"
				:scroll-top="lyricScrollTop"
				:scroll-with-animation="true"
				@touchstart="handleLyricTouchStart"
				@touchmove="handleLyricTouchMove"
				@touchend="handleLyricTouchEnd"
			>
				<!-- 顶部占位 -->
				<view class="lyric-placeholder"></view>
				<!-- 歌词列表 -->
				<view
					class="lyric-line"
					v-for="(line, index) in musicStore.state.lyrics"
					:key="index"
					:class="{ active: index === musicStore.state.currentLyricIndex }"
					:id="'lyric-' + index"
				>
					<text class="lyric-text">{{ line.text }}</text>
				</view>
				<!-- 无歌词提示 -->
				<view v-if="!musicStore.state.lyrics.length" class="lyric-empty">
					<text class="lyric-text">暂无歌词</text>
				</view>
				<!-- 底部占位 -->
				<view class="lyric-placeholder"></view>
			</scroll-view>
		</view>

		<!-- 进度条区域 -->
		<view class="progress-wrapper">
			<text class="time current">{{ isDragging ? dragTimeStr : musicStore.currentTimeStr.value }}</text>
			<view
				class="progress-bar"
				@touchstart="handleTouchStart"
				@touchmove="handleTouchMove"
				@touchend="handleTouchEnd"
				@click="handleProgressClick"
			>
				<view class="progress-track">
					<view class="progress-fill" :style="{ width: displayProgress + '%' }"></view>
					<view class="progress-dot" :style="{ left: displayProgress + '%' }"></view>
				</view>
			</view>
			<text class="time total">{{ musicStore.durationStr.value }}</text>
		</view>

		<!-- 操作按钮区域 -->
		<view class="action-wrapper">
			<view class="action-item" @click="handleToggleLike">
				<i class="iconfont action-icon" :class="musicStore.state.isLiked ? 'icon-xihuan' : 'icon-xihuan1'" :style="{ color: musicStore.state.isLiked ? '#EC4141' : '' }" />
				<text class="action-badge" v-if="musicStore.state.redCount > 0">{{ musicStore.redCountStr.value }}</text>
			</view>
			<view class="action-item" @click="handleDownload">
				<i class="iconfont icon-xiazai action-icon" />
			</view>
			<view class="action-item">
				<i class="iconfont icon-pinglun action-icon" />
				<text class="action-badge" v-if="musicStore.state.commentCount > 0">{{ musicStore.commentCountStr.value }}</text>
			</view>
			<view class="action-item" @click="showMoreMenu = true">
				<i class="iconfont icon-gengduo action-icon" />
			</view>
		</view>

		<!-- 播放控制区 -->
		<view class="control-wrapper">
			<view class="control-item" @click="handleTogglePlayMode">
				<i class="iconfont control-icon-small" :class="playModeIconClass" />
			</view>
			<view class="control-item">
				<i class="iconfont icon-shangyishou1 control-icon-medium" @click="handlePlayPrevious" />
			</view>
			<view class="control-item play-btn" @click="handleTogglePlay">
				<i class="iconfont control-icon-large" :class="musicStore.state.isPlaying ? 'icon-zantingbofang1' : 'icon-bofang1'" />
			</view>
			<view class="control-item">
				<i class="iconfont icon-shangyishou control-icon-medium" @click="handlePlayNext" />
			</view>
			<view class="control-item" @click="showPlaylistPopup = true">
				<i class="iconfont icon-bofangliebiao control-icon-small" />
			</view>
		</view>

		<!-- 底部安全区 -->
		<view class="safe-bottom"></view>
	</view>

	<!-- 全屏歌词组件 -->
	<FullscreenLyric 
		:visible="isFullscreenLyric" 
		@close="toggleFullscreenLyric" 
	/>

	<!-- 播放列表弹窗 -->
	<PlaylistPopup v-model="showPlaylistPopup" />

	<!-- 更多选项弹窗 -->
	<u-popup v-model:show="showMoreMenu" mode="bottom" :round="20">
		<view class="more-menu">
			<!-- 歌曲信息头部 -->
			<view class="menu-header">
				<image v-if="musicStore.albumCover.value" class="menu-cover" :src="musicStore.albumCover.value" mode="aspectFill"></image>
				<i v-else class="iconfont icon-yinle menu-cover-icon" />
				<view class="menu-info">
					<text class="menu-song-name">{{ musicStore.songName.value || '未知歌曲' }}</text>
					<text class="menu-artist-name">{{ musicStore.artistNames.value || '未知歌手' }}</text>
				</view>
			</view>

			<!-- 分割线 -->
			<view class="menu-divider"></view>

			<!-- 功能选项 -->
			<view class="menu-options">
				<view class="menu-option" @click="handleToggleLike">
					<i class="iconfont menu-icon" :class="musicStore.state.isLiked ? 'icon-xihuan' : 'icon-xihuan1'" :style="{ color: musicStore.state.isLiked ? '#EC4141' : '' }" />
					<text class="menu-text">收藏</text>
				</view>
				<view class="menu-option" @click="handleDownload">
					<i class="iconfont menu-icon icon-xiazai" />
					<text class="menu-text">下载</text>
				</view>
				<view class="menu-option">
					<i class="iconfont menu-icon icon-fenxiang1" />
					<text class="menu-text">分享</text>
				</view>
			</view>

			<!-- 分割线 -->
			<view class="menu-divider"></view>

			<!-- 专辑和歌手 -->
			<view class="menu-options">
				<view class="menu-option" @click="navigateToAlbum">
					<i class="iconfont menu-icon icon-vynil" />
					<text class="menu-text">专辑：{{ albumName }}</text>
				</view>
				<view class="menu-option" @click="navigateToArtist">
					<i class="iconfont menu-icon icon-yingyonggongzuotai-yishujiafuwugongzuotai-jieshaorenziliao" />
					<text class="menu-text">歌手：{{ musicStore.artistNames.value || '未知歌手' }}</text>
				</view>
			</view>

			<!-- 分割线 -->
			<view class="menu-divider"></view>

			<!-- 音质选项 -->
			<view class="menu-options">
				<view class="menu-option" @click="openQualitySelector">
					<i class="iconfont menu-icon icon-zengqiangduijiangyinzhi" />
					<text class="menu-text">音质：{{ currentQualityName }}</text>
				</view>
			</view>
		</view>
  </u-popup>

	<!-- 歌手选择弹窗 -->
	<u-popup v-model:show="showArtistSelector" mode="bottom" :round="20">
		<view class="artist-selector">
			<!-- 标题栏 -->
			<view class="artist-header">
				<text class="artist-title">该歌曲有多个歌手</text>
			</view>

			<!-- 分割线 -->
			<view class="artist-divider"></view>

			<!-- 歌手列表 -->
			<scroll-view scroll-y class="artist-list">
				<view
					v-for="artist in artistList"
					:key="artist.id"
					class="artist-item"
					@click="selectArtist(artist.id)"
				>
					<!-- 歌手头像 -->
					<image
						v-if="artistsDetailMap[artist.id]?.cover"
						class="artist-avatar"
						:src="artistsDetailMap[artist.id].cover"
						mode="aspectFill"
					></image>
					<i
						v-else
						class="iconfont icon-yingyonggongzuotai-yishujiafuwugongzuotai-jieshaorenziliao artist-avatar-icon"
					/>

					<!-- 歌手名称 -->
					<text class="artist-name">{{ artist.name }}</text>
				</view>
			</scroll-view>
		</view>
	</u-popup>

	<!-- 音质选择弹窗 -->
	<u-popup v-model:show="showQualitySelector" mode="bottom" :round="20">
		<view class="quality-selector">
			<!-- 标题 -->
			<view class="quality-title">
				<text class="quality-title-text">当前歌曲音质</text>
			</view>

			<!-- 音质列表 -->
			<scroll-view scroll-y class="quality-list">
				<view
					v-for="(quality, index) in musicStore.state.availableQualities"
					:key="quality.level"
					class="quality-item"
					:class="{ active: musicStore.state.currentQuality === quality.level }"
					@click="selectQuality(quality.level)"
				>
					<!-- 音质图标 -->
					<view class="quality-icon-wrapper" :style="{ background: getQualityIconColor(quality.level) }">
						<text class="quality-icon-text">{{ quality.icon }}</text>
					</view>

					<!-- 音质信息 -->
					<view class="quality-info">
						<text class="quality-name">{{ quality.name }}</text>
						<text class="quality-desc">{{ quality.description }}</text>
					</view>

					<!-- 选中标志 -->
					<view v-if="musicStore.state.currentQuality === quality.level" class="quality-checkmark">
						<i class="iconfont icon-duigou" />
					</view>
				</view>
			</scroll-view>
		</view>
	</u-popup>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useMusicStore } from '@/utils/musicStore.js'
import PlaylistPopup from '@/components/PlaylistPopup/PlaylistPopup.vue'
import FullscreenLyric from '@/components/FullscreenLyric/FullscreenLyric.vue'
import { getArtistDetail } from '@/utils/api.js'

defineProps({
  id: {
    type: [String, Number],
    default: ''
  }
})

const musicStore = useMusicStore()

// 旋转动画相关
const discRotation = ref(0)
const lastUpdateTime = ref(0)
const timerId = ref(null)
const isRotating = ref(false)

// 计算唱片的旋转样式
const discStyle = computed(() => {
	return {
		transform: `rotate(${discRotation.value}deg)`
	}
})

// 更新旋转角度
const updateRotation = () => {
	if (!isRotating.value) return
	
	const now = Date.now()
	const deltaTime = (now - lastUpdateTime.value) / 1000 // 转换为秒
	lastUpdateTime.value = now
	
	// 每秒旋转 18 度（20 秒一圈），角度持续累加，不取模
	discRotation.value += deltaTime * 18
	
	// 使用 setTimeout 模拟 requestAnimationFrame（兼容性更好）
	timerId.value = setTimeout(updateRotation, 16) // 约 60fps
}

// 开始旋转
const startRotating = () => {
	if (isRotating.value) return
	isRotating.value = true
	lastUpdateTime.value = Date.now()
	updateRotation()
}

// 停止旋转
const stopRotating = () => {
	isRotating.value = false
	if (timerId.value) {
		clearTimeout(timerId.value)
		timerId.value = null
	}
}

// 监听播放状态变化
watch(
	() => musicStore.state.isPlaying,
	(newVal) => {
		if (newVal) {
			startRotating()
		} else {
			stopRotating()
		}
	},
	{ immediate: true }
)

// 页面卸载时清理
onUnmounted(() => {
	stopRotating()
	// 清理歌词触摸定时器
	if (lyricTouchTimer) {
		clearTimeout(lyricTouchTimer)
	}
})

// 弹窗显示状态
const showMoreMenu = ref(false)
const showQualitySelector = ref(false)
const showPlaylistPopup = ref(false) // 播放列表弹窗
const showArtistSelector = ref(false) // 歌手选择弹窗

// 循环模式图标
const playModeIconClass = computed(() => {
  const mode = musicStore.state.playMode
  if (mode === 'single') return 'icon-danquxunhuan'
  if (mode === 'random') return 'icon-suijibofang'
  return 'icon-liebiaoxunhuan'
})

// 计算属性 - 歌手列表（用于判断是否有多个歌手）
const artistList = computed(() => {
	const artists = musicStore.state.currentSong?.ar || musicStore.state.currentSong?.artists || []
	return artists
})

// 计算属性 - 是否有多歌手
const hasMultipleArtists = computed(() => {
	return artistList.value.length > 1
})

const albumName = computed(() => {
	return musicStore.state.currentSong?.al?.name || '未知专辑'
})

const currentQualityName = computed(() => {
	return musicStore.getQualityName(musicStore.state.currentQuality) || '标准'
})

// 是否需要滚动（通过DOM检测实际宽度）
const songNameNeedScroll = ref(false)
const artistNameNeedScroll = ref(false)

// 检测文本是否超出容器
const checkTextOverflow = async () => {
	await nextTick()

	// 检测歌名
	const songNameQuery = uni.createSelectorQuery()
	songNameQuery.select('.song-name-wrapper').boundingClientRect()
	songNameQuery.select('.song-name').boundingClientRect()
	songNameQuery.exec((res) => {
		if (res && res[0] && res[1]) {
			const wrapperWidth = res[0].width
			const textWidth = res[1].width
			songNameNeedScroll.value = textWidth > wrapperWidth
		}
	})

	// 检测歌手名
	const artistNameQuery = uni.createSelectorQuery()
	artistNameQuery.select('.artist-name-wrapper').boundingClientRect()
	artistNameQuery.select('.artist-name').boundingClientRect()
	artistNameQuery.exec((res) => {
		if (res && res[0] && res[1]) {
			const wrapperWidth = res[0].width
			const textWidth = res[1].width
			artistNameNeedScroll.value = textWidth > wrapperWidth
		}
	})
}

// 监听歌曲变化，重新检测是否需要滚动
watch(
	() => musicStore.state.currentSong,
	() => {
		// 先重置滚动状态
		songNameNeedScroll.value = false
		artistNameNeedScroll.value = false
		// 延迟检测，等待DOM更新
		setTimeout(() => {
			checkTextOverflow()
		}, 300)
	},
	{ immediate: true, deep: true }
)

// 歌词滚动位置
const lyricScrollTop = ref(0)
// 是否禁用自动滚动（用户正在触摸或刚触摸完）
const disableLyricAutoScroll = ref(false)
// 触摸定时器
let lyricTouchTimer = null

// rpx 转 px 的比例（基于 750 设计稿）
const getRpxToPx = () => {
	const screenWidth = uni.getSystemInfoSync().windowWidth
	return screenWidth / 750
}

// 监听当前歌词索引变化，滚动到对应位置
watch(
	() => musicStore.state.currentLyricIndex,
	(newIndex) => {
		if (!disableLyricAutoScroll.value) {
			const ratio = getRpxToPx()
			const lineHeight = 100 * ratio // 每行歌词高度 100rpx（稍微增大以适配可能的 2 行歌词）
			const placeholderHeight = 100 * ratio // 顶部占位 100rpx
			const wrapperHeight = 280 * ratio // 歌词区域高度 280rpx

			// 计算滚动位置，让当前歌词居中显示
			// 当前歌词的位置 = 占位高度 + 索引 * 行高
			// 要居中显示，需要滚动到：当前位置 - (容器高度/2) + (行高/2)
			const currentPosition = placeholderHeight + newIndex * lineHeight
			const scrollPosition = currentPosition - (wrapperHeight / 2) + (lineHeight / 2)

			lyricScrollTop.value = Math.max(0, scrollPosition)
		}
	},
	{ immediate: true }
)

// 拖动状态
const isDragging = ref(false)
const dragProgress = ref(0)
const progressBarInfo = ref({ left: 0, width: 1 })

// 全屏歌词状态
const isFullscreenLyric = ref(false)

// 切换全屏歌词
const toggleFullscreenLyric = () => {
	isFullscreenLyric.value = !isFullscreenLyric.value
}

// 普通歌词区域触摸相关
let lyricLastTouchTime = 0
let lyricLastTouchY = 0

// 触摸开始
const handleLyricTouchStart = (e) => {
	lyricLastTouchTime = Date.now()
	lyricLastTouchY = e.touches[0].clientY
	// 禁用自动滚动
	disableLyricAutoScroll.value = true
	// 清除之前的定时器
	if (lyricTouchTimer) {
		clearTimeout(lyricTouchTimer)
	}
}

// 触摸移动
const handleLyricTouchMove = (e) => {
	// 阻止默认行为
}

// 触摸结束
const handleLyricTouchEnd = (e) => {
	const touchDuration = Date.now() - lyricLastTouchTime
	const touchY = e.changedTouches[0].clientY
	const deltaY = touchY - lyricLastTouchY
	
	// 如果是滑动，2 秒后恢复自动滚动
	lyricTouchTimer = setTimeout(() => {
		disableLyricAutoScroll.value = false
		// 恢复后立即更新到当前高亮行位置
		const ratio = getRpxToPx()
		const lineHeight = 100 * ratio
		const placeholderHeight = 100 * ratio
		const wrapperHeight = 280 * ratio
		const currentIndex = musicStore.state.currentLyricIndex
		
		if (currentIndex >= 0) {
			const currentPosition = placeholderHeight + currentIndex * lineHeight
			const scrollPosition = currentPosition - (wrapperHeight / 2) + (lineHeight / 2)
			lyricScrollTop.value = Math.max(0, scrollPosition)
		}
	}, 2000)
}

// 显示的进度（拖动时显示拖动进度，否则显示实际进度）
const displayProgress = computed(() => {
	return isDragging.value ? dragProgress.value : musicStore.progress.value
})

// 拖动时显示的时间
const dragTimeStr = computed(() => {
	if (!musicStore.state.duration) return '00:00'
	const time = (dragProgress.value / 100) * musicStore.state.duration
	const mins = Math.floor(time / 60)
	const secs = Math.floor(time % 60)
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

// 播放/暂停切换
const handleTogglePlay = () => {
	musicStore.togglePlay()
}

// 切换循环模式
const handleTogglePlayMode = () => {
  musicStore.togglePlayMode()
}

// 播放上一首
const handlePlayPrevious = () => {
  musicStore.playPrevious()
}

// 播放下一首
const handlePlayNext = () => {
  musicStore.playNext()
}

// 切换喜欢状态
const handleToggleLike = async () => {
	if (!musicStore.state.currentSong?.id) return
	
	const success = await musicStore.toggleLike(musicStore.state.currentSong.id)
	if (success) {
		uni.showToast({
			title: musicStore.state.isLiked ? '已添加到我喜欢' : '已取消喜欢',
			icon: 'none',
			duration: 1500
		})
	} else {
		uni.showToast({
			title: '操作失败，请重试',
			icon: 'none',
			duration: 1500
		})
	}
}

// 获取进度条位置信息
const getProgressBarRect = (target) => {
	return new Promise((resolve) => {
		uni.createSelectorQuery()
			.select('.progress-bar')
			.boundingClientRect((rect) => {
				if (rect) {
					resolve({ left: rect.left, width: rect.width })
				} else {
					resolve({ left: 0, width: 1 })
				}
			})
			.exec()
	})
}

// 计算触摸位置的进度百分比
const calcProgressFromTouch = (touchX) => {
	const { left, width } = progressBarInfo.value
	let percent = ((touchX - left) / width) * 100
	return Math.max(0, Math.min(100, percent))
}

// 触摸开始
const handleTouchStart = async (e) => {
	// 获取进度条位置信息
	progressBarInfo.value = await getProgressBarRect()
	isDragging.value = true
	const touchX = e.touches[0].clientX
	dragProgress.value = calcProgressFromTouch(touchX)
}

// 触摸移动
const handleTouchMove = (e) => {
	if (!isDragging.value) return
	const touchX = e.touches[0].clientX
	dragProgress.value = calcProgressFromTouch(touchX)
}

// 触摸结束
const handleTouchEnd = (e) => {
	if (!isDragging.value) return
	// 设置播放进度
	musicStore.setProgress(dragProgress.value)
	isDragging.value = false
}

// 进度条点击
const handleProgressClick = async (e) => {
	// 如果是拖动结束触发的点击，忽略
	if (isDragging.value) return

	// 获取进度条位置信息
	const rect = await getProgressBarRect()
	const touchX = e.detail.x || e.touches?.[0]?.clientX || 0
	const percent = ((touchX - rect.left) / rect.width) * 100
	musicStore.setProgress(Math.max(0, Math.min(100, percent)))
}

// 返回上一页
const handleBack = () => {
	// 获取当前页面栈
	const pages = getCurrentPages()

	if (pages.length > 1) {
		// 有上一页，正常返回
		uni.navigateBack()
	} else {
		// 没有上一页（可能是直接进入或分享链接），跳转到首页
		uni.switchTab({
			url: '/pages/discovery/discovery'
		})
	}
}

// 打开音质选择器
const openQualitySelector = () => {
	showMoreMenu.value = false
	showQualitySelector.value = true
}

// 选择音质
const selectQuality = async (level) => {
	if (level === musicStore.state.currentQuality) return
	
	uni.showLoading({ title: '切换音质中...' })
	
	try {
		const success = await musicStore.switchQuality(level)
		uni.hideLoading()
		
		if (success) {
			showQualitySelector.value = false
			uni.showToast({
				title: `已切换为${musicStore.getQualityName(level)}`,
				icon: 'none',
				duration: 1500
			})
		} else {
			uni.showToast({
				title: '切换失败，请重试',
				icon: 'none',
				duration: 1500
			})
		}
	} catch (error) {
		uni.hideLoading()
		uni.showToast({
			title: '切换失败，请重试',
			icon: 'none',
			duration: 1500
		})
	}
}

// 获取音质图标颜色
const getQualityIconColor = (level) => {
	const colors = {
		'jymaster': 'linear-gradient(135deg, #FFD700, #FFA500)', // 金色 - 超清母带
		'dolby': 'linear-gradient(135deg, #4169E1, #1E90FF)', // 蓝色 - 杜比全景音
		'sky': 'linear-gradient(135deg, #9370DB, #8A2BE2)', // 紫色 - 沉浸环绕音
		'jyeffect': 'linear-gradient(135deg, #00CED1, #20B2AA)', // 青色 - 高清臻音
		'hires': 'linear-gradient(135deg, #FF6347, #FF4500)', // 橙红色 - 高解析度无损
		'lossless': 'linear-gradient(135deg, #32CD32, #228B22)', // 绿色 - 无损
		'exhigh': 'linear-gradient(135deg, #FF69B4, #FF1493)', // 粉红色 - 极高
		'higher': 'linear-gradient(135deg, #87CEEB, #4682B4)', // 天蓝色 - 较高
		'standard': 'linear-gradient(135deg, #808080, #696969)' // 灰色 - 标准
	}
	return colors[level] || colors['standard']
}

// 跳转到专辑页面
const navigateToAlbum = () => {
	const albumId = musicStore.state.currentSong?.al?.id
	if (!albumId) {
		uni.showToast({
			title: '专辑信息不可用',
			icon: 'none'
		})
		return
	}
	
	showMoreMenu.value = false
	uni.navigateTo({
		url: `/pages/album/album?id=${albumId}`
	})
}

// 跳转到歌手页面（处理多歌手情况）
const navigateToArtist = async () => {
	const artists = musicStore.state.currentSong?.ar || musicStore.state.currentSong?.artists || []
	if (!artists || artists.length === 0) {
		uni.showToast({
			title: '歌手信息不可用',
			icon: 'none'
		})
		return
	}
	
	// 如果只有一个歌手，直接跳转
	if (artists.length === 1) {
		const artistId = artists[0].id
		showMoreMenu.value = false
		uni.navigateTo({
			url: `/pages/artist/artist?id=${artistId}`
		})
	} else {
		// 多个歌手，打开歌手选择弹窗
		showMoreMenu.value = false
		showArtistSelector.value = true
		// 预加载所有歌手详情
		await loadAllArtistsDetail(artists)
	}
}

// 存储歌手详情数据
const artistsDetailMap = ref({})

// 批量加载歌手详情
const loadAllArtistsDetail = async (artists) => {
	try {
		// 为每个歌手加载详情
		const loadPromises = artists.map(async (artist) => {
			if (artistsDetailMap.value[artist.id]) {
				// 已缓存，跳过
				return
			}
			
			try {
				const res = await getArtistDetail(artist.id)
				if (res.code === 200 && res.data && res.data.artist) {
					artistsDetailMap.value[artist.id] = res.data.artist
				}
			} catch (error) {
				console.error(`加载歌手 ${artist.name} 详情失败:`, error)
			}
		})
		
		await Promise.all(loadPromises)
	} catch (error) {
		console.error('批量加载歌手详情失败:', error)
	}
}

// 点击选择某个歌手
const selectArtist = (artistId) => {
	showArtistSelector.value = false
	uni.navigateTo({
		url: `/pages/artist/artist?id=${artistId}`
	})
}

const handleDownload = async () => {
  if (!musicStore.state.currentSong) {
    uni.showToast({ title: '暂无歌曲', icon: 'none' });
    return;
  }
  const success = await musicStore.downloadSong(musicStore.state.currentSong);
  if (success) {
    showMoreMenu.value = false;
  }
};


// 页面加载时获取参数并播放
onMounted(() => {
	// 获取页面参数
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const options = currentPage.options || currentPage.$page?.options || {}

	if (options.id) {
		// 如果传入了新的歌曲id，且与当前播放的歌曲不同，则播放新歌曲
		const currentId = musicStore.state.currentSong?.id
		if (String(currentId) !== String(options.id)) {
			musicStore.playSongById(options.id)
		}
	}

	// 初始检测文本是否超出
	setTimeout(() => {
		checkTextOverflow()
	}, 500)
})
</script>

<style lang="scss" scoped>
.player-page {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
}

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
  background-color: black;
}

// 背景模糊层
.bg-blur {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1; // 背景层最低
	overflow: hidden;


}

// 顶部导航
.nav-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 20rpx;
	position: relative;
	z-index: 10; // 顶部导航层级较高

	.nav-left, .nav-right {
		width: 80rpx;
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-icon {
		font-size: 48rpx;
		color: #fff;
	}

	.nav-center {
		flex: 1;
		text-align: center;
		overflow: hidden;
		padding: 0 10rpx;

		.song-name-wrapper, .artist-name-wrapper {
			overflow: hidden;
			width: 100%;
		}

		.scroll-container {
			display: inline-flex;
			align-items: center;
			gap: 80rpx; // 两段文本之间的间距
			white-space: nowrap;

			&.scrolling {
				animation: marquee-seamless 10s linear infinite;
			}
		}

		.song-name {
			font-size: 32rpx;
			font-weight: bold;
			color: #fff;
			white-space: nowrap;
		}

		.artist-name-wrapper {
			margin-top: 6rpx;

			.scroll-container.scrolling {
				animation-duration: 12s; // 歌手名滚动慢一点
			}
		}

		.artist-name {
			font-size: 24rpx;
			color: rgba(255, 255, 255, 0.7);
			white-space: nowrap;
		}
	}
}

// 全屏歌词触发器（透明覆盖层）
.fullscreen-trigger {
	position: absolute;
	top: 0; // 导航栏下方
	left: 0;
	right: 0;
	bottom: 0; // 进度条上方
	z-index: 9; // 在唱片和歌词之间
}

// 唱片区域
.disc-wrapper {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	padding: 40rpx;
	z-index: 5; // 唱片区域层级
	transition: opacity 0.3s ease, transform 0.3s ease;

	&.hidden {
		opacity: 0;
		transform: scale(0.9);
		pointer-events: none; // 隐藏时禁用点击事件
	}

	// 唱针
	.needle {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		z-index: 15; // 唱针层级最高

		.needle-arm {
			width: 20rpx;
			height: 180rpx;
			background: linear-gradient(180deg, #333, #1a1a1a);
			border-radius: 10rpx;
			margin: 0 auto;
			transform-origin: top center;
			transform: rotate(-25deg);
			box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.3);
		}

		.needle-head {
			width: 36rpx;
			height: 36rpx;
			background: #666;
			border-radius: 50%;
			margin: -12rpx auto 0;
			box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.3);
		}
	}

	// 唱片容器
	.disc-container {
		width: 520rpx;
		height: 520rpx;

		.disc {
			width: 100%;
			height: 100%;
			position: relative;
			transition: transform 0.1s linear;

			.disc-outer {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: radial-gradient(circle, #333 0%, #1a1a1a 50%, #0d0d0d 100%);
				border-radius: 50%;
				box-shadow: 0 0 60rpx rgba(0, 0, 0, 0.5);

				&::before {
					content: '';
					position: absolute;
					top: 10%;
					left: 10%;
					right: 10%;
					bottom: 10%;
					border: 2rpx solid rgba(255, 255, 255, 0.05);
					border-radius: 50%;
				}

				&::after {
					content: '';
					position: absolute;
					top: 25%;
					left: 25%;
					right: 25%;
					bottom: 25%;
					border: 2rpx solid rgba(255, 255, 255, 0.05);
					border-radius: 50%;
				}
			}

			.disc-inner {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				width: 55%;
				height: 55%;

				.cover-wrapper {
					width: 100%;
					height: 100%;
					background: linear-gradient(135deg, #EC4141, #FF6666);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					border: 8rpx solid #1a1a1a;
					box-shadow: inset 0 0 30rpx rgba(0, 0, 0, 0.3);
					overflow: hidden;

					.cover-img {
						width: 100%;
						height: 100%;
						border-radius: 50%;
					}

					.cover-icon {
						font-size: 120rpx;
						color: #fff;
					}
				}
			}
		}
	}
}

// 歌词区域
.lyric-wrapper {
	height: 280rpx;
	padding: 0 40rpx;
	overflow: hidden;
	position: relative;
	z-index: 8; // 歌词层级适中
	transition: opacity 0.3s ease, transform 0.3s ease;

	&.hidden {
		opacity: 0;
		transform: scale(0.95);
		pointer-events: none; // 隐藏时禁用点击事件
	}

	.lyric-scroll {
		height: 100%;
		text-align: center;

		.lyric-placeholder {
			height: 100rpx;
		}

		.lyric-line {
			min-height: 100rpx; // 最小高度 100rpx（适配可能的 2 行歌词）
			line-height: 36rpx;
			padding: 17rpx 0;
			transition: all 0.3s ease;

			.lyric-text {
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.4);
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
				overflow: hidden;
				word-break: break-all;
			}

			&.active {
				min-height: auto;
				padding: 10rpx 0 24rpx;

				.lyric-text {
					font-size: 30rpx;
					color: #fff;
					font-weight: 500;
					-webkit-line-clamp: 3;
				}
			}
		}

		.lyric-empty {
			height: 70rpx;
			line-height: 70rpx;

			.lyric-text {
				font-size: 28rpx;
				color: rgba(255, 255, 255, 0.5);
			}
		}
	}
}

// 进度条区域
.progress-wrapper {
	display: flex;
	align-items: center;
	padding: 30rpx 40rpx;
	position: relative;
	z-index: 9; // 进度条层级

	.time {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.6);
		width: 80rpx;

		&.current {
			text-align: left;
		}

		&.total {
			text-align: right;
		}
	}

	.progress-bar {
		flex: 1;
		padding: 20rpx 0;
		touch-action: none;

		.progress-track {
			position: relative;
			height: 4rpx;
			background: rgba(255, 255, 255, 0.2);
			border-radius: 2rpx;

			.progress-fill {
				position: absolute;
				left: 0;
				top: 0;
				height: 100%;
				background: #EC4141;
				border-radius: 2rpx;
			}

			.progress-dot {
				position: absolute;
				top: 50%;
				transform: translate(-50%, -50%);
				width: 24rpx;
				height: 24rpx;
				background: #fff;
				border-radius: 50%;
				box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.3);
			}
		}
	}
}

// 操作按钮区域
.action-wrapper {
	display: flex;
	justify-content: space-around;
	padding: 20rpx 60rpx;
	position: relative;
	z-index: 7; // 操作按钮层级

	.action-item {
		position: relative;
		width: 80rpx;
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;

		.action-icon {
			font-size: 48rpx;
			color: rgba(255, 255, 255, 0.7);
		}

		.action-badge {
			position: absolute;
			top: 8rpx;
			right: 0;
			font-size: 18rpx;
			color: #fff;
			background: #EC4141;
			padding: 2rpx 8rpx;
			border-radius: 16rpx;
		}
	}
}

// 播放控制区
.control-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 20rpx 40rpx 40rpx;
	position: relative;
	z-index: 6; // 播放控制层级

	.control-item {
		width: 100rpx;
		height: 100rpx;
		display: flex;
		align-items: center;
		justify-content: center;

		.control-icon-small {
			font-size: 52rpx;
			color: rgba(255, 255, 255, 0.8);
		}

		.control-icon-medium {
			font-size: 72rpx;
			color: #fff;
		}

		.control-icon-large {
			font-size: 100rpx;
			color: #fff;
		}

		&.play-btn {
			width: 130rpx;
			height: 130rpx;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 50%;
			border: 4rpx solid rgba(255, 255, 255, 0.3);
		}
	}
}

// 底部安全区
.safe-bottom {
	padding-bottom: env(safe-area-inset-bottom);
}

// 背景遮罩层子元素样式
.bg-image {
	position: absolute;
	top: -20%;
	left: -20%;
	right: -20%;
	bottom: -20%;
	background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
	filter: blur(0);
}

.bg-mask {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.3);
}

// 无缝循环滚动动画（包含开头暂停效果）
// 动画说明：
// 0%-20%: 暂停 2 秒（总时长 10 秒的话）
// 20%-100%: 滚动一个完整周期（第一个文本 + 间距）
// 由于使用两份相同文本，滚动到 -50% 时刚好是一个完整循环
@keyframes marquee-seamless {
	0%, 20% {
		transform: translateX(0);
	}
	100% {
		transform: translateX(calc(-50% - 40rpx)); // 50% + 半个间距
	}
}

// 移除 CSS 旋转动画，改用 JS 控制

// 更多选项弹窗样式
.more-menu {
	padding-bottom: env(safe-area-inset-bottom);
	background: #fff;

	.menu-header {
		display: flex;
		align-items: center;
		padding: 40rpx 30rpx 30rpx;

		.menu-cover {
			width: 120rpx;
			height: 120rpx;
			border-radius: 16rpx;
			flex-shrink: 0;
		}

		.menu-cover-icon {
			width: 120rpx;
			height: 120rpx;
			font-size: 60rpx;
			color: #fff;
			background: linear-gradient(135deg, #EC4141, #FF6666);
			border-radius: 16rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		.menu-info {
			flex: 1;
			margin-left: 24rpx;
			display: flex;
			flex-direction: column;
			justify-content: center;
			gap: 12rpx;

			.menu-song-name {
				font-size: 32rpx;
				font-weight: bold;
				color: #333;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.menu-artist-name {
				font-size: 26rpx;
				color: #999;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
	}

	.menu-divider {
		height: 1rpx;
		background: #f0f0f0;
		margin: 0 30rpx;
	}

	.menu-options {
		padding: 20rpx 0;

		.menu-option {
			display: flex;
			align-items: center;
			padding: 28rpx 30rpx;
			transition: background 0.2s;

			&:active {
				background: #f5f5f5;
			}

			.menu-icon,
			.menu-icon-custom {
				width: 48rpx;
				height: 48rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				margin-right: 24rpx;
				flex-shrink: 0;
			}

			.menu-icon {
				font-size: 40rpx;
				color: #666;
			}

			.menu-text {
				font-size: 30rpx;
				color: #333;
			}
		}
	}
}

// 音质选择弹窗样式
.quality-selector {
	padding-bottom: env(safe-area-inset-bottom);
	background: #fff;

	.quality-title {
		padding: 40rpx 30rpx 30rpx;
		border-bottom: 1rpx solid #f0f0f0;

		.quality-title-text {
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
		}
	}

	.quality-list {
		max-height: 800rpx;
		padding: 20rpx 0;

		.quality-item {
			display: flex;
			align-items: center;
			padding: 24rpx 30rpx;
			transition: background 0.2s;

			&:active {
				background: #f5f5f5;
			}

			&.active {
				background: rgba(236, 65, 65, 0.05);
			}

			.quality-icon-wrapper {
				width: 80rpx;
				height: 80rpx;
				border-radius: 50%; // 改为圆形
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
				box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);

				.quality-icon-text {
					font-size: 28rpx;
					font-weight: bold;
					color: #fff;
					font-family: Arial, sans-serif;
				}
			}

			.quality-info {
				flex: 1;
				margin-left: 24rpx;
				display: flex;
				flex-direction: column;
				gap: 8rpx;

				.quality-name {
					font-size: 30rpx;
					font-weight: 500;
					color: #333;
				}

				.quality-desc {
					font-size: 22rpx;
					color: #999;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
			}

			.quality-checkmark {
				width: 48rpx;
				height: 48rpx;
				border-radius: 50%;
				background: #EC4141;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;

				.icon-duigou {
					font-size: 28rpx;
					color: #fff;
				}
			}
		}
	}
}

// 歌手选择弹窗样式
.artist-selector {
	padding-bottom: env(safe-area-inset-bottom);
	background: #fff;

	.artist-header {
		padding: 40rpx 30rpx 30rpx;

		.artist-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
		}
	}

	.artist-divider {
		height: 1rpx;
		background: #f0f0f0;
		margin: 0 30rpx;
	}

	.artist-list {
		max-height: 800rpx;
		padding: 20rpx 0;

		.artist-item {
			display: flex;
			align-items: center;
			padding: 24rpx 30rpx;
			transition: background 0.2s;

			&:active {
				background: #f5f5f5;
			}

			.artist-avatar {
				width: 80rpx;
				height: 80rpx;
				border-radius: 50%;
				flex-shrink: 0;
				object-fit: cover;
			}

			.artist-avatar-icon {
				width: 80rpx;
				height: 80rpx;
				font-size: 40rpx;
				color: #999;
				background: #f5f5f5;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
			}

			.artist-name {
				flex: 1;
				margin-left: 24rpx;
				font-size: 30rpx;
				color: #333;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
	}
}
</style>
