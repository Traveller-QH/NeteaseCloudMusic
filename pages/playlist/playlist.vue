<template>
  <view class="playlist-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="handleBack">
        <i class="iconfont icon-arrow-left nav-icon"/>
      </view>
      <view class="nav-title">
        <text>{{ pageType === 'album' ? '专辑' : pageType === 'radio' ? '播客' : '歌单' }}</text>
      </view>
      <view class="nav-right">
        <i class="iconfont icon-sousuo nav-icon"/>
      </view>
    </view>

    <!-- 歌单信息头部 -->
    <view class="playlist-header" v-if="playlistInfo">
      <image class="cover" :src="playlistInfo.coverImgUrl" mode="aspectFill"></image>
      <view class="info">
        <text class="name">{{ playlistInfo.name }}</text>
        <view class="creator" v-if="playlistInfo.creator">
          <image class="avatar" :src="playlistInfo.creator.avatarUrl" mode="aspectFill"></image>
          <text class="nickname">{{ playlistInfo.creator.nickname }}</text>
        </view>
        <text class="desc" v-if="playlistInfo.description || playlistInfo.desc">{{ playlistInfo.description || playlistInfo.desc }}</text>
      </view>
    </view>

    <!-- 播放全部按钮 -->
    <view class="play-all-bar">
      <view class="play-all" @click="handlePlayAll">
        <i class="iconfont icon-bofang1 play-icon"/>
        <text class="text">播放全部</text>
        <!--<text class="count">({{ songList.length }}{{ pageType === 'album' ? '首' : '首' }})</text>-->
        <text class="count">({{ playlistTrackCount }}首)</text>
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
          <text class="song-artist">{{ getArtistNames(song) }} - {{ song.al?.name }}</text>
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
  </view>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {getPlaylistTrackAll, getPlaylistDetail, getAlbum, getAlbumSongs, getDjRadio, getDjProgram} from '@/utils/api.js'
import {useMusicStore} from '@/utils/musicStore.js'

const musicStore = useMusicStore()

// 歌单ID
const playlistId = ref('')
// 歌单歌曲数量
const playlistTrackCount = ref(0)
// 页面类型：playlist(歌单) | album(专辑) | radio(播客)
const pageType = ref('playlist')
// 歌单/专辑信息
const playlistInfo = ref(null)
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

// 获取歌手名称
const getArtistNames = (song) => {
  const artists = song.ar || song.artists || []
  if (!artists.length) return '未知歌手'
  return artists.map(a => a.name).join(' / ')
}

// 获取详情（根据类型区分歌单、专辑和播客）
const fetchDetail = async (id, type) => {
  try {
    if (type === 'album') {
      // 获取专辑详情
      const res = await getAlbum(id)
      if (res.code === 200 && res.album) {
        playlistInfo.value = res.album
        // 专辑数据结构不同，需要适配
        // 设置专辑艺术家信息
        playlistInfo.value.creator = {
          nickname: res.album.artist?.name || '未知艺术家',
          avatarUrl: res.album.artist?.img1v1Url || res.album.artist?.picUrl || ''
        }
        // 确保专辑封面和描述字段正确
        playlistInfo.value.coverImgUrl = res.album.blurPicUrl || res.album.picUrl
        playlistInfo.value.description = res.album.description || res.album.desc || ''
        // 从专辑详情中获取歌曲总数
        if (res.album.size) {
          totalSongs.value = res.album.size
        }
      }
    } else if (type === 'radio') {
      // 获取电台详情
      const res = await getDjRadio(id)
      if (res.code === 200 && res.data) {
        playlistInfo.value = res.data
        // 电台数据结构适配
        playlistInfo.value.creator = {
          nickname: res.data.dj?.nickname || '未知主播',
          avatarUrl: res.data.dj?.avatarUrl || res.data.dj?.avatar || ''
        }
        // 确保电台封面和描述字段正确
        playlistInfo.value.coverImgUrl = res.data.picUrl || res.data.coverUrl || res.data.cover || ''
        playlistInfo.value.description = res.data.desc || res.data.description || ''
        // 从电台详情中获取节目总数
        if (res.data.programCount) {
          totalSongs.value = res.data.programCount
        }
      }
    } else {
      // 获取歌单详情
      const res = await getPlaylistDetail(id)
      if (res.code === 200 && res.playlist) {
        playlistInfo.value = res.playlist
        // 从歌单详情中获取歌曲总数
        if (res.playlist.trackCount) {
          totalSongs.value = res.playlist.trackCount
        }
      }
    }
  } catch (error) {
    console.error(`获取${type === 'album' ? '专辑' : type === 'radio' ? '播客' : '歌单'}详情失败:`, error)
  }
}

