<template>
	<view class="community-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

		<!-- 侧边栏 -->
		<Sidebar :show="showSidebar" @close="closeSidebar" />
		
		<!-- 合并的顶部导航栏 -->
		<view class="combined-navbar">
			<!-- 左侧菜单按钮 -->
			<view class="nav-left" @click="openSidebar">
				<i class="iconfont icon-caidanliebiao nav-icon" />
			</view>
			
			<!-- 中间标签页 -->
			<view class="nav-tabs">
				<text class="tab-item" :class="{ active: currentTab === 'recommend' }" @click="switchTab('recommend')">推荐</text>
				<text class="tab-item" :class="{ active: currentTab === 'follow' }" @click="switchTab('follow')">关注</text>
				<text class="tab-item" :class="{ active: currentTab === 'square' }" @click="switchTab('square')">广场</text>
			</view>
			
			<!-- 右侧搜索按钮 -->
			<view class="nav-right" @click="handleSearchClick">
				<i class="iconfont icon-sousuo nav-icon" />
			</view>
		</view>
		
		<!-- 内容区域 -->
    <scroll-view scroll-y class="content-scroll" @scroll="onScroll" @scrolltolower="loadMore">
			<!-- 热门话题入口 -->
			<view class="topic-entry" v-if="currentTab === 'recommend'">
				<scroll-view scroll-x class="topic-scroll">
					<view class="topic-tag" v-for="(tag, index) in hotTopics" :key="index">
						<text class="tag-text">#{{ tag }}</text>
					</view>
				</scroll-view>
			</view>
			
			<!-- 动态列表 -->
			<view class="moment-list">
				<view class="moment-item" v-for="(item, index) in moments" :key="index">
					<!-- 用户信息 -->
					<view class="moment-header">
						<view class="user-avatar" :style="{ background: item.avatarUrl ? 'transparent' : avatarColors[index % 4] }">
							<image v-if="item.avatarUrl" :src="item.avatarUrl" mode="aspectFill" class="avatar-img"></image>
							<text v-else class="avatar-text">{{ item.avatar }}</text>
						</view>
						<view class="user-info">
							<text class="user-name">{{ item.name }}</text>
							<text class="moment-time">{{ item.time }}</text>
						</view>
						<view class="moment-more">
							<i class="iconfont icon-gengduo more-icon" />
						</view>
					</view>
					
					<!-- 动态内容 -->
					<view class="moment-content">
						<text class="content-text">{{ item.content }}</text>
					</view>
					
					<!-- 歌曲卡片 -->
					<view class="song-card" v-if="item.song">
						<view class="card-cover" :style="{ background: coverColors[index % 4] }">
							<i class="iconfont icon-bofang card-play-icon" />
						</view>
						<view class="card-info">
							<text class="card-title">{{ item.song.name }}</text>
							<text class="card-artist">{{ item.song.artist }}</text>
						</view>
					</view>
					
					<!-- 图片展示 -->
					<view class="moment-images" v-if="item.images && item.images.length">
						<view class="image-grid" :class="'grid-' + Math.min(item.images.length, 3)">
							<view class="image-item" v-for="(img, imgIndex) in item.images.slice(0, 9)" :key="imgIndex">
								<image v-if="typeof img === 'string'" :src="img" mode="aspectFill" class="img-content"></image>
								<view v-else :style="{ background: imageColors[(index + imgIndex) % 4] }" class="img-placeholder">
									<text class="img-text">图{{ imgIndex + 1 }}</text>
								</view>
							</view>
						</view>
					</view>
					
					<!-- 话题标签 -->
					<view class="moment-tags" v-if="item.tags && item.tags.length">
						<text class="tag-item" v-for="(tag, tagIndex) in item.tags" :key="tagIndex">#{{ tag }}</text>
					</view>
					
					<!-- 互动区域 -->
					<view class="moment-actions">
						<view class="action-item">
							<i class="iconfont icon-fenxiang action-icon" />
							<text class="action-num">{{ item.shares || '' }}</text>
						</view>
						<view class="action-item">
							<i class="iconfont icon-pinglun action-icon" />
							<text class="action-num">{{ item.comments || '' }}</text>
						</view>
						<view class="action-item" :class="{ liked: item.liked }">
							<i class="iconfont action-icon" :class="item.liked ? 'icon-dianzan_kuai' : 'icon-dianzan'" />
							<text class="action-num" :class="{ 'text-red': item.liked }">{{ item.likes || '' }}</text>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 加载更多 -->
			<view class="load-more">
				<up-loading-icon size="20" v-if="loading"></up-loading-icon>
				<text class="load-text" v-else>上拉加载更多</text>
			</view>
			
			
		</scroll-view>

    <!-- 发布按钮（fixed 保留，因为它悬浮在内容之上） -->
    <view class="publish-btn">
      <i class="iconfont icon-bianji publish-icon" />
    </view>
		
		<!-- 播放控制条 -->
    <PlayBar class="play-bar" />
		
		<!-- 底部导航栏 -->
    <AppTabBar class="app-tabbar" :current-page="'community'" @tabChange="onTabChange" />
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getHotTopic, getEvent, getHotComment } from '@/utils/api.js'
import AppTabBar from '@/components/AppTabBar/AppTabBar.vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import PlayBar from '@/components/PlayBar/PlayBar.vue'

