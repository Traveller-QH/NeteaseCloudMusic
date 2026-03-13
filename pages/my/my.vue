<template>
	<view class="my-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

		<!-- 侧边栏 -->
		<Sidebar :show="showSidebar" @close="closeSidebar" />
		
		<!-- 自定义顶部导航栏 -->
		<view class="custom-navbar">
			<!-- 左侧菜单按钮 -->
			<view class="nav-left" @click="openSidebar">
				<i class="iconfont icon-caidanliebiao nav-icon" />
			</view>
			
			<!-- 中间标题 -->
			<view class="nav-title">我的</view>
			
			<!-- 右侧扫码按钮 -->
			<view class="nav-right" @click="() => {}">
				<i class="iconfont icon-saoma nav-icon" />
			</view>
		</view>
		
		<!-- 内容滚动区 -->
    <scroll-view scroll-y class="content-scroll" @scroll="onScroll">
			<!-- 顶部用户区域 -->
			<view class="user-section">
				<view class="user-bg"></view>
				<view class="user-content">
					<!-- 用户信息 -->
					<view class="user-info" @click="handleLogin">
						<view class="user-avatar">
							<image v-if="isLogin && userInfo?.avatarUrl" :src="userInfo.avatarUrl" mode="aspectFill" class="avatar-img"></image>
							<text v-else class="avatar-text">头像</text>
						</view>
						<view class="user-detail">
							<view class="user-name-row">
								<text class="user-name">{{ isLogin ? userInfo?.nickname : '点击登录' }}</text>
								<!-- VIP标签：根据vipType和redVipLevel显示完整等级 -->
								<view class="vip-tag" :class="vipTagClass" v-if="showVipTag">
									<text class="vip-text">{{ vipText }}</text>
								</view>
							</view>
							<view class="user-stats">
								<view class="stat-item">
									<text class="stat-num">{{ userInfo?.follows || 0 }}</text>
									<text class="stat-label">关注</text>
								</view>
								<view class="stat-divider"></view>
								<view class="stat-item">
									<text class="stat-num">{{ userInfo?.followeds || 0 }}</text>
									<text class="stat-label">粉丝</text>
								</view>
								<view class="stat-divider"></view>
								<view class="stat-item">
									<text class="stat-num">Lv.{{ userLevel }}</text>
									<text class="stat-label">等级</text>
								</view>
							</view>
						</view>
						<view class="user-arrow">
							<i class="iconfont icon-arrow-right arrow-icon" />
						</view>
					</view>
				</view>
			</view>
			
			<!-- 音乐服务 -->
			<view class="service-section">
				<view class="service-grid">
					<view class="service-item" v-for="(item, index) in services" :key="index">
						<view class="service-icon">
							<i class="iconfont service-iconfont" :class="'icon-' + item.icon" :style="{ color: item.color }" />
						</view>
						<text class="service-name">{{ item.name }}</text>
						<text class="service-count" v-if="item.count">{{ item.count }}</text>
					</view>
				</view>
			</view>
			<!-- 创建的歌单 -->
			<view class="playlist-section">
				<view class="section-header" @click="toggleCreated">
					<view class="header-left">
						<i class="iconfont header-arrow" :class="showCreated ? 'icon-xiajiantou' : 'icon-arrow-right'" />
						<text class="header-title">创建的歌单</text>
						<text class="header-count">({{ createdCount }}个)</text>
					</view>
					<view class="header-right">
						<text class="more-text">更多</text>
						<i class="iconfont icon-arrow-right more-arrow"></i>
					</view>
				</view>
				
				<view class="playlist-list" v-show="showCreated">
					<!-- 默认喜欢的音乐 -->
					<view class="playlist-item" v-if="!createdPlaylists?.length">
						<view class="playlist-cover like-cover">
							<i class="iconfont icon-woxihuande_on like-icon" />
						</view>
						<view class="playlist-info">
							<text class="playlist-name">我喜欢的音乐</text>
							<text class="playlist-meta">0首</text>
						</view>
						<view class="playlist-action">
						</view>
					</view>
					<!-- 真实歌单列表 -->
					<view class="playlist-item" v-for="(playlist, index) in createdPlaylists" :key="playlist?.id" @click="goToPlaylist(playlist?.id)">
						<view class="playlist-cover" :class="{ 'like-cover': index === 0 }">
							<image v-if="playlist?.coverImgUrl" :src="playlist?.coverImgUrl" mode="aspectFill" class="cover-img"></image>
							<i v-else-if="index === 0" class="iconfont icon-woxihuande_on like-icon" />
						</view>
						<view class="playlist-info">
							<text class="playlist-name">{{ playlist?.name }}</text>
							<text class="playlist-meta">{{ playlist?.trackCount }}首</text>
						</view>
						<view class="playlist-action">
						</view>
					</view>
				</view>
			</view>
			
			<!-- 收藏的歌单 -->
			<view class="playlist-section">
				<view class="section-header" @click="toggleCollected">
					<view class="header-left">
						<i class="iconfont header-arrow" :class="showCollected ? 'icon-xiajiantou' : 'icon-arrow-right'" />
						<text class="header-title">收藏的歌单</text>
						<text class="header-count">({{ collectedCount }}个)</text>
					</view>
					<view class="header-right">
						<text class="more-text">更多</text>
						<i class="iconfont icon-arrow-right more-arrow" />
					</view>
				</view>
				
				<view class="empty-tip" v-show="showCollected && !collectedPlaylists?.length">
					<text class="empty-text">暂无收藏的歌单</text>
				</view>
				<view class="playlist-list" v-show="showCollected && collectedPlaylists?.length">
					<view class="playlist-item" v-for="playlist in collectedPlaylists" :key="playlist?.id" @click="goToPlaylist(playlist?.id)">
						<view class="playlist-cover">
							<image v-if="playlist?.coverImgUrl" :src="playlist?.coverImgUrl" mode="aspectFill" class="cover-img"></image>
						</view>
						<view class="playlist-info">
							<text class="playlist-name">{{ playlist?.name }}</text>
							<text class="playlist-meta">{{ playlist?.trackCount }}首 · by {{ playlist?.creator?.nickname }}</text>
						</view>
						<view class="playlist-action">
							<i class="iconfont icon-gengduo more-icon"></i>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 最近播放 -->
			<view class="recent-section">
				<view class="section-header">
					<view class="header-left">
						<text class="header-title">最近播放</text>
					</view>
					<view class="header-right">
						<text class="more-text">更多</text>
						<i class="iconfont icon-arrow-right more-arrow" />
					</view>
				</view>
				
				<view class="recent-list">
					<!-- 无数据时的默认展示 -->
					<view class="empty-tip" v-if="!recentSongs?.length">
						<text class="empty-text">暂无播放记录</text>
					</view>
					<!-- 真实播放记录 -->
					<view class="recent-item" v-for="(song, index) in recentSongs" :key="song?.id" @click="playSong(song)">
						<view class="recent-cover">
							<image v-if="song?.al?.picUrl" :src="song?.al?.picUrl" mode="aspectFill" class="cover-img"></image>
							<view v-else class="cover-placeholder" :style="{ background: coverColors[index % 4] }">
								<text class="cover-text">{{ index + 1 }}</text>
							</view>
						</view>
						<view class="recent-info">
							<text class="recent-name">{{ song?.name }}</text>
							<text class="recent-artist">{{ getArtistNames(song?.ar) }}</text>
						</view>
						<view class="recent-action">
							<i class="iconfont icon-bofang1 play-icon"></i>
						</view>
					</view>
				</view>
			</view>
			
			
		</scroll-view>
		
		<!-- 播放控制条 -->
    <PlayBar class="play-bar" />
		
		<!-- 底部导航栏 -->
    <AppTabBar class="app-tabbar" :current-page="'my'" @tabChange="onTabChange" />
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/utils/userStore.js'
import { getUserDetail } from '@/utils/api.js'
import AppTabBar from '@/components/AppTabBar/AppTabBar.vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import PlayBar from '@/components/PlayBar/PlayBar.vue'

