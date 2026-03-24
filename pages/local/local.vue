<template>
  <view class="local-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

    <!-- 自定义顶部导航栏 -->
    <view class="custom-navbar">
      <view class="nav-left" @click="handleBack">
        <i class="iconfont icon-arrow-left nav-icon" />
      </view>
      <view class="nav-title">本地/下载</view>
      <view class="nav-right">
        <view class="nav-action" @click="refreshLocalSongs">
          <i class="iconfont icon-shuaxin nav-icon" />
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-scroll">
      <!-- 统计信息 -->
      <view class="stats-section">
        <view class="stat-item">
          <text class="stat-num">{{ localSongs.length }}</text>
          <text class="stat-label">首歌曲</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ totalSizeStr }}</text>
          <text class="stat-label">占用空间</text>
        </view>
      </view>

      <!-- 歌曲列表 -->
      <view class="song-list">
        <view v-if="localSongs.length === 0" class="empty-tip">
          <i class="iconfont icon-yinle empty-icon"></i>
          <text class="empty-text">暂无下载的歌曲</text>
          <text class="empty-desc">快去下载喜欢的音乐吧</text>
        </view>

        <view
            v-for="(song, index) in localSongs"
            :key="song.id"
            class="song-item"
            @click="playSong(song)"
        >
          <view class="song-index" v-if="!musicStore.state.isPlaying || musicStore.state.currentSong?.id !== song.id">
            {{ index + 1 }}
          </view>
          <view v-else class="song-playing">
            <i class="iconfont icon-bofang1 playing-icon"></i>
          </view>

          <view class="song-cover">
            <image v-if="song.album?.picUrl" :src="song.album.picUrl" mode="aspectFill" class="cover-img"></image>
            <view v-else class="cover-placeholder">
              <i class="iconfont icon-yinle cover-icon"></i>
            </view>
          </view>

          <view class="song-info">
            <text class="song-name">{{ song.name }}</text>
            <text class="song-artist">{{ getArtistNames(song.artists) }}</text>
          </view>

          <view class="song-actions">
            <view class="action-btn" @click.stop="deleteSong(song)">
              <i class="iconfont icon-lajitong action-icon"></i>
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
import { ref, computed, onMounted } from 'vue'
import { useMusicStore } from '@/utils/musicStore.js'
import AppTabBar from '@/components/AppTabBar/AppTabBar.vue'
import PlayBar from '@/components/PlayBar/PlayBar.vue'

const musicStore = useMusicStore()

// 本地歌曲列表直接从store获取（computed会自动响应变化）
const localSongs = computed(() => musicStore.getAllLocalSongs())

// 计算总大小（累加所有歌曲的实际文件大小）
const totalSizeStr = computed(() => {
  if (localSongs.value.length === 0) return '0MB'
  
  // 累加所有歌曲的大小（单位为字节）
  const totalBytes = localSongs.value.reduce((sum, song) => {
    // 如果有 size 字段且大于 0，使用实际大小；否则估算为 10MB
    const songSize = (song.size && song.size > 0) ? song.size : (10 * 1024 * 1024)
    return sum + songSize
  }, 0)
  
  // 转换为 MB 或 GB
  if (totalBytes < 1024 * 1024 * 1024) {
    // 小于 1GB，显示 MB
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)
    return `${totalMB}MB`
  } else {
    // 大于等于 1GB，显示 GB
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2)
    return `${totalGB}GB`
  }
})

// 获取歌手名称
const getArtistNames = (artists) => {
  if (!artists || !artists.length) return '未知歌手'
  return artists.map(a => a.name).join(' / ')
}

// 播放歌曲
const playSong = (song) => {
  // 将整个本地歌曲列表替换到播放列表中
  const allLocalSongs = musicStore.getAllLocalSongs();
  if (allLocalSongs && allLocalSongs.length > 0) {
    musicStore.setPlaylist(allLocalSongs, song.id);
  }
  
  // 播放当前歌曲
  musicStore.playLocalSong(song);
  uni.navigateTo({
    url: `/pages/player/player?id=${song.id}&local=1`  // 可选参数，用于播放页面区分本地歌曲
  });
};

