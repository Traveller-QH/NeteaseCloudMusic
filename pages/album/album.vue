<template>
  <view class="album-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="handleBack">
        <i class="iconfont icon-arrow-left nav-icon"/>
      </view>
      <view class="nav-title">
        <text>专辑</text>
      </view>
      <view class="nav-right">
        <i class="iconfont icon-sousuo nav-icon"/>
      </view>
    </view>

    <!-- 专辑信息头部 -->
    <view class="album-header" v-if="albumInfo">
      <image class="cover" :src="albumInfo.picUrl || albumInfo.cover" mode="aspectFill"></image>
      <view class="info">
        <text class="name">{{ albumInfo.name }}</text>
        <view class="artist">
          <text class="artist-text">{{ formatArtists(albumInfo.artists || [albumInfo.artist]) }}</text>
        </view>
        <text class="desc" v-if="albumInfo.description || albumInfo.desc" @click.stop="openAlbumDetail">{{ albumInfo.description || albumInfo.desc }}</text>
        <text class="publish-time" v-if="albumInfo.publishTime">发行时间：{{ formatDate(albumInfo.publishTime) }}</text>
      </view>
    </view>

    <!-- 功能按钮栏 -->
    <view class="action-bar" v-if="albumInfo">
      <view class="action-btn" @click="toggleFavorite">
        <i class="iconfont" :class="isFavorite ? 'icon-chenggong' : 'icon-a-shoucangweishoucang2'"/>
        <text class="count">{{ favoriteCount }}</text>
      </view>
      <view class="action-btn" @click="goToComments">
        <i class="iconfont icon-pinglun"/>
        <text class="count">{{ commentCount }}</text>
      </view>
      <view class="action-btn" @click="handleShare">
        <i class="iconfont icon-fenxiang"/>
        <text class="count">{{ shareCount }}</text>
      </view>
    </view>

    <!-- 播放全部按钮 -->
    <view class="play-all-bar">
      <view class="play-all" @click="handlePlayAll">
        <i class="iconfont icon-bofang1 play-icon"/>
        <text class="text">播放全部</text>
        <text class="count">({{ songList.length }}首)</text>
      </view>
    </view>

    <!-- 歌曲列表 -->
    <scroll-view
        scroll-y
        class="song-list-scroll"
        @scrolltolower="handleLoadMore"
        :lower-threshold="100"
    >
      <view
          class="song-item"
          v-for="(song, index) in songList"
          :key="song.id"
          @click="handlePlaySong(song)"
      >
        <view class="index">{{ index + 1 }}</view>
        <view class="song-info">
          <text class="song-name">{{ song.name }}</text>
          <text class="song-artist">{{ getArtistNames(song) }}</text>
        </view>
        <view class="song-action">
          <i class="iconfont icon-gengduo action-icon"/>
        </view>
      </view>

      <!-- 加载中状态 -->
      <view class="loading-wrapper" v-if="loading">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 加载更多状态 -->
      <view class="load-more-wrapper" v-if="!loading && hasMore">
        <text class="load-more-text">上拉加载更多</text>
      </view>

      <!-- 没有更多数据 -->
      <view class="no-more-wrapper" v-if="!hasMore && songList.length > 0">
        <text class="no-more-text">已经到底了</text>
      </view>

      <!-- 空状态 -->
      <view class="empty-wrapper" v-if="!loading && songList.length === 0">
        <text class="empty-text">暂无歌曲</text>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部播放控制条（普通块） -->
    <PlayBar />

    <!-- 专辑详情弹窗 -->
    <view class="album-detail-popup" v-if="showAlbumDetail" @click="closeAlbumDetail">
      <view class="popup-mask"></view>
      <view class="popup-content" @click.stop>
        <!-- 顶部导航栏 -->
        <view class="popup-header">
          <view class="header-left"></view>
          <view class="header-right" @click="closeAlbumDetail">
            <i class="iconfont icon-guanbi"/>
          </view>
        </view>

        <!-- 专辑封面和名称 -->
        <view class="album-cover-section">
          <image class="album-cover" :src="albumInfo?.picUrl || albumInfo?.cover" mode="aspectFill"/>
          <text class="album-name">{{ albumInfo?.name }}</text>
          <text class="album-alias" v-if="albumInfo?.alias && albumInfo.alias.length > 0">{{ albumInfo.alias[0] }}</text>
        </view>

        <!-- 专辑详细信息 -->
        <view class="album-detail-section">
          <view class="detail-row" v-if="albumInfo?.company">
            <text class="detail-label">发行公司：</text>
            <text class="detail-value">{{ albumInfo.company }}</text>
          </view>
          <view class="detail-row" v-if="albumInfo?.subType">
            <text class="detail-label">专辑类别：</text>
            <text class="detail-value">{{ albumInfo.subType }}</text>
          </view>
          <view class="detail-row" v-if="albumInfo?.description">
            <text class="detail-label">专辑介绍：</text>
            <text class="detail-value detail-desc">{{ albumInfo.description }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {getAlbum, getAlbumSongs, getAlbumDetailDynamic, toggleAlbumSub} from '@/utils/api.js'
import {useMusicStore} from '@/utils/musicStore.js'
import PlayBar from '@/components/PlayBar/PlayBar.vue'

const musicStore = useMusicStore()

// 专辑 ID
const albumId = ref('')
// 专辑信息
const albumInfo = ref(null)
// 歌曲列表
const songList = ref([])
// 加载状态
const loading = ref(false)
// 是否还有更多数据
const hasMore = ref(true)
// 分页参数
const pageSize = 30
const currentOffset = ref(0)
// 歌曲总数
const totalSongs = ref(0)

// 收藏状态
const isFavorite = ref(false)
// 收藏数
const favoriteCount = ref(0)
// 评论数
const commentCount = ref(0)
// 分享数
const shareCount = ref(0)
// 是否显示专辑详情弹窗
const showAlbumDetail = ref(false)

// 获取歌手名称
const getArtistNames = (song) => {
  const artists = song.ar || song.artists || []
  if (!artists.length) return '未知歌手'
  return artists.map(a => a.name).join(' / ')
}

// 格式化艺术家名称
const formatArtists = (artists) => {
  if (!artists) return '未知'
  return artists.map(artist => artist.name).join('/')
}

// 打开专辑详情弹窗
const openAlbumDetail = () => {
  showAlbumDetail.value = true
}

// 关闭专辑详情弹窗
const closeAlbumDetail = () => {
  showAlbumDetail.value = false
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

// 获取专辑详情
const fetchAlbumDetail = async (id) => {
  try {
    const res = await getAlbum(id)
    if (res.code === 200 && res.album) {
      albumInfo.value = res.album
      // 从专辑详情中获取歌曲总数
      if (res.album.size) {
        totalSongs.value = res.album.size
      }
      
      // 获取专辑动态信息（包含收藏数、评论数等）
      fetchAlbumDynamic(id)
    }
  } catch (error) {
    console.error('获取专辑详情失败:', error)
  }
}

// 获取专辑动态信息
const fetchAlbumDynamic = async (id) => {
  try {
    const res = await getAlbumDetailDynamic(id)
    // console.log('专辑动态信息响应:', res)
    if (res.code === 200) {
      // 根据实际返回的字段名赋值（数据在根级别）
      favoriteCount.value = res.subCount || 0
      commentCount.value = res.commentCount || 0
      shareCount.value = res.shareCount || 0
      isFavorite.value = res.isSub || false
    }
  } catch (error) {
    console.error('获取专辑动态信息失败:', error)
  }
}

// 获取专辑歌曲
const fetchSongs = async (id, isLoadMore = false) => {
  if (loading.value) return

  // 如果不是加载更多，重置分页参数
  if (!isLoadMore) {
    currentOffset.value = 0
    songList.value = []
    hasMore.value = true
  }

  // 如果没有更多数据，直接返回
  if (!hasMore.value && isLoadMore) return

  loading.value = true
  try {
    const res = await getAlbumSongs(id)
    
    if (res.code === 200 && res.songs) {
      // 追加歌曲到列表
      if (isLoadMore) {
        songList.value.push(...res.songs)
      } else {
        songList.value = res.songs
      }

      // 更新偏移量
      currentOffset.value += res.songs.length

      // 判断是否还有更多数据
      if (res.songs.length < pageSize) {
        hasMore.value = false
      } else if (totalSongs.value > 0) {
        hasMore.value = currentOffset.value < totalSongs.value
      }
    } else {
      // 接口返回异常，没有更多数据
      hasMore.value = false
    }
  } catch (error) {
    console.error('获取专辑歌曲失败:', error)
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 加载更多
const handleLoadMore = () => {
  if (albumId.value && hasMore.value && !loading.value) {
    fetchSongs(albumId.value, true)
  }
}

// 播放歌曲
const handlePlaySong = async (song) => {
  // 如果已经有预加载数据且已加载完成，直接使用
  const preloadData = musicStore.getPreloadData()
  
  if (preloadData.playlistId === albumId.value && 
      preloadData.songs.length > 0 && 
      !preloadData.hasMore) {
    // 预加载数据已完成，直接设置播放列表
    const songIndex = preloadData.songs.findIndex(s => String(s.id) === String(song.id))
    musicStore.setPlaylist(preloadData.songs, song.id)
    musicStore.playFromPlaylist(songIndex >= 0 ? songIndex : 0)
    
    uni.navigateTo({
      url: `/pages/player/player?id=${song.id}`
    })
    return
  }
  
  // 如果正在加载中，先跳转播放，加载会在后台继续
  if (preloadData.isLoadingAll && preloadData.loadAllPromise) {
    // 不显示 loading，直接跳转播放当前歌曲
    musicStore.addToPlaylist(song)
    uni.navigateTo({
      url: `/pages/player/player?id=${song.id}`
    })
    
    // 在后台等待加载完成，然后更新播放列表
    try {
      await preloadData.loadAllPromise
      // 加载完成后，更新播放列表 (用户可能已经在听歌了)
      const updatedPreloadData = musicStore.getPreloadData()
      const songIndex = updatedPreloadData.songs.findIndex(s => String(s.id) === String(song.id))
      if (songIndex >= 0) {
        musicStore.setPlaylist(updatedPreloadData.songs, song.id)
        musicStore.playFromPlaylist(songIndex)
      }
    } catch (error) {
      console.error('后台加载全部歌曲失败:', error)
      // 后台加载失败不影响当前播放
    }
    return
  }
  
  // 没有预加载数据或未完成，先跳转播放，同时在后台加载
  // 先添加当前歌曲到播放列表
  musicStore.addToPlaylist(song)
  
  // 立即跳转播放
  uni.navigateTo({
    url: `/pages/player/player?id=${song.id}`
  })
  
  // 在后台开始全量加载 (不阻塞 UI)
  try {
    // 全量加载专辑歌曲
    await musicStore.loadAllSongsForPlaylist(albumId.value, async (size, offset) => {
      return await getAlbumSongs(albumId.value)
    }, {
      pageSize: 100,
      maxSongs: 1000,
      delayMs: 50,
      onProgress: (progress) => {
        // 后台加载不显示进度提示，避免干扰用户
        console.log(`后台加载进度：${progress.loaded}/${progress.total || '?'}`)
      }
    })
    
    // 加载完成后，更新播放列表
    const updatedPreloadData = musicStore.getPreloadData()
    const songIndex = updatedPreloadData.songs.findIndex(s => String(s.id) === String(song.id))
    if (songIndex >= 0) {
      musicStore.setPlaylist(updatedPreloadData.songs, song.id)
      musicStore.playFromPlaylist(songIndex)
    }
  } catch (error) {
    console.error('后台加载全部歌曲失败:', error)
    // 后台加载失败不影响当前播放
  }
}

// 播放全部
const handlePlayAll = () => {
  if (songList.value.length > 0) {
    handlePlaySong(songList.value[0])
  }
}

// 收藏/取消收藏
const toggleFavorite = async () => {
  try {
    const t = isFavorite.value ? 0 : 1
    const res = await toggleAlbumSub(albumId.value, t)
    if (res.code === 200) {
      isFavorite.value = !isFavorite.value
      favoriteCount.value += isFavorite.value ? 1 : -1
      uni.showToast({
        title: isFavorite.value ? '已收藏' : '已取消收藏',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 跳转到评论区
const goToComments = () => {
  uni.navigateTo({
    url: `/pages/albumComments/albumComments?id=${albumId.value}&commentCount=${commentCount.value}`
  })
}

// 分享
const handleShare = () => {
  uni.showToast({
    title: '分享功能开发中',
    icon: 'none'
  })
}

// 返回上一页
const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({
      url: '/pages/discovery/discovery'
    })
  }
}

// 页面加载
onMounted(async () => {
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || currentPage.$page?.options || {}

  if (options.id) {
    albumId.value = options.id
    // 先获取专辑详情
    await fetchAlbumDetail(options.id)
    // 获取第一页歌曲
    fetchSongs(options.id, false)
  }
})
</script>

<style lang="scss" scoped>
@import '@/static/iconfont/iconfont.css';

.album-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #EC4141 0%, #f5f5f5 400rpx);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
}

// 顶部导航
.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;

  .nav-left, .nav-right {
    width: 80rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-icon {
    font-size: 44rpx;
    color: #fff;
  }

  .nav-title {
    flex: 1;
    text-align: center;

    text {
      font-size: 34rpx;
      font-weight: bold;
      color: #fff;
    }
  }
}

// 专辑信息头部
.album-header {
  display: flex;
  padding: 20rpx 30rpx 40rpx;

  .cover {
    width: 240rpx;
    height: 240rpx;
    border-radius: 16rpx;
    flex-shrink: 0;
  }

  .info {
    flex: 1;
    margin-left: 30rpx;
    display: flex;
    flex-direction: column;

    .name {
      font-size: 32rpx;
      font-weight: bold;
      color: #fff;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .artist {
      margin-top: 12rpx;

      .artist-text {
        font-size: 26rpx;
        color: rgba(255, 255, 255, 0.9);
      }
    }

    .desc {
      font-size: 22rpx;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 16rpx;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .publish-time {
      font-size: 22rpx;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 12rpx;
    }
  }
}

// 功能按钮栏
.action-bar {
  display: flex;
  justify-content: space-around;
  background: #fff;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;

    .iconfont {
      font-size: 40rpx;
      color: #333;
      margin-bottom: 8rpx;
    }

    .count {
      font-size: 22rpx;
      color: #666;
    }
  }
}

// 播放全部按钮
.play-all-bar {
  background: #fff;
  border-radius: 30rpx 30rpx 0 0;
  padding: 30rpx;

  .play-all {
    display: flex;
    align-items: center;

    .play-icon {
      font-size: 48rpx;
      color: #333;
    }

    .text {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-left: 16rpx;
    }

    .count {
      font-size: 26rpx;
      color: #999;
      margin-left: 8rpx;
    }
  }
}

// 加载更多状态
.load-more-wrapper {
  padding: 30rpx;
  text-align: center;

  .load-more-text {
    font-size: 26rpx;
    color: #999;
  }
}

// 没有更多数据
.no-more-wrapper {
  padding: 30rpx;
  text-align: center;

  .no-more-text {
    font-size: 26rpx;
    color: #ccc;
  }
}

// 歌曲列表
.song-list-scroll {
  flex: 1;
  background: #fff;
  height: 0;

  .song-item {
    display: flex;
    align-items: center;
    padding: 24rpx 30rpx;

    &:active {
      background: #f5f5f5;
    }

    .index {
      width: 60rpx;
      font-size: 28rpx;
      color: #999;
      text-align: center;
    }

    .song-info {
      flex: 1;
      overflow: hidden;
      margin-left: 16rpx;

      .song-name {
        font-size: 30rpx;
        color: #333;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .song-artist {
        font-size: 24rpx;
        color: #999;
        margin-top: 8rpx;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .song-action {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .action-icon {
        font-size: 40rpx;
        color: #999;
      }
    }
  }
}

// 加载状态
.loading-wrapper {
  padding: 60rpx;
  text-align: center;

  .loading-text {
    font-size: 28rpx;
    color: #999;
  }
}

// 空状态
.empty-wrapper {
  padding: 120rpx;
  text-align: center;

  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}

// 底部安全区
.safe-bottom {
  height: 0;
  display: none;
}

// 专辑详情弹窗
.album-detail-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.popup-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.popup-content {
  position: relative;
  width: 100%;
  max-height: 90vh;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

// 弹窗顶部导航栏
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e0e0e0;
  flex-shrink: 0;
}

.header-left,
.header-right {
  width: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-right .iconfont {
  font-size: 40rpx;
  color: #333;
}

// 专辑封面区域
.album-cover-section {
  padding: 40rpx 30rpx;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1rpx solid #f0f0f0;

  .album-cover {
    width: 300rpx;
    height: 300rpx;
    border-radius: 16rpx;
    margin-bottom: 24rpx;
  }

  .album-name {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 12rpx;
  }

  .album-alias {
    font-size: 26rpx;
    color: #999;
  }
}

// 专辑详细信息区域
.album-detail-section {
  flex: 1;
  overflow-y: auto;
  padding: 30rpx;
  background-color: #fff;

  .detail-row {
    margin-bottom: 30rpx;

    &:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      display: inline-block;
      font-size: 28rpx;
      font-weight: 500;
      color: #333;
      margin-bottom: 12rpx;
    }

    .detail-value {
      display: block;
      font-size: 28rpx;
      color: #666;
      line-height: 1.6;
      margin-top: 8rpx;

      &.detail-desc {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    }
  }
}
</style>