const userStore = useUserStore()

const showSidebar = ref(false)
const showCreated = ref(false)
const showCollected = ref(false)

// 滚动控制
const scrollTop = ref(0)

// 处理滚动事件（仅用于记录滚动位置，不干预滚动行为）
const onScroll = (e) => {
	const currentScrollTop = e.detail.scrollTop
	scrollTop.value = currentScrollTop
}

// 打开侧边栏
const openSidebar = () => {
	showSidebar.value = true
}

// 关闭侧边栏
const closeSidebar = () => {
	showSidebar.value = false
}

// 从 userStore 获取用户信息
const isLogin = computed(() => userStore.isLogin)
const userInfo = computed(() => userStore.userInfo)
const accountInfo = computed(() => userStore.accountInfo)
// 从 userStore 获取歌单和播放记录数据
const createdPlaylists = computed(() => userStore.createdPlaylists)
const collectedPlaylists = computed(() => userStore.collectedPlaylists)
const recentSongs = computed(() => userStore.recentSongs)

// 封面颜色
const coverColors = [
	'linear-gradient(135deg, #667eea, #764ba2)',
	'linear-gradient(135deg, #f093fb, #f5576c)',
	'linear-gradient(135deg, #4facfe, #00f2fe)',
	'linear-gradient(135deg, #43e97b, #38f9d7)'
]