// 删除歌曲
const deleteSong = (song) => {
  uni.showModal({
    title: '提示',
    content: `确定删除"${song.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' });
        const result = await musicStore.deleteLocalSong(song.id);
        uni.hideLoading();
        uni.showToast({ title: result.success ? '删除成功' : result.message, icon: result.success ? 'success' : 'none' });
      }
    }
  });
};

// 刷新（手动触发重新扫描）
const refreshLocalSongs = async () => {
  // console.log('点击刷新按钮');
  
  // 如果正在扫描中，提示用户
  const scanState = musicStore.getScanState();
  if (scanState.isScanning) {
    uni.showToast({ title: '正在扫描中...', icon: 'none' });
    return;
  }
  
  // 显示加载提示
  uni.showLoading({ title: '开始扫描...', mask: true });
  
  try {
    // 强制重新扫描并匹配
    await musicStore.scanAndMatchLocalSongs({
      forceScan: true,
      onProgress: (progressInfo) => {
        // console.log('扫描进度:', progressInfo);
        // 扫描完成时隐藏 loading
        if (progressInfo.stage === 'complete') {
          uni.hideLoading();
          uni.showToast({ 
            title: `扫描完成，共${musicStore.getAllLocalSongs().length}首歌曲`, 
            icon: 'success',
            duration: 2000
          });
        } else if (progressInfo.stage === 'error') {
          uni.hideLoading();
          uni.showToast({ title: progressInfo.message, icon: 'none', duration: 3000 });
        }
      }
    });
  } catch (error) {
    console.error('扫描失败:', error);
    uni.hideLoading();
    uni.showToast({ title: '扫描失败：' + (error.message || '未知错误'), icon: 'none', duration: 3000 });
  }
};

// 返回上一页
const handleBack = () => {
  uni.navigateBack()
}

// tab切换（占位）
const onTabChange = (name) => {
  // console.log('Tab changed to:', name)
}

onMounted(() => {
  // 无需额外操作，数据已通过store自动加载
})
</script>

<style lang="scss" scoped>
.local-page {
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
  padding: 0 15px;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  position: relative;

  .nav-left, .nav-right {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;

    .nav-icon {
      font-size: 40rpx;
      color: #333;
    }
  }

  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  .nav-action {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.content-scroll {
  flex: 1;
  overflow-y: scroll;
  height: 100%;
}

.stats-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
  background: #fff;
  margin-bottom: 20rpx;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;

    .stat-num {
      font-size: 48rpx;
      font-weight: bold;
      color: #EC4141;
    }

    .stat-label {
      font-size: 24rpx;
      color: #999;
    }
  }

  .stat-divider {
    width: 1rpx;
    height: 60rpx;
    background: #e0e0e0;
    margin: 0 60rpx;
  }
}

.song-list {
  padding: 0 0 200rpx 0; // 底部留出播放控制条的空间
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  background: #fff;

  .empty-icon {
    font-size: 120rpx;
    color: #ccc;
    margin-bottom: 24rpx;
  }

  .empty-text {
    font-size: 30rpx;
    color: #999;
    margin-bottom: 12rpx;
  }

  .empty-desc {
    font-size: 24rpx;
    color: #bbb;
  }
}

.song-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  transition: background 0.2s;

  &:active {
    background: #f5f5f5;
  }

  .song-index {
    width: 60rpx;
    text-align: center;
    font-size: 28rpx;
    color: #999;
    flex-shrink: 0;
  }

  .song-playing {
    width: 60rpx;
    text-align: center;
    flex-shrink: 0;

    .playing-icon {
      font-size: 32rpx;
      color: #EC4141;
      animation: pulse 1s infinite;
    }
  }

  .song-cover {
    width: 100rpx;
    height: 100rpx;
    border-radius: 12rpx;
    overflow: hidden;
    flex-shrink: 0;
    margin-right: 24rpx;

    .cover-img {
      width: 100%;
      height: 100%;
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      align-items: center;
      justify-content: center;

      .cover-icon {
        font-size: 48rpx;
        color: #fff;
      }
    }
  }

  .song-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    overflow: hidden;

    .song-name {
      font-size: 30rpx;
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .song-artist {
      font-size: 24rpx;
      color: #999;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .song-actions {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .action-btn {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .action-icon {
        font-size: 36rpx;
        color: #999;
      }
    }
  }
}

.play-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
}

.app-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>