const currentTab = ref('recommend')
const activeTab = ref(3)  // 云村页面是第4个（索引为3）
const loading = ref(false)
const lasttime = ref(-1)
const showSidebar = ref(false)

// 滚动控制
const scrollTop = ref(0)
let lastScrollTop = 0

// 添加搜索相关变量
const searchKey = ref('')

// 打开侧边栏
const openSidebar = () => {
  showSidebar.value = true
}

// 关闭侧边栏
const closeSidebar = () => {
  showSidebar.value = false
}

// 搜索点击处理
const handleSearchClick = () => {
	// 跳转到搜索页面或显示搜索界面
	uni.navigateTo({
		url: '/pages/search/search'
	})
}

// 滚动区域高度
const scrollHeight = ref('') // 动态计算高度

// 动态计算滚动区域高度（调整为与discovery页面一致的高度）
const calculateScrollHeight = () => {
	const systemInfo = uni.getSystemInfoSync()
	const windowHeight = systemInfo.windowHeight
	const statusBarHeight = systemInfo.statusBarHeight || 0
	const navbarHeight = 60 // 调整为与discovery页面一致的导航栏高度
	const tabbarHeight = 40 // 底部导航栏高度
	const playbarHeight = 80 // 播放控制条高度
	const bottomSafeArea = systemInfo.safeAreaInsets?.bottom || 0 // 底部安全区域
	
	// 计算可用高度：窗口高度 - 状态栏 - 调整后的导航栏 - 底部导航栏 - 播放控制条 - 底部安全区域
	const availableHeight = windowHeight - statusBarHeight - navbarHeight - tabbarHeight - playbarHeight - bottomSafeArea
	scrollHeight.value = availableHeight + 'px'
	
	// 调试信息
	// console.log('Community页面高度计算:', {
	// 	windowHeight,
	// 	statusBarHeight,
	// 	navbarHeight,
	// 	tabbarHeight,
	// 	bottomSafeArea,
	// 	availableHeight,
	// 	finalHeight: scrollHeight.value
	// })
}

// 监听屏幕旋转和尺寸变化
let resizeTimer = null
const handleResize = () => {
	if (resizeTimer) clearTimeout(resizeTimer)
	resizeTimer = setTimeout(() => {
		calculateScrollHeight()
	}, 100)
}

// 处理滚动事件，防止滚动溢出
const onScroll = (e) => {
	const currentScrollTop = e.detail.scrollTop
	
	// 记录最后一次滚动位置
	lastScrollTop = currentScrollTop
	
	// 防止滚动溢出
	const maxScrollTop = e.target.scrollHeight - e.target.clientHeight
	if (currentScrollTop <= 0) {
		// 滚动到顶部时，锁定在顶部
		scrollTop.value = 0
	} else if (currentScrollTop >= maxScrollTop) {
		// 滚动到底部时，锁定在底部
		scrollTop.value = maxScrollTop
	}
}

// 热门话题
const hotTopics = ref([])

// 头像颜色
const avatarColors = [
	'linear-gradient(135deg, #EC4141, #FF6666)',
	'linear-gradient(135deg, #5AC8FA, #007AFF)',
	'linear-gradient(135deg, #FFCC00, #FF9500)',
	'linear-gradient(135deg, #34C759, #30D158)'
]

// 封面颜色
const coverColors = [
	'linear-gradient(135deg, #667eea, #764ba2)',
	'linear-gradient(135deg, #f093fb, #f5576c)',
	'linear-gradient(135deg, #4facfe, #00f2fe)',
	'linear-gradient(135deg, #43e97b, #38f9d7)'
]

// 图片颜色
const imageColors = [
	'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
	'linear-gradient(135deg, #ffecd2, #fcb69f)',
	'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
	'linear-gradient(135deg, #d299c2, #fef9d7)'
]

// 动态数据
const moments = ref([])

// 云村热评
const hotComments = ref([])