// 服务项
const services = ref([
	{ name: '本地/下载', icon: 'xiazai', color: '#EC4141' },
	{ name: '云盘', icon: 'cunyunpan', color: '#5AC8FA' },
	{ name: '已购', icon: 'gaiicon-', color: '#FF9500' },
	{ name: '最近', icon: 'zuijinbofang', color: '#34C759' },
])

// 创建的歌单数量
const createdCount = computed(() => createdPlaylists.value?.length || 0)

// 收藏的歌单数量
const collectedCount = computed(() => collectedPlaylists.value?.length || 0)

// 切换创建的歌单
const toggleCreated = () => {
	showCreated.value = !showCreated.value
}

// 切换收藏的歌单
const toggleCollected = () => {
	showCollected.value = !showCollected.value
}

// 用户等级（从 userInfo 中获取）
const userLevel = computed(() => {
	return userInfo.value?.level || 0
})

// VIP类型
const vipType = computed(() => {
	return userStore.userInfo.vipType || 0
})

// 是否显示VIP标签（根据baoyueVersion判断：-2显示SVIP，1显示VIP，默认不显示）
const showVipTag = computed(() => {
	if (!isLogin.value) return false
	const baoyueVersion = accountInfo.value.baoyueVersion
	return baoyueVersion === -2 || baoyueVersion === 1
})

// VIP显示文本：baoyueVersion=-2显示SVIP，baoyueVersion=1显示VIP，其他情况不显示
const vipText = computed(() => {
	const baoyueVersion = accountInfo.value.baoyueVersion
	if (baoyueVersion === -2) return 'SVIP'
	if (baoyueVersion === 1) return 'VIP'
	return ''
})

// VIP标签样式类
const vipTagClass = computed(() => {
	const baoyueVersion = accountInfo.value.baoyueVersion
	if (baoyueVersion === -2) return 'vip-svip'
	if (baoyueVersion === 1) return 'vip-normal'
	return ''
})

// 获取歌手名称
const getArtistNames = (artists) => {
	if (!artists || !artists.length) return '未知歌手'
	return artists.map(a => a.name).join(' / ')
}

// 播放歌曲
const playSong = (song) => {
	if (!song || !song.id) return
	
	uni.navigateTo({
		url: `/pages/player/player?id=${song.id}`
	})
}

// 跳转到歌单页面
const goToPlaylist = (playlistId) => {
	if (!playlistId) return
	
	uni.navigateTo({
		url: `/pages/playlist/playlist?id=${playlistId}`
	})
}

// 点击登录
const handleLogin = () => {
	if (!isLogin.value) {
		// 跳转到登录页面
		uni.navigateTo({
			url: '/pages/login/login'
		})
	}
}

// 初始化数据
const initData = async () => {
	// console.log('我的页面 - 当前登录状态:', userStore.isLogin, 'userId:', userStore.userInfo.userId)
	
	// 确保即使未登录也有默认的空数组
	userStore.createdPlaylists = []
	userStore.collectedPlaylists = []
	userStore.recentSongs = []
	
	// 如果已经登录且有 userId，直接刷新数据
	if (userStore.isLogin && userStore.userInfo.userId) {
		// console.log('已登录，刷新用户数据')
		
		// 1. 先获取用户详情（包含等级、粉丝、关注等）
		try {
			const userDetailRes = await getUserDetail(userStore.userInfo.userId)
			if (userDetailRes && userDetailRes.code === 200 && userDetailRes.profile) {
				// 更新用户信息到 store（传递完整响应数据，因为 level 在根级别）
				userStore.updateUserInfo(userDetailRes)
				// console.log('用户详情获取成功:', userDetailRes.profile)
				
				// 2. 然后获取用户数据（歌单和播放记录）- 不要调用 refreshUserData，避免覆盖用户信息
				await Promise.all([
					userStore.fetchUserPlaylists(),
					userStore.fetchRecentSongs()
				])
			}
		} catch (error) {
			console.error('获取用户详情失败:', error)
		}
		return
	}
	
	// 未登录时，检查本地存储的 cookie 是否有效
	const cookie = uni.getStorageSync('cookie')
	if (cookie) {
		// console.log('有本地 cookie，检查登录状态')
		const loggedIn = await userStore.validateLoginStatus()
		// console.log('登录状态:', loggedIn)
		if (loggedIn) {
			// 获取用户详情
			try {
				const userDetailRes = await getUserDetail(userStore.userInfo.userId)
				if (userDetailRes && userDetailRes.code === 200 && userDetailRes.profile) {
					// 传递完整响应数据，因为 level 在根级别
					userStore.updateUserInfo(userDetailRes)
				}
			} catch (error) {
				console.error('获取用户详情失败:', error)
			}
			
			// 获取歌单和播放记录
			await Promise.all([
				userStore.fetchUserPlaylists(),
				userStore.fetchRecentSongs()
			])
		}
	} else {
		// console.log('无本地 cookie，未登录')
	}
}

