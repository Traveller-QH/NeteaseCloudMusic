<template>
	<view class="fullscreen-lyric" v-if="visible">
		<scroll-view
			scroll-y
			class="lyric-scroll"
			:scroll-top="scrollTop"
			:scroll-with-animation="true"
			@touchstart="handleTouchStart"
			@touchmove="handleTouchMove"
			@touchend="handleTouchEnd"
		>
			<!-- 顶部占位 -->
			<view class="lyric-placeholder"></view>
			
			<!-- 歌词列表 -->
			<view
				class="lyric-line"
				v-for="(line, index) in lyrics"
				:key="index"
				:class="{ active: index === currentIndex }"
				:id="'lyric-' + index"
				:style="{ minHeight: lineHeightValue * rpxToPx + 'px' }"
			>
				<text class="lyric-text">{{ line.text }}</text>
				<!-- 翻译歌词 -->
				<text v-if="line.trans" class="lyric-trans">{{ line.trans }}</text>
			</view>
			
			<!-- 无歌词提示 -->
			<view v-if="!lyrics || lyrics.length === 0" class="lyric-empty">
				<text class="lyric-text">暂无歌词</text>
			</view>
			
			<!-- 底部占位 -->
			<view class="lyric-placeholder"></view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/utils/musicStore.js'

const props = defineProps({
	visible: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['close'])

const musicStore = useMusicStore()

// 歌词数据
const lyrics = computed(() => musicStore.state.lyrics || [])
// 当前歌词索引
const currentIndex = computed(() => musicStore.state.currentLyricIndex)
// 是否有翻译歌词（检查是否有任何一行有翻译）
const hasTranslation = computed(() => {
	return lyrics.value.some(line => line.trans && line.trans.trim())
})
// 根据是否有翻译动态设置行高
const lineHeightValue = computed(() => {
	// 有翻译：200rpx（容纳最多 4 行）
	// 无翻译：120rpx（适当宽松，容纳 1-2 行）
	return hasTranslation.value ? 200 : 120
})

// 滚动位置
const scrollTop = ref(0)
// 是否禁用自动滚动（用户正在触摸或刚触摸完）
const disableAutoScroll = ref(false)
// 触摸定时器
let touchTimer = null

// 触摸相关
let lastTouchTime = 0
let lastTouchY = 0

// rpx 转 px
const getRpxToPx = () => {
	const screenWidth = uni.getSystemInfoSync().windowWidth
	return screenWidth / 750
}

// rpxToPx 计算属性（用于模板）
const rpxToPx = computed(getRpxToPx)

// 计算并更新滚动位置
const updateScrollPosition = () => {
	if (!props.visible || currentIndex.value < 0 || !lyrics.value.length) {
		return
	}
	
	const ratio = getRpxToPx()
	// 根据是否有翻译使用动态行高
	const lineHeight = lineHeightValue.value * ratio // 动态行高：有翻译 200rpx，无翻译 100rpx
	const placeholderHeight = 50 * ratio // 顶部占位
	const wrapperHeight = 600 * ratio // 歌词区域高度
	
	// 计算滚动位置，让当前歌词居中显示
	const currentPosition = placeholderHeight + currentIndex.value * lineHeight
	const scrollPosition = currentPosition - (wrapperHeight / 2) + (lineHeight / 2)
	
	scrollTop.value = Math.max(0, scrollPosition)
}

// 监听当前歌词索引变化
watch(
	() => currentIndex.value,
	(newIndex) => {
		if (props.visible && !disableAutoScroll.value) {
			updateScrollPosition()
		}
	},
	{ immediate: true }
)

// 监听可见性变化
watch(
	() => props.visible,
	(newVal) => {
		if (newVal) {
			setTimeout(() => {
				updateScrollPosition()
			}, 100)
		}
	}
)

// 触摸开始
const handleTouchStart = (e) => {
	lastTouchTime = Date.now()
	lastTouchY = e.touches[0].clientY
	// 禁用自动滚动
	disableAutoScroll.value = true
	// 清除之前的定时器
	if (touchTimer) {
		clearTimeout(touchTimer)
	}
}

// 触摸移动
const handleTouchMove = (e) => {
	// 阻止默认行为
}

// 触摸结束
const handleTouchEnd = (e) => {
	const touchDuration = Date.now() - lastTouchTime
	const touchY = e.changedTouches[0].clientY
	const deltaY = touchY - lastTouchY
	
	// 如果是快速点击（不是滑动），关闭大屏歌词
	if (Math.abs(deltaY) < 10 && touchDuration < 300) {
		emit('close')
	} else {
		// 如果是滑动，2 秒后恢复自动滚动
		touchTimer = setTimeout(() => {
			disableAutoScroll.value = false
			// 恢复后立即更新到当前高亮行位置
			updateScrollPosition()
		}, 2000)
	}
}

onMounted(() => {
	// 初始更新
	if (props.visible) {
		setTimeout(() => {
			updateScrollPosition()
		}, 100)
	}
})

onUnmounted(() => {
	// 清理定时器
	if (touchTimer) {
		clearTimeout(touchTimer)
	}
})
</script>

<style lang="scss" scoped>
.fullscreen-lyric {
	position: absolute;
	top: 200rpx; // 导航栏下方
	left: 0;
	right: 0;
	bottom: 400rpx; // 进度条上方（进度条高度约 160rpx + padding）
	z-index: 100;
	//background: rgba(0, 0, 0, 0.85);
	transition: opacity 0.3s ease;
	overflow: hidden;
	
	.lyric-scroll {
		height: 100%;
		width: 100%;
		
		.lyric-placeholder {
			height: 200rpx;
		}
		
		.lyric-line {
			min-height: 120rpx; // 默认最小高度（会被内联样式覆盖）
			padding: 20rpx 60rpx;
			text-align: center;
			transition: all 0.3s ease;
			opacity: 0.5;
			
			.lyric-text {
				display: block;
				font-size: 32rpx;
				color: rgba(255, 255, 255, 0.6);
				line-height: 1.4;
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
				overflow: hidden;
				word-break: break-all;
				transition: all 0.3s ease;
			}
			
			// 翻译歌词样式
			.lyric-trans {
				display: block;
				font-size: 26rpx;
				color: rgba(255, 255, 255, 0.5);
				margin-top: 12rpx;
				line-height: 1.4;
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
				overflow: hidden;
				word-break: break-all;
				transition: all 0.3s ease;
			}
			
			&.active {
				opacity: 1;
				transform: scale(1.05);
				
				.lyric-text {
					font-size: 36rpx;
					color: #fff;
					font-weight: 500;
					-webkit-line-clamp: 3;
				}
				
				.lyric-trans {
					font-size: 28rpx;
					color: rgba(255, 255, 255, 0.8);
				}
			}
		}
		
		.lyric-empty {
			height: 120rpx;
			line-height: 120rpx;
			text-align: center;
			
			.lyric-text {
				font-size: 32rpx;
				color: rgba(255, 255, 255, 0.5);
			}
		}
	}
}
</style>
