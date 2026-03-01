<template>
  <view class="discover-page">
    <!-- 侧边栏 -->
    <Sidebar :show="showSidebar" @close="closeSidebar"/>

    <!-- 自定义顶部导航栏 -->
    <view class="custom-navbar">
      <!-- 左侧菜单按钮 -->
      <view class="nav-left" @click="openSidebar">
        <i class="iconfont icon-caidanliebiao nav-icon" />
      </view>
      
      <!-- 中间搜索框 -->
      <view class="nav-search">
        <up-search 
          height="60"
          placeholder="搜索歌曲、歌手、专辑" 
          shape="round" 
          v-model="searchKey"
          :showAction="false"
          :disabled="true"
          @click="handleSearchClick"
        />
      </view>
      
      <!-- 右侧麦克风按钮 -->
      <view class="nav-right" @click="() => {}">
        <i class="iconfont icon-maikefeng nav-icon" />
      </view>
    </view>

    <!-- 内容滚动区域 -->
    <scroll-view scroll-y class="content-scroll" :style="{ height: scrollHeight }" :scroll-top="scrollTop"
                 @scroll="onScroll">

      <!-- 功能入口 -->
      <view class="quick-entry">
        <view class="entry-item" v-for="(item, index) in quickEntries" :key="index">
          <view class="entry-icon" :style="{ background: item.bgColor }">
            <text class="entry-date" v-if="item.showDate">{{ currentDay }}</text>
            <i v-else class="iconfont entry-iconfont" :class="'icon-' + item.icon"/>
          </view>
          <text class="entry-name">{{ item.name }}</text>
        </view>
      </view>

      <!-- 轮播图 -->
      <view class="banner-wrapper">
        <swiper class="banner-swiper" indicator-dots circular autoplay :interval="4000">
          <swiper-item v-for="(item, index) in banners" :key="index">
            <image class="banner-img" :src="item.imageUrl" mode="aspectFill" @click="handleBannerClick(item)"></image>
          </swiper-item>
        </swiper>
      </view>

      <!-- 推荐歌单 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">推荐歌单</text>
          <view class="section-more">
            <text class="more-text">更多</text>
            <i class="iconfont icon-arrow-right more-arrow"/>
          </view>
        </view>
        <view class="playlist-grid">
          <view class="playlist-item" v-for="(item, index) in playlists" :key="item.id"
                @click="goPlaylistDetail(item.id)">
            <view class="playlist-cover">
              <image class="cover-img" :src="item.picUrl" mode="aspectFill"></image>
              <view class="play-count">
                <i class="iconfont icon-bofang2 play-count-icon"/>
                <text class="count-num">{{ formatPlayCount(item.playCount) }}</text>
              </view>
            </view>
            <text class="playlist-name">{{ item.name }}</text>
          </view>
        </view>
      </view>

      <!-- 个性推荐 -->
      <view class="section personal-section">
        <view class="section-header">
          <text class="section-title">为你精选</text>
          <view class="section-more">
            <text class="more-text">播放全部</text>
            <i class="iconfont icon-arrow-right more-arrow"/>
          </view>
        </view>
        <view class="personal-list">
          <view class="personal-item" v-for="(item, index) in recommendSongs" :key="item.id" @click="playSong(item)">
            <view class="song-cover">
              <image class="cover-img" :src="item.picUrl || item.album?.picUrl" mode="aspectFill"></image>
            </view>
            <view class="song-info">
              <text class="song-name">{{ item.name }}</text>
              <text class="song-artist">{{ getArtistNames(item.song?.artists || item.artists) }}</text>
            </view>
            <view class="song-action">
              <i class="iconfont icon-bofang1 song-play-icon"/>
            </view>
          </view>
        </view>
      </view>

      <!-- 新歌速递 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">新歌速递</text>
          <view class="section-more">
            <text class="more-text">更多</text>
            <i class="iconfont icon-arrow-right more-arrow"/>
          </view>
        </view>
        <scroll-view scroll-x class="new-song-scroll">
          <view class="new-song-card" v-for="(item, index) in newSongs" :key="item.id" @click="playSong(item)">
            <view class="card-cover">
              <image class="cover-img" :src="item.album?.picUrl || item.picUrl" mode="aspectFill"></image>
              <view class="play-icon">
                <i class="iconfont icon-bofang1 card-play-icon"/>
              </view>
            </view>
            <view class="card-info">
              <text class="card-title">{{ item.name }}</text>
              <text class="card-artist">{{ getArtistNames(item.artists) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 热门话题 -->
      <view class="section topic-section">
        <view class="section-header">
          <text class="section-title">热门话题</text>
        </view>
        <view class="topic-list">
          <view class="topic-item" v-for="(item, index) in hotTopics" :key="index">
            <view class="topic-rank" :class="{ 'rank-top': index < 3 }">{{ index + 1 }}</view>
            <view class="topic-content">
              <text class="topic-title">#{{ item.title }}</text>
              <text class="topic-heat">{{ formatHotValue(item.participantCount) }}讨论</text>
            </view>
            <view class="topic-arrow">
              <i class="iconfont icon-arrow-right topic-arrow-icon"/>
            </view>
          </view>
        </view>
      </view>


    </scroll-view>

    <!-- 播放控制条 -->
    <PlayBar />
    
    <!--底部导航栏-->
    <AppTabBar :current-page="'discovery'" @tabChange="onTabChange"/>
  </view>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {getBanner, getPersonalized, getRecommendNewSong, getNewSongs, getHotTopic} from '@/utils/api.js'
import {useMusicStore} from '@/utils/musicStore.js'
import AppTabBar from '@/components/AppTabBar/AppTabBar.vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import PlayBar from '@/components/PlayBar/PlayBar.vue'

const musicStore = useMusicStore()

const activeTab = ref(0)
const showSidebar = ref(false)
const loading = ref(false)

// 滚动控制
const scrollTop = ref(0)
let lastScrollTop = 0

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

// 获取当前日期
const currentDay = computed(() => new Date().getDate())

// 快捷入口
const quickEntries = ref([
  {name: '每日推荐', icon: 'calendar', bgColor: 'linear-gradient(135deg, #EC4141, #FF6666)', showDate: true},
  {name: '私人fm', icon: 'FM', bgColor: 'linear-gradient(135deg, #5AC8FA, #007AFF)'},
  {name: '歌单', icon: 'gedan', bgColor: 'linear-gradient(135deg, #FFCC00, #FF9500)'},
  {name: '排行榜', icon: 'paihangbang', bgColor: 'linear-gradient(135deg, #34C759, #30D158)'},
  {name: '直播', icon: 'zhibo', bgColor: 'linear-gradient(135deg, #FF2D55, #FF6B8A)'},
])

// 搜索相关
const searchKey = ref('')

// 搜索点击处理
const handleSearchClick = () => {
	// 跳转到搜索页面或显示搜索界面
	uni.navigateTo({
		url: '/pages/search/search'
	})
}

// 轮播图数据
const banners = ref([])

// 推荐歌单
const playlists = ref([])

// 推荐歌曲
const recommendSongs = ref([])

// 新歌速递
const newSongs = ref([])

// 热门话题
const hotTopics = ref([])

// 滚动区域高度
const scrollHeight = ref('') // 动态计算高度

// 动态计算滚动区域高度
const calculateScrollHeight = () => {
	const systemInfo = uni.getSystemInfoSync()
	const windowHeight = systemInfo.windowHeight
	const statusBarHeight = systemInfo.statusBarHeight || 0
	const navbarHeight = 60 // 增大的导航栏高度
	const tabbarHeight = 50 // 底部导航栏高度
	const playbarHeight = 80 // 播放控制条高度
	const bottomSafeArea = systemInfo.safeAreaInsets?.bottom || 0 // 底部安全区域
	
	// 计算可用高度：窗口高度 - 状态栏 - 增大的导航栏 - 底部导航栏 - 播放控制条 - 底部安全区域
	const availableHeight = windowHeight - statusBarHeight - navbarHeight - tabbarHeight - playbarHeight - bottomSafeArea
	scrollHeight.value = availableHeight + 'px'
	
	// 调试信息
	// console.log('Discovery页面高度计算:', {
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

// 打开侧边栏
const openSidebar = () => {
  showSidebar.value = true
}

// 关闭侧边栏
const closeSidebar = () => {
  showSidebar.value = false
}

// tab切换
const onTabChange = (name) => {
	// 可以在这里添加业务逻辑
}

// 格式化播放数
const formatPlayCount = (count) => {
  if (!count) return '0'
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + '亿'
  } else if (count >= 10000) {
    return Math.floor(count / 10000) + '万'
  }
  return count.toString()
}

// 格式化热度值
const formatHotValue = (value) => {
  if (!value) return '0'
  if (value >= 10000) {
    return Math.floor(value / 10000) + '万'
  }
  return value.toString()
}

// 获取歌手名称
const getArtistNames = (artists) => {
  if (!artists || !artists.length) return '未知歌手'
  return artists.map(a => a.name).join(' / ')
}

// 轮播图点击
const handleBannerClick = (item) => {
  // 根据 targetType 跳转不同页面
}

// 跳转歌单详情
const goPlaylistDetail = (id) => {
  if (id) {
    uni.navigateTo({
      url: `/pages/playlist/playlist?id=${id}`
    })
  }
}

// 播放歌曲
const playSong = (song) => {
  if (song && song.id) {
    // 通过全局状态播放歌曲
    musicStore.playSongById(song.id)
    // 跳转到播放页面
    uni.navigateTo({
      url: `/pages/player/player?id=${song.id}`
    })
  }
}

// 获取轮播图数据
const fetchBanners = async () => {
  try {
    const res = await getBanner(0)
    if (res.code === 200) {
      banners.value = res.banners || []
    }
  } catch (error) {
    // console.error('获取轮播图失败:', error)
  }
}

// 获取推荐歌单
const fetchPlaylists = async () => {
  try {
    const res = await getPersonalized(6)
    if (res.code === 200) {
      playlists.value = res.result || []
    }
  } catch (error) {
    // console.error('获取推荐歌单失败:', error)
  }
}

// 获取推荐新音乐
const fetchRecommendSongs = async () => {
  try {
    const res = await getRecommendNewSong(3)
    if (res.code === 200) {
      recommendSongs.value = res.result || []
    }
  } catch (error) {
    // console.error('获取推荐歌曲失败:', error)
  }
}

// 获取新歌速递
const fetchNewSongs = async () => {
  try {
    const res = await getNewSongs(0)
    if (res.code === 200) {
      newSongs.value = (res.data || []).slice(0, 10)
    }
  } catch (error) {
    // console.error('获取新歌失败:', error)
  }
}

// 获取热门话题
const fetchHotTopics = async () => {
  try {
    const res = await getHotTopic(5)
    if (res.code === 200) {
      hotTopics.value = res.hot || []
    }
  } catch (error) {
    // console.error('获取热门话题失败:', error)
  }
}

// 初始化数据
const initData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchBanners(),
      fetchPlaylists(),
      fetchRecommendSongs(),
      fetchNewSongs(),
      fetchHotTopics()
    ])
  } finally {
    loading.value = false
  }
}

