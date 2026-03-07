  <template>
  <view class="artist-page">
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
    <view class="artist-card" v-if="artistInfo">
      <!-- 头像 -->
      <view class="avatar-wrapper">
        <image :src="artistInfo.artist?.avatar || artistInfo.artist?.cover" class="artist-avatar" mode="aspectFill" />
      </view>
      
      <!-- 歌手名 -->
      <text class="artist-name">{{ artistInfo.artist?.name }}</text>
      
      <!-- 其他名字 -->
      <text class="artist-alias" v-if="artistInfo.artist?.alias && artistInfo.artist.alias.length > 0">
        {{ artistInfo.artist.alias[0] }}
      </text>
      
      <!-- 基础信息 -->
      <view class="artist-stats">
        <text class="stat-item">{{ artistInfo.user?.followed ? '已关注' : formatCount(artistInfo.artist?.identify?.imageDesc ? 0 : 0) }} 关注</text>
        <text class="stat-divider">|</text>
        <text class="stat-item">{{ formatCount(followCount) }} 粉丝</text>
        <text class="stat-divider">|</text>
        <text class="stat-item">IP 属地 {{ getIpLocation(artistInfo.user) }}</text>
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
      <!-- 主页 -->
      <view v-if="activeTab === 'home'">
        <!-- 热门作品卡片 -->
        <view class="section-card" v-if="hotSongs.length > 0">
          <view class="card-header">
            <text class="card-title">TA 的热门作品</text>
          </view>
          <view class="song-list">
            <view
              class="song-item"
              v-for="(song, index) in hotSongs"
              :key="song.id"
              @click="playSong(song)"
            >
              <view class="index">{{ index + 1 }}</view>
              <view class="song-info">
                <text class="song-name">{{ song.name }}</text>
                <text class="song-artist">{{ getArtistNames(song) }}</text>
              </view>
              <view class="song-action">
                <i class="iconfont icon-bofang1 play-icon"/>
              </view>
            </view>
          </view>
        </view>

        <!-- 艺人百科卡片 -->
        <view class="section-card" v-if="artistWiki" @click="showWikiDetail = true">
          <view class="card-header-mini">
            <text class="card-title-mini">艺人百科 ></text>
          </view>
          <view class="wiki-content">
            <text class="wiki-artist-name">{{ artistInfo.artist?.name }}</text>
            <text class="wiki-gender-zodiac">{{ artistWiki.gender }}/{{ artistWiki.zodiac }}</text>
            <text class="wiki-desc">{{ artistWiki.briefDesc || artistWiki.introduction }}</text>
          </view>
        </view>
      </view>

      <!-- 歌曲 -->
      <view v-if="activeTab === 'songs'">
        <!-- 导航条 -->
        <view class="sort-navbar">
          <view class="sort-left">热门 50 首</view>
          <view class="sort-right" @click="showSongSortMenu = true">
            <i class="iconfont icon-paixufangshi sort-icon"/>
          </view>
        </view>

        <!-- 歌曲列表 -->
        <view class="song-list">
          <view
            class="song-item"
            v-for="(song, index) in allSongs"
            :key="song.id"
            @click="playSong(song)"
          >
            <view class="index">{{ index + 1 }}</view>
            <view class="song-info">
              <text class="song-name">{{ song.name }}</text>
              <text class="song-artist">{{ getArtistNames(song) }}</text>
            </view>
            <view class="song-action">
              <i class="iconfont icon-bofang1 play-icon"/>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more" v-if="loading">
          <text class="load-more-text">加载中...</text>
        </view>

        <!-- 查看全部按钮 -->
        <view class="view-all-btn" v-if="!loading && hasMoreSongs" @click="loadAllSongs">
          <text class="view-all-text">全部演唱<i class="iconfont icon-arrow-right"/></text>
        </view>
      </view>

      <!-- 专辑 -->
      <view v-if="activeTab === 'albums'">
        <!-- 导航条 -->
        <view class="sort-navbar">
          <view class="sort-left">按发行时间排序</view>
          <view class="sort-right" @click="showAlbumSortMenu = true">
            <i class="iconfont icon-paixufangshi sort-icon"/>
          </view>
        </view>

        <!-- 专辑列表 -->
        <view class="album-list">
          <view
            class="album-item"
            v-for="(album, index) in artistAlbums"
            :key="album.id"
            @click="goToAlbum(album)"
          >
            <image :src="album.picUrl || album.cover" class="album-cover" mode="aspectFill" />
            <view class="album-info">
              <text class="album-name">{{ album.name }}</text>
              <text class="album-publish-time">{{ formatDate(album.publishTime) }}</text>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more" v-if="loading">
          <text class="load-more-text">加载中...</text>
        </view>
      </view>

      <!-- 视频 -->
      <view v-if="activeTab === 'videos'">
        <!-- 导航条 -->
        <view class="sort-navbar">
          <view class="sort-left">MV</view>
          <view class="sort-right" @click="toggleVideoSort">
            <i class="iconfont icon-a-Descendingorderjiangxu sort-icon"/>
          </view>
        </view>

        <!-- 视频列表 -->
        <view class="video-list">
          <view
            class="video-item"
            v-for="(video, index) in artistMvs"
            :key="video.id"
            @click="playVideo(video)"
          >
            <view class="video-thumb">
              <image :src="video.cover || video.picUrl" class="video-cover" mode="aspectFill" />
              <view class="video-duration">{{ formatDuration(video.duration || video.playTime) }}</view>
            </view>
            <view class="video-info">
              <text class="video-name">{{ video.name }}</text>
              <text class="video-publish-time">{{ formatDate(video.publishTime) }}</text>
              <text class="video-play-count">{{ formatPlayCount(video.playCount) }}播放</text>
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
        <view class="menu-item" @click="handlePrivateMessage">
          <i class="iconfont icon-sixin menu-icon"/>
          <text class="menu-text">私信</text>
        </view>
        <view class="menu-item" @click="handleBlockArtist">
          <i class="iconfont icon-pingbi menu-icon"/>
          <text class="menu-text">屏蔽音乐人歌曲</text>
        </view>
        <view class="menu-item" @click="handleBlacklist">
          <i class="iconfont icon-lahei menu-icon"/>
          <text class="menu-text">拉黑</text>
        </view>
        <view class="menu-item" @click="handleReport">
          <i class="iconfont icon-yichang_weixian_jubao menu-icon"/>
          <text class="menu-text">举报</text>
        </view>
        <view class="menu-item" @click="handleShare">
          <i class="iconfont icon-fenxiang1 menu-icon"/>
          <text class="menu-text">分享</text>
        </view>
      </view>
    </view>

    <!-- 歌曲排序弹窗 -->
    <view class="sort-popup" v-if="showSongSortMenu" @click="showSongSortMenu = false">
      <view class="sort-mask"></view>
      <view class="sort-content" @click.stop>
        <view class="sort-option" @click="changeSongSort('hot')">
          <text class="sort-option-text">按热度排序</text>
          <i class="iconfont icon-xuanzhong" v-if="songSortType === 'hot'"/>
        </view>
        <view class="sort-option" @click="changeSongSort('time')">
          <text class="sort-option-text">按发行时间排序</text>
          <i class="iconfont icon-xuanzhong" v-if="songSortType === 'time'"/>
        </view>
      </view>
    </view>

    <!-- 专辑排序弹窗 -->
    <view class="sort-popup" v-if="showAlbumSortMenu" @click="showAlbumSortMenu = false">
      <view class="sort-mask"></view>
      <view class="sort-content" @click.stop>
        <view class="sort-option" @click="changeAlbumSort('time')">
          <text class="sort-option-text">按发行时间排序</text>
          <i class="iconfont icon-xuanzhong" v-if="albumSortType === 'time'"/>
        </view>
        <view class="sort-option" @click="changeAlbumSort('hot')">
          <text class="sort-option-text">按热度排序</text>
          <i class="iconfont icon-xuanzhong" v-if="albumSortType === 'hot'"/>
        </view>
        <view class="sort-option" @click="changeAlbumSort('type')">
          <text class="sort-option-text">按类型排序</text>
          <i class="iconfont icon-xuanzhong" v-if="albumSortType === 'type'"/>
        </view>
      </view>
    </view>

    <!-- 艺人百科详情弹窗 -->
    <view class="wiki-detail-popup" v-if="showWikiDetail" @click="showWikiDetail = false">
      <view class="wiki-mask"></view>
      <view class="wiki-content-box" @click.stop>
        <!-- 顶部关闭按钮 -->
        <view class="wiki-header">
          <view class="header-left"></view>
          <view class="header-right" @click="showWikiDetail = false">
            <i class="iconfont icon-guanbi"/>
          </view>
        </view>

        <!-- 艺人头像和名称 -->
        <view class="wiki-artist-section">
          <image :src="artistInfo.artist?.avatar || artistInfo.artist?.cover" class="wiki-artist-avatar" mode="aspectFill"/>
          <text class="wiki-artist-name-large">{{ artistInfo.artist?.name }}</text>
          <text class="wiki-artist-alias" v-if="artistInfo.artist?.alias && artistInfo.artist.alias.length > 0">
            {{ artistInfo.artist.alias[0] }}
          </text>
        </view>

        <!-- 基本信息卡片 -->
        <view class="info-card">
          <view class="info-card-header">
            <text class="info-card-title">基本信息</text>
          </view>
          <view class="info-card-content">
            <view class="info-row" v-if="artistInfo.identify?.imageDesc">
              <text class="info-label">身份：</text>
              <text class="info-value">{{ artistInfo.identify.imageDesc }}</text>
            </view>
            <view class="info-row" v-if="artistWiki?.alias">
              <text class="info-label">艺人别名：</text>
              <text class="info-value">{{ artistWiki.alias }}</text>
            </view>
            <view class="info-row" v-if="artistInfo.secondaryExpertIdentiy && artistInfo.secondaryExpertIdentiy.length > 0">
              <text class="info-label">音乐身份：</text>
              <text class="info-value">{{ formatMusicIdentities(artistInfo.secondaryExpertIdentiy) }}</text>
            </view>
            <view class="info-row" v-if="artistWiki?.gender">
              <text class="info-label">性别：</text>
              <text class="info-value">{{ artistWiki.gender }}</text>
            </view>
            <view class="info-row" v-if="artistWiki?.school">
              <text class="info-label">学校：</text>
              <text class="info-value">{{ artistWiki.school }}</text>
            </view>
            <view class="info-row" v-if="artistWiki?.area">
              <text class="info-label">地区：</text>
              <text class="info-value">{{ artistWiki.area }}</text>
            </view>
            <view class="info-row" v-if="artistWiki?.birthday">
              <text class="info-label">生日：</text>
              <text class="info-value">{{ artistWiki.birthday }}</text>
            </view>
            <view class="info-row" v-if="artistWiki?.nation">
              <text class="info-label">民族：</text>
              <text class="info-value">{{ artistWiki.nation }}</text>
            </view>
          </view>
        </view>

        <!-- 艺人简介卡片 -->
        <view class="info-card">
          <view class="info-card-header">
            <text class="info-card-title">艺人简介</text>
          </view>
          <view class="info-card-content">
            <text class="intro-text">{{ artistWiki.briefDesc || artistWiki.introduction }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  getArtistDetail,
  getArtistDesc,
  getArtistSongs,
  getArtistAlbum,
  getArtistMv,
  getArtistFollowCount,
  getUgcArtist,
  getArtistDetailDynamic
} from '@/utils/api.js'
import { useMusicStore } from '@/utils/musicStore.js'
import PlayBar from '@/components/PlayBar/PlayBar.vue'

