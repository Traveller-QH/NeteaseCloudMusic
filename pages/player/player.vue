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
				<view class="artist-name-wrapper">
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
		<view class="disc-wrapper">
			<!-- 唱针 -->
			<view class="needle">
				<view class="needle-arm"></view>
				<view class="needle-head"></view>
			</view>
			<!-- 唱片 -->
			<view class="disc-container">
				<view class="disc" :class="{ rotating: musicStore.state.isPlaying }">
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
		<view class="lyric-wrapper">
			<scroll-view
				scroll-y
				class="lyric-scroll"
				:scroll-top="lyricScrollTop"
				:scroll-with-animation="true"
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
			<view class="action-item">
				<i class="iconfont icon-xiazai action-icon" />
			</view>
			<view class="action-item">
				<i class="iconfont icon-pinglun action-icon" />
				<text class="action-badge" v-if="musicStore.state.commentCount > 0">{{ musicStore.commentCountStr.value }}</text>
			</view>
			<view class="action-item">
				<i class="iconfont icon-gengduo action-icon" />
			</view>
		</view>

		<!-- 播放控制区 -->
		<view class="control-wrapper">
			<view class="control-item">
				<i class="iconfont icon-liebiaoxunhuan control-icon-small" />
			</view>
			<view class="control-item">
				<i class="iconfont icon-shangyishou1 control-icon-medium" />
			</view>
			<view class="control-item play-btn" @click="handleTogglePlay">
				<i class="iconfont control-icon-large" :class="musicStore.state.isPlaying ? 'icon-zantingbofang1' : 'icon-bofang1'" />
			</view>
			<view class="control-item">
				<i class="iconfont icon-shangyishou control-icon-medium" />
			</view>
			<view class="control-item">
				<i class="iconfont icon-bofangliebiao control-icon-small" />
			</view>
		</view>

		<!-- 底部安全区 -->
		<view class="safe-bottom"></view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useMusicStore } from '@/utils/musicStore.js'

const musicStore = useMusicStore()

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

// rpx转px的比例（基于750设计稿）
const getRpxToPx = () => {
	const screenWidth = uni.getSystemInfoSync().windowWidth
	return screenWidth / 750
}

// 监听当前歌词索引变化，滚动到对应位置
watch(
	() => musicStore.state.currentLyricIndex,
	(newIndex) => {
		const ratio = getRpxToPx()
		const lineHeight = 70 * ratio // 每行歌词高度70rpx
		const placeholderHeight = 100 * ratio // 顶部占位100rpx
		const wrapperHeight = 280 * ratio // 歌词区域高度280rpx

		// 计算滚动位置，让当前歌词居中显示
		// 当前歌词的位置 = 占位高度 + 索引 * 行高
		// 要居中显示，需要滚动到：当前位置 - (容器高度/2) + (行高/2)
		const currentPosition = placeholderHeight + newIndex * lineHeight
		const scrollPosition = currentPosition - (wrapperHeight / 2) + (lineHeight / 2)

		lyricScrollTop.value = Math.max(0, scrollPosition)
	},
	{ immediate: true }
)

// 拖动状态
const isDragging = ref(false)
const dragProgress = ref(0)
const progressBarInfo = ref({ left: 0, width: 1 })

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

// 唱片区域
.disc-wrapper {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	padding: 40rpx;
	z-index: 5; // 唱片区域层级

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

			&.rotating {
				animation: rotate 20s linear infinite;
			}

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

	.lyric-scroll {
		height: 100%;
		text-align: center;

		.lyric-placeholder {
			height: 100rpx;
		}

		.lyric-line {
			min-height: 70rpx;
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

// 旋转动画
@keyframes rotate {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

// 无缝循环滚动动画（包含开头暂停效果）
// 动画说明：
// 0%-20%: 暂停2秒（总时长10秒的话）
// 20%-100%: 滚动一个完整周期（第一个文本+间距）
// 由于使用两份相同文本，滚动到 -50% 时刚好是一个完整循环
@keyframes marquee-seamless {
	0%, 20% {
		transform: translateX(0);
	}
	100% {
		transform: translateX(calc(-50% - 40rpx)); // 50% + 半个间距
	}
}
</style>