onMounted(() => {
	// 初始化高度计算
	calculateScrollHeight()
	
	// 监听屏幕尺寸变化（如旋转屏幕）
	// #ifdef H5
	window.addEventListener('resize', handleResize)
	// #endif
	
	// 设置浏览器标题
	// document.title = '网易云音乐'
	// 初始化数据
	initData()
})

onUnmounted(() => {
	// 清理事件监听器
	// #ifdef H5
	window.removeEventListener('resize', handleResize)
	// #endif
})
</script>

<style lang="scss" scoped>
.discover-page {
  min-height: 100vh;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

// 自定义顶部导航栏
.custom-navbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 60px; // 增大导航栏高度
	padding: 0 24rpx;
	background: #fff;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	border-bottom: 1rpx solid #f0f0f0;
	
	.nav-left, .nav-right {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 50%;
		transition: background-color 0.2s;
		
		&:active {
			background-color: #f0f0f0;
		}
		
		.nav-icon {
			font-size: 44rpx;
			color: #333;
		}
	}
	
	// 中间的搜索框
	.nav-search {
		flex: 1;
		margin: 0 20rpx;
		
		::v-deep .u-search {
			height: 60rpx; // 增加搜索框高度
			
			.u-search__content {
				height: 60rpx; // 增加搜索框内容高度
				border-radius: 25rpx; // 相应调整圆角
				
				.u-search__content__icon {
					font-size: 30rpx; // 增加图标大小
				}
				
				.u-search__content__input {
					font-size: 24rpx; // 增加文字大小
				}
			}
		}
	}
}