const musicStore = useMusicStore()

// 歌手 ID
const artistId = ref('')

// 歌手信息
const artistInfo = ref(null)

// 粉丝数
const followCount = ref(0)

// 歌手百科
const artistWiki = ref(null)

// 当前选中的分类
const activeTab = ref('home')

// 分类标签
const tabs = [
  { name: '主页', type: 'home' },
  { name: '歌曲', type: 'songs' },
  { name: '专辑', type: 'albums' },
  { name: '视频', type: 'videos' }
]

// 热门歌曲
const hotSongs = ref([])

// 全部歌曲
const allSongs = ref([])

// 专辑列表
const artistAlbums = ref([])

// MV 列表
const artistMvs = ref([])

// 加载状态
const loading = ref(false)

// 是否有更多歌曲
const hasMoreSongs = ref(true)

// 分页参数
const songLimit = 50
const songOffset = ref(0)
const albumLimit = 30
const albumOffset = ref(0)
const mvLimit = 30
const mvOffset = ref(0)

// 菜单显示状态
const showMenu = ref(false)

// 歌曲排序类型
const songSortType = ref('hot')

// 专辑排序类型
const albumSortType = ref('time')

// 歌曲排序菜单显示
const showSongSortMenu = ref(false)

// 专辑排序菜单显示
const showAlbumSortMenu = ref(false)