// 使用 onShow 而不是 onMounted，确保每次进入页面都会刷新数据
// onShow(() => {
// 	initData()
// })

onMounted(() => {
  initData()
})

onUnmounted(() => {})

// tab切换
const onTabChange = (name) => {
	// console.log('Tab changed to:', name)
}


</script>

<style lang="scss" scoped>
.my-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
  background-color: white;
}

.custom-navbar {
  flex-shrink: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

// 顶部操作栏
.top-bar {
	height: 60rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 24rpx;
	background: #fff;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
  border-bottom: 1rpx solid #f0f0f0;
	
	.bar-left, .bar-right {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
    border-radius: 50%;
    transition: background-color 0.2s;
		
		.iconfont {
			font-size: 44rpx;
			color: #fff;
		}
	}
}

// 内容滚动区
.content-scroll {
  flex: 1;
  overflow-y: scroll;
  /* 删除 margin-top 和动态高度 */
}

.play-bar {
  flex-shrink: 0;
  height: 120rpx;
  margin: 0;
  padding: 0;
}

.app-tabbar {
  flex-shrink: 0;
  height: 100rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  box-sizing: content-box;
}

// 用户区域
.user-section {
	position: relative;
	
	.user-bg {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 360rpx;
		background: linear-gradient(180deg, #EC4141 0%, #FF6666 50%, #f5f5f5 100%);
	}
	
	.user-content {
		position: relative;
		z-index: 1;
		padding: 0 24rpx;
	}
}

// 用户信息
.user-info {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	
	.user-avatar {
		width: 120rpx;
		height: 120rpx;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 4rpx solid rgba(255, 255, 255, 0.5);
		
		.avatar-text {
			font-size: 24rpx;
			color: #fff;
		}
		
		.avatar-img {
			width: 100%;
			height: 100%;
			border-radius: 50%;
		}
	}
	
	.user-detail {
		flex: 1;
		margin-left: 24rpx;
		
		.user-name-row {
			display: flex;
			align-items: center;
			
			.user-name {
				font-size: 36rpx;
				font-weight: bold;
				color: #fff;
			}
			
			.vip-tag {
				margin-left: 16rpx;
				padding: 4rpx 12rpx;
				background: linear-gradient(90deg, #FFD700, #FFA500);
				border-radius: 16rpx;
								
				.vip-text {
					font-size: 20rpx;
					color: #8B4513;
					font-weight: 600;
					white-space: nowrap;
				}
								
				// SVIP样式 - 红金渐变
				&.vip-svip {
					background: linear-gradient(90deg, #FF4D4D, #FF8C00);
									
					.vip-text {
						color: #fff;
					}
				}
								
				// 普通VIP样式
				&.vip-normal {
					background: linear-gradient(90deg, #4A90E2, #007AFF);
									
					.vip-text {
						color: #fff;
					}
				}
			}
		}
		
		.user-stats {
			display: flex;
			align-items: center;
			margin-top: 16rpx;
			
			.stat-item {
				.stat-num {
					font-size: 28rpx;
					color: #fff;
					font-weight: 500;
				}
				
				.stat-label {
					font-size: 20rpx;
					color: rgba(255, 255, 255, 0.7);
					margin-left: 8rpx;
				}
			}
			
			.stat-divider {
				width: 2rpx;
				height: 24rpx;
				background: rgba(255, 255, 255, 0.3);
				margin: 0 24rpx;
			}
		}
	}
	
	.user-arrow {
		.arrow-icon {
			font-size: 40rpx;
			color: rgba(255, 255, 255, 0.6);
		}
	}
}

// 服务区域
.service-section {
	background: #fff;
	margin: 20rpx 24rpx 0;
	border-radius: 20rpx;
	padding: 30rpx 20rpx;
	position: relative;
	z-index: 2;
	
	.service-grid {
		display: flex;
		justify-content: space-around;
		
		.service-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			position: relative;
			
			.service-icon {
				width: 80rpx;
				height: 80rpx;
				background: #f5f5f5;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				
				.service-iconfont {
					font-size: 44rpx;
				}
			}
			
			.service-name {
				font-size: 22rpx;
				color: #333;
				margin-top: 12rpx;
			}
			
			.service-count {
				position: absolute;
				top: -8rpx;
				right: -8rpx;
				min-width: 32rpx;
				height: 32rpx;
				background: #EC4141;
				border-radius: 16rpx;
				font-size: 18rpx;
				color: #fff;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 0 8rpx;
			}
		}
	}
}



// 歌单section
.playlist-section {
	background: #fff;
	margin-top: 20rpx;
	
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24rpx;
		
		.header-left {
			display: flex;
			align-items: center;
			
			.header-arrow {
				font-size: 24rpx;
				color: #999;
			}
			
			.header-title {
				font-size: 28rpx;
				font-weight: 500;
				color: #333;
				margin-left: 12rpx;
			}
			
			.header-count {
				font-size: 24rpx;
				color: #999;
				margin-left: 8rpx;
			}
		}
		
		.header-right {
			display: flex;
			align-items: center;
			
			.more-text {
				font-size: 24rpx;
				color: #999;
			}
			
			.more-arrow {
				font-size: 28rpx;
				color: #999;
				margin-left: 4rpx;
			}
		}
	}
}

// 歌单列表
.playlist-list {
	.playlist-item {
		display: flex;
		align-items: center;
		padding: 16rpx 24rpx;
		
		.playlist-cover {
			width: 100rpx;
			height: 100rpx;
			border-radius: 12rpx;
			overflow: hidden;
			
			&.like-cover {
				background: #fee;
				display: flex;
				align-items: center;
				justify-content: center;
				
				.like-icon {
					font-size: 56rpx;
					color: #EC4141;
				}
			}
			
			.cover-img {
				width: 100%;
				height: 100%;
				border-radius: 12rpx;
			}
		}
		
		.playlist-info {
			flex: 1;
			margin-left: 20rpx;
			
			.playlist-name {
				display: block;
				font-size: 28rpx;
				color: #333;
			}
			
			.playlist-meta {
				display: block;
				font-size: 22rpx;
				color: #999;
				margin-top: 8rpx;
			}
		}
		
		.playlist-action {
			.more-icon {
				font-size: 40rpx;
				color: #ccc;
			}
		}
	}
}

// 空提示
.empty-tip {
	padding: 40rpx 24rpx;
	text-align: center;
	
	.empty-text {
		font-size: 26rpx;
		color: #999;
	}
}

// 最近播放
.recent-section {
	background: #fff;
	margin-top: 20rpx;
	padding: 24rpx;
	
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
		
		.header-title {
			font-size: 28rpx;
			font-weight: 500;
			color: #333;
		}
		
		.header-right {
			display: flex;
			align-items: center;
			
			.more-text {
				font-size: 24rpx;
				color: #999;
			}
			
			.more-arrow {
				font-size: 28rpx;
				color: #999;
				margin-left: 4rpx;
			}
		}
	}
}

// 最近列表
.recent-list {
	.recent-item {
		display: flex;
		align-items: center;
		padding: 16rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
		
		&:last-child {
			border-bottom: none;
		}
		
		.recent-cover {
			width: 90rpx;
			height: 90rpx;
			border-radius: 12rpx;
			overflow: hidden;
			
			.cover-img {
				width: 100%;
				height: 100%;
			}
			
			.cover-placeholder {
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				
				.cover-text {
					font-size: 32rpx;
					font-weight: bold;
					color: #fff;
				}
			}
		}
		
		.recent-info {
			flex: 1;
			margin-left: 20rpx;
			
			.recent-name {
				display: block;
				font-size: 28rpx;
				color: #333;
			}
			
			.recent-artist {
				display: block;
				font-size: 22rpx;
				color: #999;
				margin-top: 8rpx;
			}
		}
		
		.recent-action {
			.play-icon {
				font-size: 64rpx;
				color: #EC4141;
			}
		}
	}
}

// 底部占位（已移除）


</style>