// 获取热门话题
const fetchHotTopics = async () => {
	try {
		const res = await getHotTopic(20)
		if (res.code === 200 && res.hot) {
			hotTopics.value = res.hot.map(item => item.title)
		}
	} catch (error) {
		// console.error('获取热门话题失败:', error)
		// 使用默认话题
		hotTopics.value = ['每日心情', '音乐故事', '听歌感悟', '分享好歌', '歌词共鸣', '情感电台']
	}
}

// 获取动态消息
const fetchEvents = async (isLoadMore = false) => {
	try {
		const res = await getEvent(20, isLoadMore ? lasttime.value : -1)
		if (res.code === 200 && res.event) {
			const newMoments = res.event.map(item => {
				const json = item.json ? JSON.parse(item.json) : {}
				return {
					id: item.id,
					avatar: item.user?.nickname?.charAt(0) || '云',
					name: item.user?.nickname || '云村用户',
					avatarUrl: item.user?.avatarUrl,
					time: formatTime(item.eventTime),
					content: json.msg || item.info?.commentThread?.resourceTitle || '',
					song: json.song ? { name: json.song.name, artist: json.song.artists?.map(a => a.name).join('/') } : null,
					images: item.pics?.map(p => p.originUrl) || [],
					tags: [],
					shares: item.info?.shareCount || 0,
					comments: item.info?.commentCount || 0,
					likes: item.info?.likedCount || 0,
					liked: false
				}
			})
			
			if (isLoadMore) {
				moments.value.push(...newMoments)
			} else {
				moments.value = newMoments
			}
			
			lasttime.value = res.lasttime
		}
	} catch (error) {
		// console.error('获取动态失败:', error)
		// 使用默认数据
		if (!isLoadMore && moments.value.length === 0) {
			moments.value = getDefaultMoments()
		}
	}
}

// 获取云村热评
const fetchHotComments = async () => {
	try {
		const res = await getHotComment()
		if (res.code === 200 && res.data) {
			hotComments.value = res.data.slice(0, 10)
		}
	} catch (error) {
		// console.error('获取热评失败:', error)
	}
}