// 获取歌曲（根据类型区分歌单、专辑和播客）
const fetchSongs = async (id, type, isLoadMore = false) => {
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
    let res
    if (type === 'album') {
      // 获取专辑歌曲
      res = await getAlbumSongs(id)
    } else if (type === 'radio') {
      // 获取电台节目
      res = await getDjProgram(id, pageSize, currentOffset.value)
      // 电台节目数据结构适配
      if (res.code === 200 && res.programs) {
        res.songs = res.programs.map(program => {
          // 将电台节目转换为歌曲格式
          return {
            id: program.mainSong?.id || program.id,
            name: program.name,
            ar: [{ name: program.dj?.nickname || '未知主播' }],
            artists: [{ name: program.dj?.nickname || '未知主播' }],
            al: { name: program.radio?.name || '电台节目' },
            duration: program.duration,
            publishTime: program.createTime,
            mp3Url: program.mp3Url,
            br: program.mainSong?.fee || 0
          }
        })
      }
    } else {
      // 获取歌单歌曲
      res = await getPlaylistTrackAll(id, pageSize, currentOffset.value)
    }
    
    if (res.code === 200 && res.songs) {
      // 追加歌曲到列表
      if (isLoadMore) {
        songList.value.push(...res.songs)
      } else {
        songList.value = res.songs
      }
        
      // 同时更新预加载数据
      const preloadData = musicStore.getPreloadData()
      if (!preloadData.songs.length || !isLoadMore) {
        preloadData.songs = [...songList.value]
      } else {
        // 如果是加载更多，只添加新加载的歌曲
        preloadData.songs.push(...res.songs)
      }
        
      // 更新偏移量
      currentOffset.value += res.songs.length
        
      // 判断是否还有更多数据
      // 如果返回的歌曲数量小于请求的数量，说明已经没有更多了
      // 或者当前偏移量已经达到总数
      if (res.songs.length < pageSize) {
        hasMore.value = false
        preloadData.hasMore = false
      } else if (totalSongs.value > 0) {
        hasMore.value = currentOffset.value < totalSongs.value
        preloadData.hasMore = hasMore.value
      }
    } else {
      // 接口返回异常，没有更多数据
      hasMore.value = false
      const preloadData = musicStore.getPreloadData()
      preloadData.hasMore = false
    }
  } catch (error) {
    console.error(`获取${type === 'album' ? '专辑' : type === 'radio' ? '播客' : '歌单'}歌曲失败:`, error)
    hasMore.value = false
    const preloadData = musicStore.getPreloadData()
    preloadData.hasMore = false
  } finally {
    loading.value = false
  }
}

// 加载更多
const handleLoadMore = () => {
  if (playlistId.value && hasMore.value && !loading.value) {
    fetchSongs(playlistId.value, pageType.value, true)
  }
}