// 视频排序方式（true: 倒序，false: 正序）
const videoSortDesc = ref(true)

// 艺人百科详情显示
const showWikiDetail = ref(false)

// 获取 IP 属地
const getIpLocation = (user) => {
  if (!user) return '未知'
  // 根据 user 对象中的 location 信息判断
  if (user.province) {
    const provinceMap = {
      110000: '北京',
      120000: '天津',
      310000: '上海',
      500000: '重庆',
      710000: '台湾',
      810000: '香港',
      820000: '澳门'
    }
    const province = provinceMap[user.province]
    if (province) return province
    
    // 如果有城市信息，尝试返回更具体的位置
    if (user.city && user.city !== user.province) {
      return '中国' // 简化处理
    }
    return '中国'
  }
  return '未知'
}

// 格式化数量
const formatCount = (count) => {
  if (count === undefined || count === null) return '0'
  count = Number(count)
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count.toString()
}

// 格式化播放量
const formatPlayCount = (count) => {
  if (!count) return '0'
  count = Number(count)
  if (count >= 10000) {
    return (count / 10000).toFixed(0)
  }
  return count.toString()
}

// 格式化时长
const formatDuration = (ms) => {
  if (!ms) return '--:--'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
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

// 获取歌手名称
const getArtistNames = (song) => {
  const artists = song.ar || song.artists || []
  if (!artists.length) return '未知歌手'
  return artists.map(a => a.name).join(' / ')
}

// 格式化音乐身份
const formatMusicIdentities = (identities) => {
  if (!identities || identities.length === 0) return ''
  return identities
    .filter(item => item.expertIdentiyCount > 0)
    .map(item => item.expertIdentiyName)
    .join('、')
}

// 获取歌手详情
const fetchArtistDetail = async () => {
  try {
    const res = await getArtistDetail(artistId.value)
    if (res.code === 200 && res.data) {
      artistInfo.value = res.data
      
      // 获取粉丝数
      fetchFollowCount()
      
      // 获取热门歌曲
      fetchHotSongs()
    }
  } catch (error) {
    console.error('获取歌手详情失败:', error)
  }
}

// 获取粉丝数
const fetchFollowCount = async () => {
  try {
    const res = await getArtistFollowCount(artistId.value)
    if (res.code === 200) {
      followCount.value = res.count || 0
    }
  } catch (error) {
    console.error('获取粉丝数失败:', error)
  }
}

// 获取热门歌曲
const fetchHotSongs = async () => {
  try {
    const res = await getArtistSongs(artistId.value, 'hot', 10, 0)
    if (res.code === 200 && res.songs) {
      hotSongs.value = res.songs
    }
  } catch (error) {
    console.error('获取热门歌曲失败:', error)
  }
}

// 获取歌手百科
const fetchArtistWiki = async () => {
  try {
    const res = await getUgcArtist(artistId.value)
    if (res.code === 200 && res.data) {
      artistWiki.value = res.data
    }
  } catch (error) {
    console.error('获取歌手百科失败:', error)
  }
}

// 获取全部歌曲
const fetchAllSongs = async (isLoadMore = false) => {
  if (loading.value) return
  
  if (!isLoadMore) {
    songOffset.value = 0
    allSongs.value = []
    hasMoreSongs.value = true
  }
  
  if (!hasMoreSongs.value && isLoadMore) return
  
  loading.value = true
  try {
    const res = await getArtistSongs(
      artistId.value,
      songSortType.value,
      songLimit,
      songOffset.value
    )
    
    if (res.code === 200 && res.songs) {
      if (isLoadMore) {
        allSongs.value.push(...res.songs)
      } else {
        allSongs.value = res.songs
      }
      
      songOffset.value += res.songs.length
      hasMoreSongs.value = res.songs.length >= songLimit
    } else {
      hasMoreSongs.value = false
    }
  } catch (error) {
    console.error('获取歌曲失败:', error)
    hasMoreSongs.value = false
  } finally {
    loading.value = false
  }
}

// 获取专辑列表
const fetchAlbums = async (isLoadMore = false) => {
  if (loading.value) return
  
  if (!isLoadMore) {
    albumOffset.value = 0
    artistAlbums.value = []
  }
  
  loading.value = true
  try {
    const res = await getArtistAlbum(
      artistId.value,
      albumLimit,
      albumOffset.value
    )
    
    if (res.code === 200 && res.hotAlbums) {
      let albums = res.hotAlbums
      
      // 根据排序方式排序
      if (albumSortType.value === 'hot') {
        albums.sort((a, b) => (b.size || 0) - (a.size || 0))
      } else if (albumSortType.value === 'time') {
        albums.sort((a, b) => (b.publishTime || 0) - (a.publishTime || 0))
      }
      
      if (isLoadMore) {
        artistAlbums.value.push(...albums)
      } else {
        artistAlbums.value = albums
      }
      
      albumOffset.value += albums.length
    }
  } catch (error) {
    console.error('获取专辑失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取MV 列表
const fetchMvs = async (isLoadMore = false) => {
  if (loading.value) return
  
  if (!isLoadMore) {
    mvOffset.value = 0
    artistMvs.value = []
  }
  
  loading.value = true
  try {
    const res = await getArtistMv(
      artistId.value,
      mvLimit,
      mvOffset.value
    )
    
    if (res.code === 200 && res.mvs) {
      let mvs = res.mvs
      
      // 根据排序方式排序
      if (videoSortDesc.value) {
        mvs.sort((a, b) => (b.publishTime || 0) - (a.publishTime || 0))
      } else {
        mvs.sort((a, b) => (a.publishTime || 0) - (b.publishTime || 0))
      }
      
      if (isLoadMore) {
        artistMvs.value.push(...mvs)
      } else {
        artistMvs.value = mvs
      }
      
      mvOffset.value += mvs.length
    }
  } catch (error) {
    console.error('获取MV 失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换分类
const switchTab = (tabType) => {
  activeTab.value = tabType
  
  // 切换到对应分类时加载数据
  if (tabType === 'songs' && allSongs.value.length === 0) {
    fetchAllSongs()
  } else if (tabType === 'albums' && artistAlbums.value.length === 0) {
    fetchAlbums()
  } else if (tabType === 'videos' && artistMvs.value.length === 0) {
    fetchMvs()
  }
}

// 加载更多
const handleLoadMore = () => {
  if (activeTab.value === 'songs' && hasMoreSongs.value) {
    fetchAllSongs(true)
  } else if (activeTab.value === 'albums') {
    fetchAlbums(true)
  } else if (activeTab.value === 'videos') {
    fetchMvs(true)
  }
}

// 加载全部歌曲
const loadAllSongs = () => {
  hasMoreSongs.value = true
  fetchAllSongs(true)
}

// 改变歌曲排序
const changeSongSort = (type) => {
  songSortType.value = type
  showSongSortMenu.value = false
  fetchAllSongs()
}

// 改变专辑排序
const changeAlbumSort = (type) => {
  albumSortType.value = type
  showAlbumSortMenu.value = false
  fetchAlbums()
}

// 切换视频排序
const toggleVideoSort = () => {
  videoSortDesc.value = !videoSortDesc.value
  fetchMvs()
}

// 播放歌曲
const playSong = (song) => {
  uni.navigateTo({
    url: `/pages/player/player?id=${song.id}`
  })
}

// 跳转到专辑
const goToAlbum = (album) => {
  uni.navigateTo({
    url: `/pages/album/album?id=${album.id}`
  })
}

// 播放视频
const playVideo = (video) => {
  uni.navigateTo({
    url: `/pages/video/video?id=${video.id}`
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
const handlePrivateMessage = () => {
  uni.showToast({
    title: '私信功能开发中',
    icon: 'none'
  })
  showMenu.value = false
}

const handleBlockArtist = () => {
  uni.showModal({
    title: '提示',
    content: '确定要屏蔽该音乐人的歌曲吗？',
    success: function(res) {
      if (res.confirm) {
        uni.showToast({
          title: '已屏蔽',
          icon: 'success'
        })
      }
    }
  })
  showMenu.value = false
}

const handleBlacklist = () => {
  uni.showModal({
    title: '提示',
    content: '确定要拉黑该用户吗？',
    success: function(res) {
      if (res.confirm) {
        uni.showToast({
          title: '已拉黑',
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

const handleShare = () => {
  uni.showToast({
    title: '分享功能开发中',
    icon: 'none'
  })
  showMenu.value = false
}

// 页面加载
onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || currentPage.$page?.options || {}
  
  if (options.id) {
    artistId.value = options.id
    await fetchArtistDetail()
    await fetchArtistWiki()
  }
})
</script>

<style lang="scss" scoped>
@import '@/static/iconfont/iconfont.css';

.artist-page {
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
.artist-card {
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
    
    .artist-avatar {
      width: 200rpx;
      height: 200rpx;
      border-radius: 50%;
      border: 6rpx solid #fff;
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    }
  }
  
  .artist-name {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    margin-top: 70rpx;
    text-align: center;
  }
  
  .artist-alias {
    font-size: 26rpx;
    color: #999;
    margin-top: 12rpx;
    text-align: center;
  }
  
  .artist-stats {
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
      display: inline-flex;
      
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

// 区块卡片
.section-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  
  .card-header {
    margin-bottom: 20rpx;
    
    .card-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .card-header-mini {
    margin-bottom: 16rpx;
    
    .card-title-mini {
      font-size: 28rpx;
      font-weight: 500;
      color: #333;
    }
  }
}

// 歌曲列表
.song-list {
  .song-item {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    
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
      
      .play-icon {
        font-size: 40rpx;
        color: #EC4141;
      }
    }
  }
}

// 百科内容
.wiki-content {
  display: flex;
  flex-direction: column;
  
  .wiki-artist-name {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 12rpx;
  }
  
  .wiki-gender-zodiac {
    font-size: 24rpx;
    color: #999;
    margin-bottom: 16rpx;
  }
  
  .wiki-desc {
    font-size: 26rpx;
    color: #666;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
}

// 排序导航条
.sort-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  
  .sort-left {
    font-size: 28rpx;
    color: #666;
  }
  
  .sort-right {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .sort-icon {
      font-size: 40rpx;
      color: #666;
    }
  }
}

// 专辑列表
.album-list {
  .album-item {
    display: flex;
    padding: 24rpx 30rpx;
    background: #fff;
    margin-bottom: 1rpx;
    
    &:active {
      background: #f5f5f5;
    }
    
    .album-cover {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      flex-shrink: 0;
    }
    
    .album-info {
      flex: 1;
      margin-left: 24rpx;
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .album-name {
        font-size: 30rpx;
        color: #333;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      
      .album-publish-time {
        font-size: 24rpx;
        color: #999;
        margin-top: 12rpx;
      }
    }
  }
}

// 视频列表
.video-list {
  .video-item {
    display: flex;
    padding: 24rpx 30rpx;
    background: #fff;
    margin-bottom: 1rpx;
    
    &:active {
      background: #f5f5f5;
    }
    
    .video-thumb {
      position: relative;
      flex-shrink: 0;
      
      .video-cover {
        width: 240rpx;
        height: 160rpx;
        border-radius: 12rpx;
      }
      
      .video-duration {
        position: absolute;
        bottom: 12rpx;
        right: 12rpx;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 22rpx;
        padding: 4rpx 12rpx;
        border-radius: 8rpx;
      }
    }
    
    .video-info {
      flex: 1;
      margin-left: 24rpx;
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .video-name {
        font-size: 30rpx;
        color: #333;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      
      .video-publish-time {
        font-size: 24rpx;
        color: #999;
        margin-top: 12rpx;
      }
      
      .video-play-count {
        font-size: 24rpx;
        color: #999;
        margin-top: 8rpx;
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

// 查看全部按钮
.view-all-btn {
  padding: 30rpx;
  text-align: center;
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  
  .view-all-text {
    font-size: 28rpx;
    color: #EC4141;
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

// 排序弹窗
.sort-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  
  .sort-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .sort-content {
    position: relative;
    width: 100%;
    background-color: #fff;
    border-radius: 24rpx 24rpx 0 0;
    padding: 24rpx;
    animation: slideUp 0.3s ease-out;
    
    .sort-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 30rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      &:active {
        background: #f5f5f5;
      }
      
      .sort-option-text {
        font-size: 30rpx;
        color: #333;
      }
      
      .iconfont {
        font-size: 40rpx;
        color: #EC4141;
      }
    }
  }
}

// 艺人百科详情弹窗
.wiki-detail-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  
  .wiki-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .wiki-content-box {
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
}

.wiki-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e0e0e0;
  flex-shrink: 0;
  
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
}

.wiki-artist-section {
  padding: 40rpx 30rpx;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1rpx solid #f0f0f0;
  
  .wiki-artist-avatar {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    margin-bottom: 24rpx;
  }
  
  .wiki-artist-name-large {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 12rpx;
  }
  
  .wiki-artist-alias {
    font-size: 26rpx;
    color: #999;
  }
}

.info-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  
  .info-card-header {
    margin-bottom: 20rpx;
    
    .info-card-title {
      font-size: 28rpx;
      font-weight: 500;
      color: #333;
    }
  }
  
  .info-card-content {
    .info-row {
      margin-bottom: 20rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .info-label {
        font-size: 26rpx;
        color: #999;
        margin-right: 12rpx;
      }
      
      .info-value {
        font-size: 26rpx;
        color: #333;
      }
    }
    
    .intro-text {
      font-size: 26rpx;
      color: #666;
      line-height: 1.8;
      white-space: pre-wrap;
      word-wrap: break-word;
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
