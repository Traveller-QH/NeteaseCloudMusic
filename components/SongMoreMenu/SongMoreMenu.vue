<template>
  <up-popup v-model:show="visible" mode="bottom" :round="20" :z-index="10000">
    <view class="song-more-menu">
      <!-- 歌曲信息头部 -->
      <view class="menu-header" v-if="songData">
        <image v-if="getSongCover(songData)" class="menu-cover" :src="getSongCover(songData)" mode="aspectFill"></image>
        <i v-else class="iconfont icon-yinle menu-cover-icon" />
        <view class="menu-info">
          <text class="menu-song-name">{{ songData?.name || '未知歌曲' }}</text>
          <text class="menu-artist-name">{{ getArtistNames(songData) || '未知歌手' }}</text>
        </view>
      </view>
      <view class="menu-header" v-else-if="isLoading">
        <view class="loading-tip">加载中...</view>
      </view>

      <!-- 分割线 -->
      <view class="menu-divider"></view>

      <!-- 功能选项 -->
      <view class="menu-options">
        <view class="menu-option" @click="handlePlayNext">
          <i class="iconfont menu-icon icon-xiayishoubofang" />
          <text class="menu-text">下一首播放</text>
        </view>
        <view class="menu-option" @click="handleToggleLike">
          <i class="iconfont menu-icon" :class="isLiked ? 'icon-xihuan' : 'icon-xihuan1'" :style="{ color: isLiked ? '#EC4141' : '' }" />
          <text class="menu-text">收藏</text>
        </view>
        <view class="menu-option" @click="handleDownload">
          <i class="iconfont menu-icon icon-xiazai" />
          <text class="menu-text">下载</text>
        </view>
        <view class="menu-option" @click="handleShare">
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
          <text class="menu-text">歌手：{{ getArtistNames(songData) || '未知歌手' }}</text>
        </view>
      </view>
    </view>
  </up-popup>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMusicStore } from '@/utils/musicStore.js'
import { getSongDetail } from '@/utils/api.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  song: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'play-next'])

const musicStore = useMusicStore()

// 弹窗显示状态
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 当前歌曲数据
const songData = ref(null)

// 加载状态
const isLoading = ref(false)

// 监听弹窗显示状态，显示时获取歌曲详情
watch(() => props.modelValue, async (newVal) => {
  if (newVal && props.song?.id) {
    await fetchSongDetail(props.song)
  }
}, { immediate: true })

// 获取歌曲详情
const fetchSongDetail = async (song) => {
  if (!song?.id) return
  
  isLoading.value = true
  try {
    const res = await getSongDetail(song.id)
    if (res.code === 200 && res.songs && res.songs.length > 0) {
      // 使用完整的歌曲详情数据更新 songData
      songData.value = res.songs[0]
    } else {
      // 如果接口失败，使用原始数据
      songData.value = song
    }
  } catch (error) {
    console.error('获取歌曲详情失败:', error)
    // 出错时使用原始数据
    songData.value = song
  } finally {
    isLoading.value = false
  }
}

// 获取歌手名称
const getArtistNames = (song) => {
  if (!song) return '未知歌手'
  
  // 多种可能的歌手数据位置
  let artists = null
  
  // 1. 直接包含 artists/ar
  if (song.artists && song.artists.length > 0) {
    artists = song.artists
  } else if (song.ar && song.ar.length > 0) {
    artists = song.ar
  } 
  // 2. 嵌套在 song 对象内（如个性推荐的数据结构）
  else if (song.song) {
    if (song.song.artists && song.song.artists.length > 0) {
      artists = song.song.artists
    } else if (song.song.ar && song.song.ar.length > 0) {
      artists = song.song.ar
    }
  }
  
  if (!artists || artists.length === 0) return '未知歌手'
  return artists.map(a => a.name).join(' / ')
}

// 获取歌曲封面
const getSongCover = (song) => {
  if (!song) return ''
  
  // 多种可能的封面数据位置
  // 1. 直接包含 album/al 的 picUrl
  if (song.album?.picUrl) {
    return song.album.picUrl
  } else if (song.al?.picUrl) {
    return song.al.picUrl
  } else if (song.cover) {
    return song.cover
  } else if (song.picUrl) {
    return song.picUrl
  }
  // 2. 嵌套在 song 对象内
  else if (song.song) {
    if (song.song.album?.picUrl) {
      return song.song.album.picUrl
    } else if (song.song.al?.picUrl) {
      return song.song.al.picUrl
    } else if (song.song.cover) {
      return song.song.cover
    } else if (song.song.picUrl) {
      return song.song.picUrl
    }
  }
  
  return ''
}