// 播放歌曲
const handlePlaySong = async (song) => {
  // 如果已经有预加载数据且已加载完成，直接使用
  const preloadData = musicStore.getPreloadData()
  
  if (preloadData.playlistId === playlistId.value && 
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
      // 使用 preserveCurrentPlay=true 保留当前播放进度
      const updatedPreloadData = musicStore.getPreloadData()
      const songIndex = updatedPreloadData.songs.findIndex(s => String(s.id) === String(song.id))
      if (songIndex >= 0) {
        musicStore.setPlaylist(updatedPreloadData.songs, song.id, true)
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
    // 根据页面类型选择获取歌曲的函数
    let fetchFunction = null
    if (pageType.value === 'album') {
      fetchFunction = async (size, offset) => await getAlbumSongs(playlistId.value)
    } else if (pageType.value === 'radio') {
      fetchFunction = async (size, offset) => await getDjProgram(playlistId.value)
    } else {
      fetchFunction = async (size, offset) => await getPlaylistTrackAll(playlistId.value, size, offset)
    }
    
    // 全量加载歌曲，带进度回调
    await musicStore.loadAllSongsForPlaylist(playlistId.value, fetchFunction, {
      pageSize: 100,
      maxSongs: 1000,
      delayMs: 50,
      onProgress: (progress) => {
        // 后台加载不显示进度提示，避免干扰用户
        // console.log(`后台加载进度：${progress.loaded}/${progress.total || '?'}`)
      }
    })
    
    // 加载完成后，更新播放列表
    // 使用 preserveCurrentPlay=true 保留当前播放进度
    const updatedPreloadData = musicStore.getPreloadData()
    const songIndex = updatedPreloadData.songs.findIndex(s => String(s.id) === String(song.id))
    if (songIndex >= 0) {
      musicStore.setPlaylist(updatedPreloadData.songs, song.id, true)
    }
  } catch (error) {
    console.error('后台加载全部歌曲失败:', error)
    // 后台加载失败不影响当前播放
  }
}

// 递归加载所有歌曲
const loadAllSongs = async () => {
  if (!hasMore.value || loading.value) return
  
  loading.value = true
  try {
    const res = await getPlaylistTrackAll(
      playlistId.value,
      pageSize,
      currentOffset.value
    )
    
    if (res.code === 200 && res.songs) {
      // 追加到预加载数据
      const preloadData = musicStore.getPreloadData()
      preloadData.songs.push(...res.songs)
      
      // 更新偏移量
      currentOffset.value += res.songs.length
      
      // 判断是否还有更多数据
      if (res.songs.length < pageSize) {
        hasMore.value = false
        preloadData.hasMore = false
      } else if (totalSongs.value > 0) {
        hasMore.value = currentOffset.value < totalSongs.value
        preloadData.hasMore = hasMore.value
      }
      
      // 如果还有更多，继续加载
      if (hasMore.value) {
        await loadAllSongs()
      }
    } else {
      hasMore.value = false
    }
  } catch (error) {
    console.error('加载歌曲失败:', error)
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 播放全部
const handlePlayAll = () => {
  if (songList.value.length > 0) {
    handlePlaySong(songList.value[0])
  }
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
    playlistId.value = options.id
    // 获取页面类型，默认为歌单
    pageType.value = options.type || 'playlist'
    
    // 先获取详情 (包含歌曲总数),再获取歌曲列表
    await fetchDetail(options.id, pageType.value)
    // 获取第一页歌曲
    fetchSongs(options.id, pageType.value, false)
    
    // 设置预加载数据
    const preloadData = musicStore.getPreloadData()
    preloadData.playlistId = playlistId.value
    preloadData.totalCount = totalSongs.value
    preloadData.songs = []
    preloadData.hasMore = hasMore.value
  }

  if (options.trackCount) {
    playlistTrackCount.value = options.trackCount
  }
})
</script>

<style lang="scss" scoped>
@import '@/static/iconfont/iconfont.css';

.playlist-page {
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

// 歌单信息头部
.playlist-header {
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

    .creator {
      display: flex;
      align-items: center;
      margin-top: 16rpx;

      .avatar {
        width: 48rpx;
        height: 48rpx;
        border-radius: 50%;
      }

      .nickname {
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.8);
        margin-left: 12rpx;
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
  height: 0; // 配合 flex:1 使 scroll-view 高度生效

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

// 底部安全区（已移除PlayBar预留空间）
.safe-bottom {
  height: 0;
  display: none;
}
</style>