// 内容滚动区
.content-scroll {
	background: #f5f5f5;
	// 高度由JavaScript动态计算
	margin-top: 50px; // 为导航栏留出空间
	padding-top: 20rpx; // 适当的内容间距
}

// 快捷入口
.quick-entry {
  display: flex;
  justify-content: space-between;
  padding: 30rpx 24rpx;
  background: #fff;
  // 移除margin-top，使用滚动区域的padding-top来控制间距

  .entry-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .entry-icon {
      width: 90rpx;
      height: 90rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      .entry-date {
        font-size: 36rpx;
        font-weight: bold;
        color: #fff;
      }

      .entry-iconfont {
        font-size: 48rpx;
        color: #fff;
      }
    }

    .entry-name {
      font-size: 22rpx;
      color: #666;
      margin-top: 12rpx;
    }
  }
}

// 轮播图
.banner-wrapper {
  padding: 20rpx 24rpx;
  background: #fff;

  .banner-swiper {
    height: 260rpx;
    border-radius: 20rpx;
    overflow: hidden;
  }

  .banner-img {
    width: 100%;
    height: 100%;
    border-radius: 20rpx;
  }
}

// 通用section
.section {
  background: #fff;
  margin-top: 20rpx;
  padding: 24rpx;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;

    .section-title {
      font-size: 34rpx;
      font-weight: bold;
      color: #333;
    }

    .section-more {
      display: flex;
      align-items: center;

      .more-text {
        font-size: 24rpx;
        color: #999;
      }

      .more-arrow {
        font-size: 24rpx;
        color: #999;
        margin-left: 4rpx;
      }
    }
  }
}

