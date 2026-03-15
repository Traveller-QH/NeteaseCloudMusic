<template>
	<!-- 侧边栏遮罩 -->
	<view class="sidebar-mask" v-if="show" @click="$emit('close')"></view>
	
	<!-- 侧边栏 -->
	<view class="sidebar" :class="{ 'sidebar-show': show }">
		<view class="sidebar-header">
			<image class="sidebar-logo" src="/static/favicon.ico" mode="aspectFit"></image>
			<text class="sidebar-title">网易云音乐</text>
		</view>
		<view class="sidebar-menu">
      <!--<view class="menu-item">
        <i class="iconfont icon-shezhi" />
        <text class="menu-text">设置</text>
      </view>
      <view class="menu-item">
        <i class="iconfont icon-shensemoshi" />
        <text class="menu-text">深色模式</text>
        <up-switch size="20" activeColor="#EC4141"></up-switch>
      </view>
      <view class="menu-item">
        <i class="iconfont icon-xiaoxi" />
        <text class="menu-text">消息中心</text>
      </view>-->
      <view class="menu-item quality-dropdown-container">
        <view class="quality-dropdown-trigger" @click="toggleQualityDropdown">
          <i class="iconfont icon-zengqiangduijiangyinzhi" />
          <text class="menu-text">全局音质</text>
          <text class="menu-value">{{ currentQualityName }}</text>
          <i class="iconfont icon-arrow-down quality-arrow" :class="{ 'quality-arrow-up': showQualityDropdown }" />
        </view>
        
        <!-- 遮罩层 -->
        <view v-if="showQualityDropdown" class="quality-mask" @click="closeQualityDropdown"></view>
        
        <!-- 下拉框 -->
        <view v-if="showQualityDropdown" class="quality-dropdown">
          <view class="quality-dropdown-list">
            <view
              v-for="(quality, index) in qualityLevels"
              :key="quality.level"
              class="quality-dropdown-item"
              :class="{ active: musicStore.state.currentQuality === quality.level }"
              @click="selectQuality(quality.level)"
            >
              <view class="quality-dropdown-icon" :style="{ background: getQualityIconColor(quality.level) }">
                <text class="quality-dropdown-icon-text">{{ quality.icon }}</text>
              </view>
              <view class="quality-dropdown-info">
                <text class="quality-dropdown-name">{{ quality.name }}</text>
                <text class="quality-dropdown-desc">{{ quality.description }}</text>
              </view>
              <view v-if="musicStore.state.currentQuality === quality.level" class="quality-dropdown-checkmark">
                <i class="iconfont icon-duigou" />
              </view>
            </view>
          </view>
        </view>
      </view>
			<view class="menu-item">
        <i class="iconfont icon-dingshiguanbi" />
				<text class="menu-text">定时关闭</text>
			</view>
      <!--<view class="menu-item">
        <i class="iconfont icon-jiashimoshi" />
        <text class="menu-text">驾驶模式</text>
      </view>-->
		</view>
		<view class="sidebar-footer">
			<view class="footer-item">
        <i class="iconfont icon-bangzhuyufankui" />
				<text class="footer-text">帮助与反馈</text>
			</view>
			<view class="footer-item">
        <i class="iconfont icon-guanyu" />
				<text class="footer-text">关于</text>
			</view>
			<!-- 退出登录 -->
			<view class="footer-item logout-item" v-if="isLogin" @click="handleLogout">
				<text class="logout-icon">⏻</text>
				<text class="footer-text logout-text">退出登录</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/utils/userStore.js'
import { useMusicStore } from '@/utils/musicStore.js'

const userStore = useUserStore()
const musicStore = useMusicStore()

// 下拉框显示状态
const showQualityDropdown = ref(false)

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