// 获取歌手数组（用于跳转等需要实际歌手对象的场景）
const getArtistsArray = (song) => {
  if (!song) return []
  
  // 1. 直接包含 artists/ar
  if (song.artists && song.artists.length > 0) {
    return song.artists
  } else if (song.ar && song.ar.length > 0) {
    return song.ar
  }
  // 2. 嵌套在 song 对象内
  else if (song.song) {
    if (song.song.artists && song.song.artists.length > 0) {
      return song.song.artists
    } else if (song.song.ar && song.song.ar.length > 0) {
      return song.song.ar
    }
  }
  
  return []
}

// 获取专辑 ID
const getAlbumId = (song) => {
  if (!song) return null
  
  // 1. 直接包含 al/album
  if (song.al?.id) {
    return song.al.id
  } else if (song.album?.id) {
    return song.album.id
  }
  // 2. 嵌套在 song 对象内
  else if (song.song) {
    if (song.song.al?.id) {
      return song.song.al.id
    } else if (song.song.album?.id) {
      return song.song.album.id
    }
  }
  
  return null
}

// 计算属性 - 专辑名称
const albumName = computed(() => {
  if (!songData.value) return '未知专辑'
  
  // 多种可能的专辑数据位置
  // 1. 直接包含 al/album
  if (songData.value.al?.name) {
    return songData.value.al.name
  } else if (songData.value.album?.name) {
    return songData.value.album.name
  }
  // 2. 嵌套在 song 对象内（如个性推荐的数据结构）
  else if (songData.value.song) {
    if (songData.value.song.al?.name) {
      return songData.value.song.al.name
    } else if (songData.value.song.album?.name) {
      return songData.value.song.album.name
    }
  }
  
  return '未知专辑'
})

// 是否已收藏
const isLiked = ref(false)

// 检查歌曲是否已收藏
const checkIsLiked = async () => {
  if (!songData.value?.id) {
    isLiked.value = false
    return
  }
  
  // 检查当前播放的歌曲是否匹配
  if (musicStore.state.currentSong?.id === songData.value.id) {
    isLiked.value = musicStore.state.isLiked
  } else {
    // 对于非当前播放的歌曲，需要检查收藏列表
    // 这里简化处理，假设未收藏
    isLiked.value = false
  }
}

// 监听歌曲变化，重新检查收藏状态
watch(() => props.song, () => {
  checkIsLiked()
}, { immediate: true })

// 下一首播放
const handlePlayNext = () => {
  if (!songData.value) return
  
  // 触发 play-next 事件，让父组件处理
  emit('play-next', songData.value)
  visible.value = false
  
  uni.showToast({
    title: '已添加到下一首',
    icon: 'none',
    duration: 1500
  })
}

// 切换收藏状态
const handleToggleLike = async () => {
  if (!songData.value?.id) return
  
  const success = await musicStore.toggleLike(songData.value.id)
  if (success) {
    isLiked.value = !isLiked.value
    uni.showToast({
      title: isLiked.value ? '已添加到我喜欢' : '已取消喜欢',
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

// 下载歌曲
const handleDownload = async () => {
  if (!songData.value) {
    uni.showToast({ title: '暂无歌曲', icon: 'none' });
    return;
  }
  const success = await musicStore.downloadSong(songData.value);
  if (success) {
    visible.value = false;
  }
};

// 分享歌曲
const handleShare = () => {
  if (!songData.value) return
  
  uni.showShareMenu({
    withShareTicket: true,
    showShareItems: ['wechatFriends', 'wechatMoment']
  })
  
  uni.showToast({
    title: '分享功能开发中',
    icon: 'none',
    duration: 1500
  })
}

// 跳转到专辑页面
const navigateToAlbum = () => {
  const albumId = getAlbumId(songData.value)
  if (!albumId) {
    uni.showToast({
      title: '专辑信息不可用',
      icon: 'none'
    })
    return
  }
  
  visible.value = false
  uni.navigateTo({
    url: `/pages/album/album?id=${albumId}`
  })
}

// 跳转到歌手页面
const navigateToArtist = async () => {
  const artists = getArtistsArray(songData.value)
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
    visible.value = false
    uni.navigateTo({
      url: `/pages/artist/artist?id=${artistId}`
    })
  } else {
    // 多个歌手，暂时只显示第一个（可以后续扩展为选择弹窗）
    visible.value = false
    uni.navigateTo({
      url: `/pages/artist/artist?id=${artists[0].id}`
    })
  }
}
</script>

<style lang="scss" scoped>
.song-more-menu {
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;

  .menu-header {
    display: flex;
    align-items: center;
    padding: 40rpx 30rpx 30rpx;

    .loading-tip {
      width: 100%;
      text-align: center;
      font-size: 26rpx;
      color: #999;
      padding: 40rpx 0;
    }

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
</style>