// 歌单网格
.playlist-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  .playlist-item {
    width: calc(33.33% - 11rpx);

    .playlist-cover {
      position: relative;
      width: 100%;
      padding-bottom: 100%;
      border-radius: 16rpx;
      overflow: hidden;

      .cover-img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 16rpx;
      }

      .play-count {
        position: absolute;
        top: 8rpx;
        right: 8rpx;
        display: flex;
        align-items: center;
        background: rgba(0, 0, 0, 0.3);
        padding: 4rpx 10rpx;
        border-radius: 16rpx;

        .play-count-icon {
          font-size: 20rpx;
          color: #fff;
        }

        .count-num {
          font-size: 18rpx;
          color: #fff;
          margin-left: 4rpx;
        }
      }
    }

    .playlist-name {
      display: block;
      font-size: 24rpx;
      color: #333;
      margin-top: 12rpx;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
}

// 个性推荐列表
.personal-list {
  .personal-item {
    display: flex;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .song-cover {
      width: 90rpx;
      height: 90rpx;
      border-radius: 12rpx;
      overflow: hidden;

      .cover-img {
        width: 100%;
        height: 100%;
      }
    }

    .song-info {
      flex: 1;
      margin-left: 20rpx;

      .song-name {
        display: block;
        font-size: 28rpx;
        color: #333;
      }

      .song-artist {
        display: block;
        font-size: 22rpx;
        color: #999;
        margin-top: 8rpx;
      }
    }

    .song-action {
      .song-play-icon {
        font-size: 64rpx;
        color: #EC4141;
      }
    }
  }
}

// 新歌横向滚动
.new-song-scroll {
  white-space: nowrap;

  .new-song-card {
    display: inline-block;
    width: 240rpx;
    margin-right: 20rpx;

    .card-cover {
      width: 240rpx;
      height: 240rpx;
      border-radius: 16rpx;
      overflow: hidden;
      position: relative;

      .cover-img {
        width: 100%;
        height: 100%;
      }

      .play-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        .card-play-icon {
          font-size: 56rpx;
          color: rgba(255, 255, 255, 0.9);
        }
      }
    }

    .card-info {
      margin-top: 12rpx;

      .card-title {
        display: block;
        font-size: 26rpx;
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
}

// 热门话题
.topic-list {
  .topic-item {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .topic-rank {
      width: 40rpx;
      height: 40rpx;
      background: #eee;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24rpx;
      color: #666;
      font-weight: bold;

      &.rank-top {
        background: #EC4141;
        color: #fff;
      }
    }

    .topic-content {
      flex: 1;
      margin-left: 20rpx;

      .topic-title {
        display: block;
        font-size: 28rpx;
        color: #333;
      }

      .topic-heat {
        display: block;
        font-size: 22rpx;
        color: #999;
        margin-top: 6rpx;
      }
    }

    .topic-arrow {
      .topic-arrow-icon {
        font-size: 28rpx;
        color: #ccc;
      }
    }
  }
}

// 底部占位（已移除）


</style>