defineProps({
	show: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['close'])

// 是否已登录
const isLogin = computed(() => userStore.isLogin)

// 当前音质显示名称
const currentQualityName = computed(() => {
	const quality = qualityLevels.find(q => q.level === musicStore.state.currentQuality)
	return quality ? quality.name : '标准'
})

// 切换下拉框显示状态
const toggleQualityDropdown = () => {
	showQualityDropdown.value = !showQualityDropdown.value
}

// 关闭下拉框
const closeQualityDropdown = () => {
	showQualityDropdown.value = false
}

// 选择音质
const selectQuality = async (level) => {
	if (level === musicStore.state.currentQuality) {
		showQualityDropdown.value = false
		return
	}
	
	// 关闭下拉框
	showQualityDropdown.value = false
	
	uni.showLoading({ title: '切换音质中...' })
	
	try {
		const success = await musicStore.switchGlobalQuality(level)
		uni.hideLoading()
		
		if (success) {
			uni.showToast({
				title: `全局音质已设置为${musicStore.getQualityName(level)}`,
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

// 简化处理：当页面切换时关闭下拉框
import { onMounted } from 'vue'

onMounted(() => {
	// 监听页面切换事件
	uni.$on('navigateTo', () => {
		showQualityDropdown.value = false
	})
	uni.$on('redirectTo', () => {
		showQualityDropdown.value = false
	})
	uni.$on('switchTab', () => {
		showQualityDropdown.value = false
	})
})

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

// 退出登录
const handleLogout = () => {
	// 先通知播放控制器降低层级，然后关闭侧边栏，再显示确认弹窗
	if (globalThis.appModalManager && typeof globalThis.appModalManager.showModal === 'function') {
		globalThis.appModalManager.showModal()
	}
	emit('close')
	// 使用 setTimeout 确保侧边栏完全关闭后再显示弹窗
	setTimeout(() => {
		uni.showModal({
			title: '提示',
			content: '确定要退出登录吗？',
			success: async (res) => {
				if (res.confirm) {
					console.log('[Sidebar] 用户确认退出登录')
					await userStore.logout()
					console.log('[Sidebar] 退出登录完成')
					uni.showToast({
						title: '已退出登录',
						icon: 'success'
					})
					// 退出登录后跳转到发现页面
					uni.reLaunch({
						url: '/pages/discovery/discovery'
					})
				}
				// 隐藏弹窗后恢复播放控制器层级
				if (globalThis.appModalManager && typeof globalThis.appModalManager.hideModal === 'function') {
					globalThis.appModalManager.hideModal()
				}
			},
			fail: () => {
				// 弹窗失败也需要恢复播放控制器层级
				if (globalThis.appModalManager && typeof globalThis.appModalManager.hideModal === 'function') {
					globalThis.appModalManager.hideModal()
				}
			}
		})
	}, 300) // 延迟时间应与侧边栏关闭动画时间匹配
}
</script>

<style lang="scss" scoped>
// 侧边栏遮罩
.sidebar-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 9999;
}

// 侧边栏
.sidebar {
	position: fixed;
	top: 0;
	left: -540rpx;
	width: 540rpx;
	height: 100vh;
	background: #fff;
	z-index: 10000;
	transition: left 0.3s ease;
	display: flex;
	flex-direction: column;
	
	&.sidebar-show {
		left: 0;
	}
	
	.sidebar-header {
		display: flex;
		align-items: center;
		padding: 80rpx 30rpx 40rpx;
		border-bottom: 1rpx solid #eee;
		
		.sidebar-logo {
			width: 60rpx;
			height: 60rpx;
			border-radius: 12rpx;
		}
		
		.sidebar-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
			margin-left: 20rpx;
		}
	}
	
	.sidebar-menu {
		flex: 1;
		padding: 20rpx 0;
		
		.menu-item {
			display: flex;
			align-items: center;
			padding: 30rpx;
			
			.menu-text {
				flex: 1;
				font-size: 28rpx;
				color: #333;
				margin-left: 24rpx;
			}
		}
	}
	
	.sidebar-footer {
		padding: 30rpx;
		border-top: 1rpx solid #eee;
		
		.footer-item {
			display: flex;
			align-items: center;
			padding: 20rpx 0;
			
			.footer-text {
				font-size: 24rpx;
				color: #999;
				margin-left: 16rpx;
			}
		}
		
		// 退出登录按钮样式
		.logout-item {
			margin-top: 20rpx;
			padding-top: 30rpx;
			border-top: 1rpx solid #eee;
			
			.logout-icon {
				font-size: 32rpx;
				color: #EC4141;
			}
			
			.logout-text {
				color: #EC4141;
			}
		}
	}
}

// 音质下拉框样式
.quality-dropdown-container {
	position: relative;
	
	.quality-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: transparent;
		z-index: 999;
	}
	
	.quality-dropdown-trigger {
		display: flex;
		align-items: center;
		cursor: pointer;
		transition: background 0.2s;
		
		&:active {
			background: #f5f5f5;
		}
		
		.menu-text {
			flex: 1;
			font-size: 28rpx;
			color: #333;
			margin-left: 24rpx;
		}
		
		.menu-value {
			font-size: 24rpx;
			color: #999;
			margin-left: 16rpx;
		}
		
		.quality-arrow {
			font-size: 24rpx;
			color: #999;
			margin-left: 8rpx;
			transition: transform 0.3s;
			
			&.quality-arrow-up {
				transform: rotate(180deg);
			}
		}
	}
	
	.quality-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: #fff;
		border: 1rpx solid #eee;
		border-radius: 12rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
		z-index: 1000;
		max-height: 600rpx;
		overflow-y: auto;
		
		.quality-dropdown-list {
			padding: 16rpx 0;
			
			.quality-dropdown-item {
				display: flex;
				align-items: center;
				padding: 20rpx 30rpx;
				transition: background 0.2s;
				
				&:active {
					background: #f5f5f5;
				}
				
				&.active {
					background: rgba(236, 65, 65, 0.05);
				}
				
				.quality-dropdown-icon {
					width: 60rpx;
					height: 60rpx;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
					box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
					
					.quality-dropdown-icon-text {
						font-size: 22rpx;
						font-weight: bold;
						color: #fff;
						font-family: Arial, sans-serif;
					}
				}
				
				.quality-dropdown-info {
					flex: 1;
					margin-left: 20rpx;
					display: flex;
					flex-direction: column;
					gap: 4rpx;
					
					.quality-dropdown-name {
						font-size: 26rpx;
						font-weight: 500;
						color: #333;
					}
					
					.quality-dropdown-desc {
						font-size: 20rpx;
						color: #999;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}
				}
				
				.quality-dropdown-checkmark {
					width: 36rpx;
					height: 36rpx;
					border-radius: 50%;
					background: #EC4141;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
					
					.icon-duigou {
						font-size: 20rpx;
						color: #fff;
					}
				}
			}
		}
	}
}
</style>
