<template>
  <view class="user-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

    <!-- 顶部导航栏 -->
    <view class="nav-header">
      <view class="nav-left" @click="handleBack">
        <i class="iconfont icon-arrow-left nav-icon"/>
      </view>
      <view class="nav-right" @click="showMenu = true">
        <i class="iconfont icon-sandiancaidan nav-icon"/>
      </view>
    </view>

    <!-- 基础信息卡片 -->
    <view class="user-card" v-if="userInfo">
      <!-- 头像 -->
      <view class="avatar-wrapper">
        <image :src="userInfo.profile?.avatarUrl" class="user-avatar" mode="aspectFill" />
      </view>
      
      <!-- 用户名 -->
      <text class="user-name">{{ userInfo.profile?.nickname }}</text>
      
      <!-- IP 属地 -->
      <text class="user-location" v-if="userLocation">IP:{{ userLocation }}</text>
      
      <!-- 基础信息 -->
      <view class="user-stats">
        <text class="stat-item">{{ followCnt }} 关注</text>
        <text class="stat-divider">|</text>
        <text class="stat-item">{{ formatCount(fansCnt) }} 粉丝</text>
        <text class="stat-divider">|</text>
        <text class="stat-item">Lv{{ userInfo.level }} 等级</text>
      </view>
    </view>

    <!-- 分类导航 -->
    <view class="category-tabs">
      <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
        <view class="tabs-container">
          <view
            class="tab-item"
            v-for="tab in tabs"
            :key="tab.type"
            :class="{ 'active': activeTab === tab.type }"
            @click="switchTab(tab.type)"
          >
            <text class="tab-text">{{ tab.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区域 -->
    <scroll-view
      class="content-scroll"
      scroll-y
      @scrolltolower="handleLoadMore"
      :lower-threshold="100"
    >
      <!-- 创建的歌单 -->
      <view v-if="activeTab === 'created'">
        <!-- 空状态提示 -->
        <view class="empty-state" v-if="!loading && createdPlaylists.length === 0">
          <text class="empty-text">暂无歌单</text>
        </view>
        
        <!-- 歌单列表 -->
        <view class="playlist-list" v-else>
          <view
            class="playlist-item"
            v-for="(playlist, index) in createdPlaylists"
            :key="playlist.id"
            @click="goToPlaylist(playlist)"
          >
            <image :src="playlist.coverImgUrl || playlist.coverImgId" class="playlist-cover" mode="aspectFill" />
            <view class="playlist-info">
              <text class="playlist-name">{{ playlist.name }}</text>
              <text class="playlist-track-count">共{{ playlist.trackCount }}首</text>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more" v-if="loading">
          <text class="load-more-text">加载中...</text>
        </view>
      </view>

      <!-- 收藏的歌单 -->
      <view v-if="activeTab === 'favorited'">
        <!-- 空状态提示 -->
        <view class="empty-state" v-if="!loading && favoritedPlaylists.length === 0">
          <text class="empty-text">暂无歌单</text>
        </view>
        
        <!-- 歌单列表 -->
        <view class="playlist-list" v-else>
          <view
            class="playlist-item"
            v-for="(playlist, index) in favoritedPlaylists"
            :key="playlist.id"
            @click="goToPlaylist(playlist)"
          >
            <image :src="playlist.coverImgUrl || playlist.coverImgId" class="playlist-cover" mode="aspectFill" />
            <view class="playlist-info">
              <text class="playlist-name">{{ playlist.name }}</text>
              <text class="playlist-track-count">共{{ playlist.trackCount }}首</text>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more" v-if="loading">
          <text class="load-more-text">加载中...</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部播放控制条 -->
    <PlayBar />

    <!-- 菜单弹窗 -->
    <view class="menu-popup" v-if="showMenu" @click="showMenu = false">
      <view class="menu-mask"></view>
      <view class="menu-content" @click.stop>
        <view class="menu-item" @click="handleShare">
          <i class="iconfont icon-fenxiang1 menu-icon"/>
          <text class="menu-text">分享</text>
        </view>
        <view class="menu-item" @click="handleBlockUser">
          <i class="iconfont icon-pingbi menu-icon"/>
          <text class="menu-text">加入黑名单</text>
        </view>
        <view class="menu-item" @click="handleReport">
          <i class="iconfont icon-yichang_weixian_jubao menu-icon"/>
          <text class="menu-text">举报</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getUserDetail, getUserPlaylist } from '@/utils/api.js'
import { useMusicStore } from '@/utils/musicStore.js'
import PlayBar from '@/components/PlayBar/PlayBar.vue'

const musicStore = useMusicStore()

// 用户 ID
const userId = ref('')

// 用户信息
const userInfo = ref(null)

// 粉丝数
const fansCnt = ref(0)

// 关注数
const followCnt = ref(0)

// 用户 IP 属地
const userLocation = ref('')

// 当前选中的分类
const activeTab = ref('created')

// 分类标签
const tabs = [
  { name: '创建的歌单', type: 'created' },
  { name: '收藏的歌单', type: 'favorited' }
]

// 创建的歌单
const createdPlaylists = ref([])

// 收藏的歌单
const favoritedPlaylists = ref([])

// 加载状态
const loading = ref(false)

// 分页参数
const playlistLimit = 30
const playlistOffset = ref(0)

// 菜单显示状态
const showMenu = ref(false)

// 创建的歌单为空时显示提示
const isCreatedEmpty = computed(() => {
  return !loading.value && createdPlaylists.value.length === 0
})

// 收藏的歌单为空时显示提示
const isFavoritedEmpty = computed(() => {
  return !loading.value && favoritedPlaylists.value.length === 0
})

// 获取 IP 属地
const getIpLocation = (profile) => {
  if (!profile) return ''
  
  // 省份映射表
  const provinceMap = {
    110000: '北京',
    120000: '天津',
    310000: '上海',
    500000: '重庆',
    710000: '台湾',
    810000: '香港',
    820000: '澳门',
    330000: '浙江',
    340000: '安徽',
    350000: '福建',
    360000: '江西',
    370000: '山东',
    410000: '河南',
    420000: '湖北',
    430000: '湖南',
    440000: '广东',
    450000: '广西',
    460000: '海南',
    510000: '四川',
    520000: '贵州',
    530000: '云南',
    540000: '西藏',
    610000: '陕西',
    620000: '甘肃',
    630000: '青海',
    640000: '宁夏',
    650000: '新疆'
  }
  
  // 先尝试匹配省份
  if (profile.province && provinceMap[profile.province]) {
    return provinceMap[profile.province]
  }
  
  // 如果有城市信息但不是直辖市
  if (profile.city && profile.city !== profile.province) {
    // 简化处理，返回省份
    if (profile.province && provinceMap[profile.province]) {
      return provinceMap[profile.province]
    }
    return '中国'
  }
  
  return ''
}

// 格式化数量
const formatCount = (count) => {
  if (!count) return '0'
  count = Number(count)
  if (count >= 10000) {
    // 计算万位数，不四舍五入保留一位小数
    const tenThousand = count / 10000
    // 取整数部分和小数第一位（截断）
    const integerPart = Math.floor(tenThousand)                     // 整数部分
    const decimalPart = Math.floor((tenThousand - integerPart) * 10) // 小数第一位（0-9）

    // 组合结果：如果小数部分为 0，只显示整数；否则显示一位小数
    if (decimalPart === 0) {
      return integerPart + '万'
    } else {
      return integerPart + '.' + decimalPart + '万'
    }
  }
  return count.toString()
}

// 获取用户详情
const fetchUserDetail = async () => {
  try {
    const res = await getUserDetail(userId.value)
    if (res.code === 200 && res.profile) {
      userInfo.value = res
      
      // 设置粉丝数和关注数
      fansCnt.value = res.profile.followeds || 0
      followCnt.value = res.profile.follows || 0
      
      // 设置 IP 属地
      userLocation.value = getIpLocation(res.profile)
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
  }
}

// 获取用户歌单
const fetchUserPlaylists = async (isLoadMore = false) => {
  if (loading.value) return
  
  if (!isLoadMore) {
    playlistOffset.value = 0
    createdPlaylists.value = []
    favoritedPlaylists.value = []
  }
  
  loading.value = true
  try {
    const res = await getUserPlaylist(
      userId.value,
      playlistLimit,
      playlistOffset.value
    )
    
    if (res.code === 200 && res.playlist) {
      // 根据 subscribed 字段区分创建和收藏的歌单
      const created = res.playlist.filter(p => !p.subscribed)
      const favorited = res.playlist.filter(p => p.subscribed)
      
      if (isLoadMore) {
        createdPlaylists.value.push(...created)
        favoritedPlaylists.value.push(...favorited)
      } else {
        createdPlaylists.value = created
        favoritedPlaylists.value = favorited
      }
      
      playlistOffset.value += res.playlist.length
    }
  } catch (error) {
    console.error('获取用户歌单失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换分类
const switchTab = (tabType) => {
  activeTab.value = tabType
}

// 加载更多
const handleLoadMore = () => {
  fetchUserPlaylists(true)
}

// 跳转到歌单详情页
const goToPlaylist = (playlist) => {
  uni.navigateTo({
    url: `/pages/playlist/playlist?id=${playlist.id}&trackCount=${playlist.trackCount}`
  })
}

// 返回
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

// 菜单操作
const handleShare = () => {
  uni.showToast({
    title: '分享功能开发中',
    icon: 'none'
  })
  showMenu.value = false
}

const handleBlockUser = () => {
  uni.showModal({
    title: '提示',
    content: '确定要加入该用户黑名单吗？',
    success: function(res) {
      if (res.confirm) {
        uni.showToast({
          title: '已加入黑名单',
          icon: 'success'
        })
      }
    }
  })
  showMenu.value = false
}

const handleReport = () => {
  uni.showToast({
    title: '举报功能开发中',
    icon: 'none'
  })
  showMenu.value = false
}

// 页面加载 - 使用 onLoad 生命周期获取参数
onLoad((options) => {
  if (options && options.id) {
    userId.value = options.id
  }
})

// 页面挂载时加载数据
onMounted(async () => {
  if (userId.value) {
    await fetchUserDetail()
    await fetchUserPlaylists()
  }
})
</script>

<style lang="scss" scoped>
@import '@/static/iconfont/iconfont.css';

.user-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
  background: linear-gradient(180deg, #EC4141 0%, #EC4141 100%);
}

// 顶部导航栏
.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  background: linear-gradient(180deg, #EC4141 0%, #EC4141 100%);
  
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
}

// 基础信息卡片
.user-card {
  background: linear-gradient(180deg, #EC4141 0%, #f5f5f5 400rpx);
  padding: 120rpx 30rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  
  .avatar-wrapper {
    position: absolute;
    top: -60rpx;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    
    .user-avatar {
      width: 200rpx;
      height: 200rpx;
      border-radius: 50%;
      border: 6rpx solid #fff;
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    }
  }
  
  .user-name {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    margin-top: 70rpx;
    text-align: center;
  }
  
  .user-location {
    font-size: 26rpx;
    color: #999;
    margin-top: 12rpx;
    text-align: center;
  }
  
  .user-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 24rpx;
    font-size: 26rpx;
    color: #666;
    
    .stat-item {
      text-align: center;
    }
    
    .stat-divider {
      margin: 0 20rpx;
      color: #ccc;
    }
  }
}

// 分类导航
.category-tabs {
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  
  .tabs-scroll {
    width: 100%;
    white-space: nowrap;
    
    .tabs-container {
      display: flex;
      justify-content: center;
      
      .tab-item {
        padding: 24rpx 40rpx;
        position: relative;
        
        &.active .tab-text {
          color: #EC4141;
          font-weight: bold;
        }
        
        .tab-text {
          font-size: 28rpx;
          color: #666;
        }
      }
    }
  }
}

// 内容滚动区域
.content-scroll {
  flex: 1;
  height: 0;
  background: #f5f5f5;
}

// 歌单列表
.playlist-list {
  .playlist-item {
    display: flex;
    padding: 24rpx 30rpx;
    background: #fff;
    margin-bottom: 1rpx;
    
    &:active {
      background: #f5f5f5;
    }
    
    .playlist-cover {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      flex-shrink: 0;
    }
    
    .playlist-info {
      flex: 1;
      margin-left: 24rpx;
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .playlist-name {
        font-size: 30rpx;
        color: #333;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      
      .playlist-track-count {
        font-size: 24rpx;
        color: #999;
        margin-top: 12rpx;
      }
    }
  }
}

// 加载更多
.load-more {
  padding: 40rpx;
  text-align: center;
  
  .load-more-text {
    font-size: 26rpx;
    color: #999;
  }
}

// 空状态提示
.empty-state {
  padding: 200rpx 0;
  text-align: center;
  
  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}

// 菜单弹窗
.menu-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  
  .menu-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .menu-content {
    position: relative;
    width: 100%;
    background-color: #fff;
    border-radius: 24rpx 24rpx 0 0;
    padding: 24rpx;
    animation: slideUp 0.3s ease-out;
    
    .menu-item {
      display: flex;
      align-items: center;
      padding: 30rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      &:active {
        background: #f5f5f5;
      }
      
      .menu-icon {
        font-size: 40rpx;
        color: #333;
        margin-right: 24rpx;
      }
      
      .menu-text {
        font-size: 30rpx;
        color: #333;
      }
    }
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