// 格式化时间
const formatTime = (timestamp) => {
	if (!timestamp) return ''
	const now = Date.now()
	const diff = now - timestamp
	const minute = 60 * 1000
	const hour = 60 * minute
	const day = 24 * hour
	
	if (diff < minute) return '刚刚'
	if (diff < hour) return Math.floor(diff / minute) + '分钟前'
	if (diff < day) return Math.floor(diff / hour) + '小时前'
	if (diff < 7 * day) return Math.floor(diff / day) + '天前'
	
	const date = new Date(timestamp)
	return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 标签页切换
const switchTab = (tab) => {
	currentTab.value = tab
}

// 默认动态数据
const getDefaultMoments = () => [
	{
		id: 1,
		avatar: '云',
		name: '音乐爱好者',
		time: '2小时前',
		content: '每次听到这首歌都会想起那段美好的时光，音乐真的有治愈人心的力量✨ #音乐故事',
		song: { name: '晴天', artist: '周杰伦' },
		tags: ['音乐故事', '回忆'],
		shares: 12,
		comments: 45,
		likes: 328,
		liked: false
	},
	{
		id: 2,
		avatar: '乐',
		name: '民谣电台',
		time: '5小时前',
		content: '"我们都在努力生活，希望你也是。" 这句歌词击中了多少人的心？',
		song: { name: '平凡之路', artist: '朴树' },
		shares: 56,
		comments: 128,
		likes: 1024,
		liked: true
	}
]

const loadMore = async () => {
	if (loading.value) return
	loading.value = true
	await fetchEvents(true)
	loading.value = false
}

// 初始化数据
const initData = async () => {
	loading.value = true
	await Promise.all([
		fetchHotTopics(),
		fetchEvents(),
		fetchHotComments()
	])
	loading.value = false
}

onMounted(() => {
	// 初始化高度计算
	calculateScrollHeight()
	
	// 监听屏幕尺寸变化（如旋转屏幕）
	// #ifdef H5
	window.addEventListener('resize', handleResize)
	// #endif
	
	initData()
})

onUnmounted(() => {
	// 清理事件监听器
	// #ifdef H5
	window.removeEventListener('resize', handleResize)
	// #endif
})

// tab切换
const onTabChange = (name) => {
	// 可以在这里添加业务逻辑
}

</script>

<style lang="scss" scoped>
.community-page {
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

.combined-navbar {
  flex-shrink: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  /* 删除 position: fixed 相关 */
}

// 内容滚动
.content-scroll {
  flex: 1;
  overflow-y: scroll;
  /* 删除 margin-top */
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

.publish-btn {
  position: fixed;
  right: 30rpx;
  bottom: calc(120rpx + 100rpx + env(safe-area-inset-bottom)); /* 调整位置避免遮挡 */
  /* 或保持原样，根据需求 */
}

// 话题入口
.topic-entry {
	background: #fff;
	padding: 20rpx 24rpx;
	
	.topic-scroll {
		white-space: nowrap;
		
		.topic-tag {
			display: inline-block;
			padding: 12rpx 24rpx;
			background: #f5f5f5;
			border-radius: 24rpx;
			margin-right: 16rpx;
			
			.tag-text {
				font-size: 24rpx;
				color: #666;
			}
		}
	}
}

// 动态列表
.moment-list {
	.moment-item {
		background: #fff;
		margin-top: 20rpx;
		padding: 24rpx;
		
		// 用户头部
		.moment-header {
			display: flex;
			align-items: center;
			
			.user-avatar {
				width: 80rpx;
				height: 80rpx;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				overflow: hidden;
				
				.avatar-text {
					font-size: 28rpx;
					color: #fff;
					font-weight: bold;
				}
				
				.avatar-img {
					width: 100%;
					height: 100%;
				}
			}
			
			.user-info {
				flex: 1;
				margin-left: 16rpx;
				
				.user-name {
					display: block;
					font-size: 28rpx;
					color: #333;
					font-weight: 500;
				}
				
				.moment-time {
					display: block;
					font-size: 22rpx;
					color: #999;
					margin-top: 4rpx;
				}
			}
			
			.moment-more {
				.more-icon {
					font-size: 40rpx;
					color: #999;
				}
			}
		}
		
		// 内容
		.moment-content {
			margin-top: 20rpx;
			
			.content-text {
				font-size: 28rpx;
				color: #333;
				line-height: 1.6;
			}
		}
		
		// 歌曲卡片
		.song-card {
			display: flex;
			align-items: center;
			background: #f8f8f8;
			padding: 16rpx;
			border-radius: 12rpx;
			margin-top: 20rpx;
			
			.card-cover {
				width: 90rpx;
				height: 90rpx;
				border-radius: 10rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				
				.card-play-icon {
					font-size: 56rpx;
					color: rgba(255, 255, 255, 0.9);
				}
			}
			
			.card-info {
				flex: 1;
				margin-left: 16rpx;
				
				.card-title {
					display: block;
					font-size: 28rpx;
					color: #333;
				}
				
				.card-artist {
					display: block;
					font-size: 22rpx;
					color: #999;
					margin-top: 6rpx;
				}
			}
		}
		
		// 图片网格
		.moment-images {
			margin-top: 20rpx;
			
			.image-grid {
				display: flex;
				flex-wrap: wrap;
				gap: 8rpx;
				
				&.grid-1 .image-item {
					width: 400rpx;
					height: 400rpx;
				}
				
				&.grid-2 .image-item,
				&.grid-3 .image-item {
					width: calc(33.33% - 6rpx);
					padding-bottom: calc(33.33% - 6rpx);
				}
				
				.image-item {
					width: calc(33.33% - 6rpx);
					padding-bottom: calc(33.33% - 6rpx);
					border-radius: 8rpx;
					position: relative;
					overflow: hidden;
					
					.img-content {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
					}
					
					.img-placeholder {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
						display: flex;
						align-items: center;
						justify-content: center;
					}
					
					.img-text {
						font-size: 24rpx;
						color: #666;
					}
				}
			}
		}
		
		// 话题标签
		.moment-tags {
			margin-top: 16rpx;
			
			.tag-item {
				font-size: 26rpx;
				color: #5AC8FA;
				margin-right: 16rpx;
			}
		}
		
		// 互动区域
		.moment-actions {
			display: flex;
			justify-content: flex-end;
			margin-top: 24rpx;
			padding-top: 20rpx;
			border-top: 1rpx solid #f5f5f5;
			
			.action-item {
				display: flex;
				align-items: center;
				margin-left: 50rpx;
				
				.action-icon {
					font-size: 36rpx;
					color: #999;
				}
				
				&.liked .action-icon {
					color: #EC4141;
				}
				
				.action-num {
					font-size: 24rpx;
					color: #999;
					margin-left: 8rpx;
					
					&.text-red {
						color: #EC4141;
					}
				}
			}
		}
	}
}

// 加载更多
.load-more {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 30rpx;
	
	.load-text {
		font-size: 24rpx;
		color: #999;
	}
}

// 底部占位（已移除）

// 发布按钮
.publish-btn {
	position: fixed;
	right: 30rpx;
	bottom: 120rpx;
	width: 100rpx;
	height: 100rpx;
	background: #EC4141;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 30rpx rgba(236, 65, 65, 0.4);
	z-index: 101;
	
	.publish-icon {
		font-size: 52rpx;
		color: #fff;
	}
}


</style>
