<template>
  <view class="search-result-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />
    <!-- 顶部导航栏 -->
    <view class="search-navbar">
      <view class="nav-left" @click="goBack">
        <i class="iconfont icon-arrow-left nav-icon" />
      </view>

      <view class="nav-center">
        <view class="search-input-container" @click="goToSearchPage">
          <i class="iconfont icon-sousuo search-icon" />
          <input
            class="search-input"
            :value="currentKeyword"
            :placeholder="currentKeyword"
            disabled
          />
        </view>
      </view>
    </view>

    <!-- 分类标签 -->
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

    <!-- 错误提示 -->
    <view v-if="apiError" class="error-message" @click="retryLoad">
      <text class="error-text">连接服务器超时，点击重试</text>
    </view>

    <!-- 搜索结果内容 -->
    <scroll-view
      class="result-content"
      scroll-y
      :style="{ height: contentHeight + 'px' }"
      @scrolltolower="loadMore"
      v-else
    >
      <!-- 综合分类显示所有类型的结果 -->
      <view v-if="activeTab === 'all'">
        <!-- 调试信息显示 -->
        <!--<view class="debug-info" v-if="showDebug">
          <text>调试信息:</text>
          <text>单曲: {{ allResults.songs?.length || 0 }}</text>
          <text>歌单: {{ allResults.playlists?.length || 0 }}</text>
          <text>专辑: {{ allResults.albums?.length || 0 }}</text>
          <text>歌手: {{ allResults.artists?.length || 0 }}</text>
          <text>视频: {{ allResults.videos?.length || 0 }}</text>
          <text>用户: {{ allResults.users?.length || 0 }}</text>
          <text>播客: {{ allResults.radios?.length || 0 }}</text>
          <text>声音: {{ allResults.voices?.length || 0 }}</text>
        </view>-->
        <!-- 单曲 -->
        <view class="result-section">
          <view class="section-header" v-if="allResults.songs && allResults.songs.length > 0">
            <text class="section-title">单曲</text>
          </view>
          <view class="song-list" v-if="allResults.songs && allResults.songs.length > 0">
            <view
              class="song-item"
              v-for="(song, index) in allResults.songs.slice(0, 8)"
              :key="index"
              @click="playSong(song)"
            >
              <view class="song-info">
                <text class="song-name">{{ song.name }}</text>
                <text class="song-artist">{{ formatSongArtists(song) }} - {{ getSongAlbumName(song) }}</text>
              </view>
              <view class="song-actions">
                <i class="iconfont icon-bofang1 play-icon" />
              </view>
            </view>

            <!-- 查看全部按钮 -->
            <view
              class="view-all-btn"
              v-if="allResults.songMoreText"
              @click="switchTab('single')"
            >
              <text class="view-all-text">{{ allResults.songMoreText }}<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>

        <!-- 歌单 -->
        <view class="result-section">
          <view class="section-header" v-if="allResults.playlists && allResults.playlists.length > 0">
            <text class="section-title">歌单</text>
          </view>
          <view class="playlist-list" v-if="allResults.playlists && allResults.playlists.length > 0">
            <view
              class="playlist-item"
              v-for="(playlist, index) in allResults.playlists.slice(0, 5)"
              :key="index"
              @click="goToPlaylist(playlist)"
            >
              <image :src="playlist.coverImgUrl || playlist.picUrl" class="playlist-cover" mode="aspectFill" />
              <view class="playlist-info">
                <text class="playlist-name">{{ playlist.name }}</text>
                <text class="playlist-creator">by {{ playlist.creator?.nickname || playlist.creatorName || '未知' }}</text>
              </view>
            </view>

            <!-- 查看全部按钮 -->
            <view
              class="view-all-btn"
              v-if="allResults.playlistMoreText"
              @click="switchTab('playlist')"
            >
              <text class="view-all-text">{{ allResults.playlistMoreText }}<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>

        <!-- 声音 -->
        <!-- 注释：综合分类下声音数据需要单独请求接口 -->
        <!-- <view class="result-section">
          <view class="section-header" v-if="allResults.voices && allResults.voices.length > 0">
            <text class="section-title">声音</text>
          </view>
          <view class="voice-list" v-if="allResults.voices && allResults.voices.length > 0">
            <view
              class="voice-item"
              v-for="(voice, index) in allResults.voices.slice(0, 3)"
              :key="index"
              @click="playVoice(voice)"
            >
              <view class="voice-info">
                <text class="voice-name">{{ formatVoiceData(voice).name }}</text>
                <text class="voice-desc">{{ formatVoiceData(voice).desc }}</text>
                <text class="voice-creator">by {{ formatVoiceData(voice).creator }}</text>
              </view>
            </view>

            <view
              class="view-all-btn"
              v-if="allResults.voiceMoreText"
              @click="switchTab('voice')"
            >
              <text class="view-all-text">{{ allResults.voiceMoreText }}<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view> -->

        <!-- 声音（特殊处理：单独请求数据）-->
        <view class="result-section">
          <view class="section-header" v-if="voiceResults.length > 0">
            <text class="section-title">声音</text>
          </view>
          <view class="voice-list" v-if="voiceResults.length > 0">
            <view
              class="voice-item"
              v-for="(voice, index) in voiceResults.slice(0, 3)"
              :key="index"
              @click="playVoice(voice)"
            >
              <view class="voice-info">
                <text class="voice-name">{{ formatVoiceData(voice).name }}</text>
                <text class="voice-desc">{{ formatVoiceData(voice).desc }}</text>
                <text class="voice-creator">by {{ formatVoiceData(voice).creator }}</text>
              </view>
            </view>

            <view
              class="view-all-btn"
              v-if="voiceResults.length > 3"
              @click="switchTab('voice')"
            >
              <text class="view-all-text">查看全部{{ voiceResults.length }}个声音<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>

        <!-- 专辑 -->
        <view class="result-section">
          <view class="section-header" v-if="allResults.albums && allResults.albums.length > 0">
            <text class="section-title">专辑</text>
          </view>
          <view class="album-list" v-if="allResults.albums && allResults.albums.length > 0">
            <view
              class="album-item"
              v-for="(album, index) in allResults.albums.slice(0, 3)"
              :key="index"
              @click="goToAlbum(album)"
            >
              <image :src="album.picUrl || album.cover" class="album-cover" mode="aspectFill" />
              <view class="album-info">
                <text class="album-name">{{ album.name }}</text>
                <text class="album-artist">{{ formatArtists(album.artists || [album.artist]) }}</text>
              </view>
            </view>

            <!-- 查看全部按钮 -->
            <view
              class="view-all-btn"
              v-if="allResults.albumMoreText"
              @click="switchTab('album')"
            >
              <text class="view-all-text">{{ allResults.albumMoreText }}<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>

        <!-- 播客(电台) -->
        <!-- 注释：综合分类下播客数据需要单独请求接口 -->
        <!-- <view class="result-section">
          <view class="section-header" v-if="allResults.radios && allResults.radios.length > 0">
            <text class="section-title">播客</text>
          </view>
          <view class="radio-list" v-if="allResults.radios && allResults.radios.length > 0">
            <view
              class="radio-item"
              v-for="(radio, index) in allResults.radios.slice(0, 5)"
              :key="index"
              @click="goToRadio(radio)"
            >
              <image :src="radio.picUrl || radio.cover" class="radio-cover" mode="aspectFill" />
              <view class="radio-info">
                <text class="radio-name">{{ radio.name }}</text>
                <text class="radio-creator">{{ radio.dj?.nickname || radio.creatorName || '未知主播' }}</text>
              </view>
            </view>

            <view
              class="view-all-btn"
              v-if="allResults.radioMoreText"
              @click="switchTab('radio')"
            >
              <text class="view-all-text">{{ allResults.radioMoreText }}<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view> -->

        <!-- 播客(电台)（特殊处理：单独请求数据）-->
        <!--<view class="result-section">
          <view class="section-header" v-if="radioResults.length > 0">
            <text class="section-title">播客</text>
          </view>
          <view class="radio-list" v-if="radioResults.length > 0">
            <view
              class="radio-item"
              v-for="(radio, index) in radioResults.slice(0, 5)"
              :key="index"
              @click="goToRadio(radio)"
            >
              <image :src="radio.picUrl || radio.cover" class="radio-cover" mode="aspectFill" />
              <view class="radio-info">
                <text class="radio-name">{{ radio.name }}</text>
                <text class="radio-creator">{{ radio.dj?.nickname || radio.creatorName || '未知主播' }}</text>
              </view>
            </view>

            <view
              class="view-all-btn"
              v-if="radioResults.length > 5"
              @click="switchTab('radio')"
            >
              <text class="view-all-text">查看全部{{ radioResults.length }}个播客<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>-->

        <!-- 视频(MV) -->
        <!-- 注释：综合分类下视频数据需要单独请求接口 -->
        <!-- <view class="result-section">
          <view class="section-header" v-if="allResults.videos && allResults.videos.length > 0">
            <text class="section-title">视频</text>
          </view>
          <view class="video-list" v-if="allResults.videos && allResults.videos.length > 0">
            <view
              class="video-item"
              v-for="(video, index) in allResults.videos.slice(0, 5)"
              :key="index"
              @click="playVideo(video)"
            >
              <view class="video-thumb">
                <image :src="video.cover || video.picUrl" class="video-cover" mode="aspectFill" />
                <view class="video-duration">{{ formatDuration(video.duration || video.playTime) }}</view>
              </view>
              <view class="video-info">
                <text class="video-name">{{ video.name }}</text>
                <text class="video-artist">{{ formatArtists(video.artists || video.creator) }}</text>
              </view>
            </view>

            <view
              class="view-all-btn"
              v-if="allResults.videoMoreText"
              @click="switchTab('video')"
            >
              <text class="view-all-text">{{ allResults.videoMoreText }}</text>
            </view>
          </view>
        </view> -->

        <!-- 视频(MV)（特殊处理：单独请求数据）-->
        <view class="result-section">
          <view class="section-header" v-if="videoResults.length > 0">
            <text class="section-title">视频</text>
          </view>
          <view class="video-list" v-if="videoResults.length > 0">
            <view
              class="video-item"
              v-for="(video, index) in videoResults.slice(0, 5)"
              :key="index"
              @click="playVideo(video)"
            >
              <view class="video-thumb">
                <image :src="video.cover || video.picUrl" class="video-cover" mode="aspectFill" />
                <view class="video-duration">{{ formatDuration(video.duration || video.playTime) }}</view>
              </view>
              <view class="video-info">
                <text class="video-name">{{ video.name }}</text>
                <text class="video-artist">{{ formatArtists(video.artists || video.creator) }}</text>
              </view>
            </view>

            <view
              class="view-all-btn"
              v-if="videoResults.length > 5"
              @click="switchTab('video')"
            >
              <text class="view-all-text">查看全部{{ videoResults.length }}个视频<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>

        <!-- 歌手 -->
        <view class="result-section">
          <view class="section-header" v-if="allResults.artists && allResults.artists.length > 0">
            <text class="section-title">歌手</text>
          </view>
          <view class="artist-list" v-if="allResults.artists && allResults.artists.length > 0">
            <view
              class="artist-item"
              v-for="(artist, index) in allResults.artists.slice(0, 3)"
              :key="index"
              @click="goToArtist(artist)"
            >
              <image :src="artist.img1v1Url || artist.picUrl" class="artist-avatar" mode="aspectFill" />
              <view class="artist-info">
                <text class="artist-name">{{ artist.name }}</text>
              </view>
            </view>

            <!-- 查看全部按钮 -->
            <view
              class="view-all-btn"
              v-if="allResults.artistMoreText"
              @click="switchTab('artist')"
            >
              <text class="view-all-text">{{ allResults.artistMoreText }}<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>

        <!-- 用户 -->
        <view class="result-section">
          <view class="section-header" v-if="allResults.users && allResults.users.length > 0">
            <text class="section-title">用户</text>
          </view>
          <view class="user-list" v-if="allResults.users && allResults.users.length > 0">
            <view
              class="user-item"
              v-for="(user, index) in allResults.users.slice(0, 1)"
              :key="index"
              @click="goToUser(user)"
            >
              <image :src="user.avatarUrl || user.avatar" class="user-avatar" mode="aspectFill" />
              <view class="user-info">
                <text class="user-name">{{ user.nickname || user.userName }}</text>
              </view>
            </view>

            <!-- 查看全部按钮 -->
            <view
              class="view-all-btn"
              v-if="allResults.userMoreText"
              @click="switchTab('user')"
            >
              <text class="view-all-text">{{ allResults.userMoreText }}<i class="iconfont icon-arrow-right"/></text>
            </view>
          </view>
        </view>
      </view>

      <!-- 单独分类显示对应类型的结果 -->
      <view v-else>
        <!-- 单曲 -->
        <view class="result-section" v-if="activeTab === 'single'">
          <view class="section-header" v-if="singleResults.length > 0">
            <text class="section-title">单曲</text>
          </view>
          <view class="song-list">
            <view
              class="song-item"
              v-for="(song, index) in singleResults"
              :key="index"
              @click="playSong(song)"
            >
              <view class="song-info">
                <text class="song-name">{{ song.name }}</text>
                <text class="song-artist">{{ formatSongArtists(song) }} - {{ getSongAlbumName(song) }}</text>
              </view>
              <view class="song-actions">
                <i class="iconfont icon-bofang1 play-icon" />
              </view>
            </view>
          </view>
        </view>

        <!-- 歌单 -->
        <view class="result-section" v-if="activeTab === 'playlist'">
          <view class="section-header" v-if="playlistResults.length > 0">
            <text class="section-title">歌单</text>
          </view>
          <view class="playlist-list">
            <view
              class="playlist-item"
              v-for="(playlist, index) in playlistResults"
              :key="index"
              @click="goToPlaylist(playlist)"
            >
              <image :src="playlist.coverImgUrl || playlist.picUrl" class="playlist-cover" mode="aspectFill" />
              <view class="playlist-info">
                <text class="playlist-name">{{ playlist.name }}</text>
                <text class="playlist-creator">by {{ playlist.creator?.nickname || playlist.creatorName || '未知' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 声音 -->
        <view class="result-section" v-if="activeTab === 'voice'">
          <view class="section-header" v-if="voiceResults.length > 0">
            <text class="section-title">声音</text>
          </view>
          <view class="voice-list">
            <view
              class="voice-item"
              v-for="(voice, index) in voiceResults"
              :key="index"
              @click="playVoice(voice)"
            >
              <view class="voice-info">
                <text class="voice-name">{{ formatVoiceData(voice).name }}</text>
                <text class="voice-desc">{{ formatVoiceData(voice).desc }}</text>
                <text class="voice-creator">by {{ formatVoiceData(voice).creator }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 专辑 -->
        <view class="result-section" v-if="activeTab === 'album'">
          <view class="section-header" v-if="albumResults.length > 0">
            <text class="section-title">专辑</text>
          </view>
          <view class="album-list">
            <view
              class="album-item"
              v-for="(album, index) in albumResults"
              :key="index"
              @click="goToAlbum(album)"
            >
              <image :src="album.picUrl || album.cover" class="album-cover" mode="aspectFill" />
              <view class="album-info">
                <text class="album-name">{{ album.name }}</text>
                <text class="album-artist">{{ formatArtists(album.artists || [album.artist]) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 播客(电台) -->
        <view class="result-section" v-if="activeTab === 'radio'">
          <view class="section-header" v-if="radioResults.length > 0">
            <text class="section-title">播客</text>
          </view>
          <view class="radio-list">
            <view
              class="radio-item"
              v-for="(radio, index) in radioResults"
              :key="index"
              @click="goToRadio(radio)"
            >
              <image :src="radio.picUrl || radio.cover" class="radio-cover" mode="aspectFill" />
              <view class="radio-info">
                <text class="radio-name">{{ radio.name }}</text>
                <text class="radio-creator">{{ radio.dj?.nickname || radio.creatorName || '未知主播' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 视频(MV) -->
        <view class="result-section" v-if="activeTab === 'video'">
          <view class="section-header" v-if="videoResults.length > 0">
            <text class="section-title">视频</text>
          </view>
          <view class="video-list">
            <view
              class="video-item"
              v-for="(video, index) in videoResults"
              :key="index"
              @click="playVideo(video)"
            >
              <view class="video-thumb">
                <image :src="video.cover || video.picUrl" class="video-cover" mode="aspectFill" />
                <view class="video-duration">{{ formatDuration(video.duration || video.playTime) }}</view>
              </view>
              <view class="video-info">
                <text class="video-name">{{ video.name }}</text>
                <text class="video-artist">{{ formatArtists(video.artists || video.creator) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 歌手 -->
        <view class="result-section" v-if="activeTab === 'artist'">
          <view class="section-header" v-if="artistResults.length > 0">
            <text class="section-title">歌手</text>
          </view>
          <view class="artist-list">
            <view
              class="artist-item"
              v-for="(artist, index) in artistResults"
              :key="index"
              @click="goToArtist(artist)"
            >
              <image :src="artist.img1v1Url || artist.picUrl" class="artist-avatar" mode="aspectFill" />
              <view class="artist-info">
                <text class="artist-name">{{ artist.name }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 用户 -->
        <view class="result-section" v-if="activeTab === 'user'">
          <view class="section-header" v-if="userResults.length > 0">
            <text class="section-title">用户</text>
          </view>
          <view class="user-list">
            <view
              class="user-item"
              v-for="(user, index) in userResults"
              :key="index"
              @click="goToUser(user)"
            >
              <image :src="user.avatarUrl || user.avatar" class="user-avatar" mode="aspectFill" />
              <view class="user-info">
                <text class="user-name">{{ user.nickname || user.userName }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 歌词 -->
        <view class="result-section" v-if="activeTab === 'lyrics'">
          <view class="section-header" v-if="lyricsResults.length > 0">
            <text class="section-title">歌词</text>
          </view>
          <view class="lyrics-list">
            <view
              class="lyrics-item-wrapper"
              v-for="(lyric, index) in lyricsResults"
              :key="index"
              @click="playSong(lyric)"
            >
              <view class="lyrics-item">
                <view class="lyrics-info">
                  <text class="lyrics-name">{{ lyric.name }}</text>
                  <text class="lyrics-artist">{{ formatSongArtists(lyric) }} - {{ getSongAlbumName(lyric) }}</text>
                  <text class="lyrics-content" v-if="getLyricsContent(lyric)">{{ getLyricsContent(lyric).substring(0, showFullLyrics[lyric.id] ? getLyricsContent(lyric).length : 50) }}{{ getLyricsContent(lyric).length > 50 && !showFullLyrics[lyric.id] ? '...' : '' }}</text>
                </view>
                <view class="lyrics-actions">
                  <i class="iconfont icon-bofang1 play-icon" />
                </view>
              </view>

              <!-- 查看更多歌词按钮 -->
              <view
                class="view-more-lyrics"
                v-if="shouldShowMoreButton(lyric)"
                @click.stop="toggleLyrics(lyric.id)"
              >
                <text class="view-more-text">{{ showFullLyrics[lyric.id] ? '收起' : '查看更多歌词' }}</text>
                <i class="iconfont" :class="showFullLyrics[lyric.id] ? 'icon-shangjiantou' : 'icon-xiajiantou'"></i>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="loading" v-if="loading">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && isEmptyResult">
        <text class="empty-text">暂无搜索结果</text>
      </view>

      <!-- 底部播放控制条占位块（防止内容被遮挡） -->
      <view v-if="!loading && !isEmptyResult" class="play-bar-placeholder"></view>
    </scroll-view>

    <!-- 底部播放控制条（固定底部） -->
    <PlayBar class="play-bar" />
    <!-- 搜索弹窗组件 -->
    <SearchPopup v-model="showSearchPopup" @search="handleSearchFromPopup" />
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { search, getSearchDefault } from '@/utils/api.js'
import { useMusicStore } from '@/utils/musicStore.js'
import PlayBar from '@/components/PlayBar/PlayBar.vue'
import SearchPopup from '@/components/SearchPopup/SearchPopup.vue'

const musicStore = useMusicStore()

// 获取页面参数
const currentKeyword = ref('')
const showSearchPopup = ref(false) // 控制搜索弹窗显示

// 使用onLoad生命周期获取参数
onLoad((options) => {
  const keyword = options.keyword || ''
  currentKeyword.value = decodeURIComponent(keyword)
})

// 定义页面的其他生命周期
onShow(() => {
  // 页面显示时的逻辑
})

// 数据
const activeTab = ref('all')
const allResults = ref({}) // 综合搜索结果
const singleResults = ref([]) // 单曲结果
const playlistResults = ref([]) // 歌单结果
const voiceResults = ref([]) // 声音结果
const albumResults = ref([]) // 专辑结果
const radioResults = ref([]) // 电台结果
const videoResults = ref([]) // 视频结果
const artistResults = ref([]) // 歌手结果
const userResults = ref([]) // 用户结果
const lyricsResults = ref([]) // 歌词结果
const loading = ref(false)
const contentHeight = ref(0)
const currentPage = ref(1)
const pageSize = ref(30)
const apiError = ref(false)
const showDebug = ref(true) // 调试开关
const showFullLyrics = ref({}) // 控制歌词展开/收起状态

// 标签页配置
const tabs = [
  { name: '综合', type: 'all' },
  { name: '单曲', type: 'single' },
  { name: '歌单', type: 'playlist' },
  /*{ name: '播客', type: 'radio' },*/
  { name: '专辑', type: 'album' },
  { name: '歌手', type: 'artist' },
  { name: '视频', type: 'video' },
  { name: '用户', type: 'user' },
  { name: '歌词', type: 'lyrics' },
  { name: '声音', type: 'voice' }
]

// 搜索类型映射
const searchTypeMap = {
  'single': 1,      // 单曲
  'playlist': 1000, // 歌单
  'album': 10,      // 专辑
  'artist': 100,    // 歌手
  'video': 1004,    // 视频
  'user': 1002,     // 用户
  'radio': 1009,    // 电台
  'voice': 2000,    // 声音
  'lyrics': 1006    // 歌词
}

// 计算是否为空结果
const isEmptyResult = computed(() => {
  if (activeTab.value === 'all') {
    if (!allResults.value || typeof allResults.value !== 'object') {
      return true
    }
    return Object.keys(allResults.value).every(key =>
      !allResults.value[key] || allResults.value[key].length === 0
    )
  } else {
    // 对于单独的分类，检查对应的结果数组
    let resultArray = []
    switch(activeTab.value) {
      case 'single':
        resultArray = singleResults.value
        break
      case 'playlist':
        resultArray = playlistResults.value
        break
      case 'voice':
        resultArray = voiceResults.value
        break
      case 'album':
        resultArray = albumResults.value
        break
      case 'radio':
        resultArray = radioResults.value
        break
      case 'video':
        resultArray = videoResults.value
        break
      case 'artist':
        resultArray = artistResults.value
        break
      case 'user':
        resultArray = userResults.value
        break
      case 'lyrics':
        resultArray = lyricsResults.value
        break
      default:
        resultArray = []
    }
    return resultArray.length === 0
  }
})

// 获取结果键名
const getResultKeyByTab = (tabType) => {
  const map = {
    'all': '',
    'single': 'songs',
    'playlist': 'playlists',
    'radio': 'radios',
    'album': 'albums',
    'artist': 'artists',
    'video': 'videos',
    'user': 'users',
    'lyrics': 'lyrics',
    'voice': 'voices'
  }
  return map[tabType] || ''
}

// 搜索数据
const searchResultsData = async (type = 1018) => {
  loading.value = true
  try {
    const res = await search(currentKeyword.value, type, pageSize.value, (currentPage.value - 1) * pageSize.value)

    if (res && res.code === 200) {
      // 根据返回的数据结构处理结果
      const result = res.result || res.data

      if (type === 1018 || activeTab.value === 'all') { // 综合搜索
        allResults.value = {
          songs: result?.song?.songs || result?.songs || [],
          songMoreText: result?.song?.moreText || '',
          playlists: result?.playlists || result?.playList?.playLists || result?.playlist?.playLists || [],
          playlistMoreText: result?.playList?.moreText || result?.playlist?.moreText || '',
          albums: result?.albums || result?.album?.albums || [],
          albumMoreText: result?.album?.moreText || '',
          artists: result?.artists || result?.artist?.artists || [],
          artistMoreText: result?.artist?.moreText || '',
          videos: result?.mvs || result?.videos || result?.video?.videos || [],
          videoMoreText: result?.video?.moreText || '',
          users: result?.userprofiles || result?.users || result?.user?.users || [],
          userMoreText: result?.user?.moreText || '',
          radios: result?.djRadios || result?.djRadio?.djRadios || [],
          radioMoreText: result?.djRadio?.moreText || '',
          voices: result?.resources?.filter(item => item.resourceType === 'voice') || result?.soundList || result?.voice?.soundList || [],
          voiceMoreText: result?.voice?.moreText || ''
        }

        // 调试信息
        /*console.log('综合搜索结果:', {
          songs: allResults.value.songs.length,
          playlists: allResults.value.playlists.length,
          albums: allResults.value.albums.length,
          artists: allResults.value.artists.length,
          videos: allResults.value.videos.length,
          users: allResults.value.users.length,
          radios: allResults.value.radios.length,
          voices: allResults.value.voices.length
        })*/

        // 特殊处理：为视频、播客、声音分类单独请求数据（当在综合分类下时）
        if (activeTab.value === 'all') {
          // 请求视频数据（获取完整数据，但只渲染前5条）
          if (searchTypeMap.video) {
            search(currentKeyword.value, 1004, 100, 0).then(videoRes => {
              if (videoRes && videoRes.code === 200) {
                const videoResult = videoRes.result || videoRes.data
                const fullVideoData = videoResult?.mvs || videoResult?.videos || videoResult?.video?.videos || []
                videoResults.value = fullVideoData
                // console.log('视频数据加载完成:', fullVideoData.length, '条，显示前5条')
              }
            }).catch(error => {
              console.error('视频数据加载失败:', error)
            })
          }

          // 请求播客数据（获取完整数据，但只渲染前5条）
          if (searchTypeMap.radio) {
            search(currentKeyword.value, 1009, 100, 0).then(radioRes => {
              if (radioRes && radioRes.code === 200) {
                const radioResult = radioRes.result || radioRes.data
                const fullRadioData = radioResult?.djRadios || radioResult?.djRadio?.djRadios || []
                radioResults.value = fullRadioData
                // console.log('播客数据加载完成:', fullRadioData.length, '条，显示前5条')
              }
            }).catch(error => {
              console.error('播客数据加载失败:', error)
            })
          }

          // 请求声音数据（获取完整数据，但只渲染前3条）
          if (searchTypeMap.voice) {
            search(currentKeyword.value, 2000, 100, 0).then(voiceRes => {
              if (voiceRes && voiceRes.code === 200) {
                const voiceResult = voiceRes.result || voiceRes.data
                const fullVoiceData = voiceResult?.resources?.filter(item => item.resourceType === 'voice') || voiceResult?.soundList || voiceResult?.voice?.soundList || []
                voiceResults.value = fullVoiceData
                // console.log('声音数据加载完成:', fullVoiceData.length, '条，显示前3条')
              }
            }).catch(error => {
              console.error('声音数据加载失败:', error)
            })
          }
        }
      } else if (type === 1) { // 单曲
        // 追加単曲数据
        const newSongs = result?.songs || result?.song?.songs || []
        singleResults.value = [...singleResults.value, ...newSongs]
      } else if (type === 1000) { // 歌单
        // 追加歌单数据
        const newPlaylists = result?.playlists || result?.playList?.playLists || result?.playlist?.playLists || []
        playlistResults.value = [...playlistResults.value, ...newPlaylists]
      } else if (type === 10) { // 专辑
        // 追加专辑数据
        const newAlbums = result?.albums || result?.album?.albums || []
        albumResults.value = [...albumResults.value, ...newAlbums]
      } else if (type === 100) { // 歌手
        // 追加歌手数据
        const newArtists = result?.artists || result?.artist?.artists || []
        artistResults.value = [...artistResults.value, ...newArtists]
      } else if (type === 1004) { // MV/视频
        // 追加视频数据
        const newVideos = result?.mvs || result?.videos || result?.video?.videos || []
        videoResults.value = [...videoResults.value, ...newVideos]
      } else if (type === 1002) { // 用户
        // 追加用户数据
        const newUsers = result?.userprofiles || result?.users || result?.user?.users || []
        userResults.value = [...userResults.value, ...newUsers]
      } else if (type === 1009) { // 电台
        // 追加电台数据
        const newRadios = result?.djRadios || result?.djRadio?.djRadios || []
        radioResults.value = [...radioResults.value, ...newRadios]
      } else if (type === 1006) { // 歌词
        // 追加歌词数据
        const newLyrics = result?.songs || result?.song?.songs || []
        lyricsResults.value = [...lyricsResults.value, ...newLyrics]
      } else if (type === 2000) { // 声音
        // 追加声音数据
        const newVoices = result?.resources?.filter(item => item.resourceType === 'voice') || result?.soundList || result?.voice?.soundList || []
        voiceResults.value = [...voiceResults.value, ...newVoices]
      }
    }
  } catch (error) {
    console.error('搜索失败:', error)
    // 即使请求失败，也要隐藏加载状态
  } finally {
    loading.value = false
  }
}

// 切换标签
const switchTab = async (tabType) => {
  activeTab.value = tabType
  currentPage.value = 1

  // 清空当前分类的数据（除了综合）
  if (tabType !== 'all') {
    if (tabType === 'single') singleResults.value = []
    else if (tabType === 'playlist') playlistResults.value = []
    else if (tabType === 'album') albumResults.value = []
    else if (tabType === 'artist') artistResults.value = []
    else if (tabType === 'video') videoResults.value = []
    else if (tabType === 'user') userResults.value = []
    else if (tabType === 'radio') radioResults.value = []
    else if (tabType === 'voice') voiceResults.value = []
    else if (tabType === 'lyrics') lyricsResults.value = []
  }

  let searchType = 1018 // 默认综合搜索
  if (tabType === 'all') {
    // 如果切换到综合，且还没有数据，则加载综合数据
    if (!allResults.value.songs || allResults.value.songs.length === 0) {
      searchType = 1018
      await searchResultsData(searchType)
    }
    return
  } else if (tabType in searchTypeMap) {
    searchType = searchTypeMap[tabType]
  }

  await searchResultsData(searchType)
}

// 格式化艺术家名称
const formatArtists = (artists) => {
  if (!artists) return '未知'
  return artists.map(artist => artist.name).join('/')
}

// 格式化声音数据
const formatVoiceData = (voice) => {
  // 处理后端返回的resources格式
  if (voice?.baseInfo) {
    return {
      id: voice.resourceId,
      name: voice.baseInfo.name || voice.uiElement?.mainTitle?.title || '未知声音',
      desc: voice.baseInfo.description || '',
      cover: voice.baseInfo.coverUrl || '',
      duration: voice.baseInfo.duration || 0,
      playCount: voice.baseInfo.listenerCount || 0,
      creator: voice.baseInfo.dj?.nickname || '未知主播'
    }
  }
  // 兼容旧的数据结构
  return voice
}

// 格式化歌曲艺术家名称
const formatSongArtists = (song) => {
  if (song?.artists && Array.isArray(song.artists)) {
    return song.artists.map(artist => artist.name).join('/')
  } else if (song?.ar && Array.isArray(song.ar)) {
    // 兼容旧的数据结构
    return song.ar.map(artist => artist.name).join('/')
  }
  return '未知'
}

// 获取歌词内容
const getLyricsContent = (song) => {
  // 处理新的歌词数据结构
  if (song?.lyrics?.txt) {
    return song.lyrics.txt
  }
  // 兼容旧的数据结构
  if (song?.lyrics) {
    return song.lyrics
  }
  return
}

// 切换歌词显示状态
const toggleLyrics = (songId) => {
  showFullLyrics.value[songId] = !showFullLyrics.value[songId]
}

// 判断是否显示"查看更多"按钮
const shouldShowMoreButton = (song) => {
  const content = getLyricsContent(song)
  return content && content.length > 50
}

// 获取歌曲专辑名称
const getSongAlbumName = (song) => {
  if (song?.album?.name) {
    return song.album.name
  } else if (song?.al?.name) {
    // 兼容旧的数据结构
    return song.al.name
  }
  return ''
}

// 格式化时长
const formatDuration = (duration) => {
  if (!duration) return '0:00'
  const minutes = Math.floor(duration / 1000 / 60)
  const seconds = Math.floor((duration / 1000) % 60)
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

// 播放歌曲
const playSong = (song) => {
  musicStore.playSongById(song.id)
  uni.navigateTo({
    url: `/pages/player/player?id=${song.id}&name=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(formatSongArtists(song))}`
  })
}

// 播放视频
const playVideo = (video) => {
  uni.navigateTo({
    url: `/pages/video/video?id=${video.id}`
  })
}

// 播放声音
const playVoice = (voice) => {
  const voiceData = formatVoiceData(voice)
  // 暂时跳转到播放页面
  uni.navigateTo({
    url: `/pages/player/player?id=${voiceData.id}&type=voice&name=${encodeURIComponent(voiceData.name)}`
  })
}

// 跳转到歌单详情
const goToPlaylist = (playlist) => {
  uni.navigateTo({
    url: `/pages/playlist/playlist?id=${playlist.id}`
  })
}

// 跳转到专辑详情
const goToAlbum = (album) => {
  uni.navigateTo({
    url: `/pages/album/album?id=${album.id}`
  })
}

// 跳转到歌手详情
const goToArtist = (artist) => {
  uni.navigateTo({
    url: `/pages/artist/artist?id=${artist.id}`
  })
}

// 跳转到用户详情
const goToUser = (user) => {
  // 优先使用 userId，如果没有则使用 id
  const uid = user.userId || user.id
  uni.navigateTo({
    url: `/pages/user/user?id=${uid}`
  })
}

// 跳转到电台详情
const goToRadio = (radio) => {
  uni.navigateTo({
    url: `/pages/playlist/playlist?id=${radio.id}&type=radio`
  })
}

// 跳转到分类页面（实际上是在当前页面切换标签）
const goToCategory = (category) => {
  switchTab(category)
}

// 处理搜索点击 - 打开搜索弹窗
const handleSearchClick = () => {
  showSearchPopup.value = true
}

// 处理从弹窗发起的搜索
const handleSearchFromPopup = (keyword) => {
  // 更新当前关键词
  currentKeyword.value = keyword
  // 刷新搜索结果
  currentPage.value = 1
  allResults.value = {}
  singleResults.value = []
  playlistResults.value = []
  voiceResults.value = []
  albumResults.value = []
  radioResults.value = []
  videoResults.value = []
  artistResults.value = []
  userResults.value = []
  lyricsResults.value = []
  // 重新加载数据
  searchResultsData(1018).catch(error => {
    console.error('搜索结果加载失败:', error)
    apiError.value = true
  })
}

// 跳转回搜索页面（原方法保留，但现在使用弹窗）
const goToSearchPage = () => {
  // 改为打开搜索弹窗
  handleSearchClick()
}

// 返回上一页
const goBack = () => {
  // 返回时清空关键词
  uni.navigateBack()
}

// 加载更多
const loadMore = () => {
  if (activeTab.value === 'all') {
    // 综合分类不支持滚动加载
    return
  }

  // 这里可以实现分页加载更多
  currentPage.value++

  // 根据当前标签类型加载更多数据
  if (activeTab.value in searchTypeMap) {
    const searchType = searchTypeMap[activeTab.value]
    searchResultsData(searchType)
  }
}

// 重试加载数据
const retryLoad = async () => {
  apiError.value = false
  await searchResultsData(1018)
}

// 计算内容区域高度
const calculateContentHeight = () => {
  const systemInfo = uni.getSystemInfoSync()
  const windowHeight = systemInfo.windowHeight
  const statusBarHeight = systemInfo.statusBarHeight || 0
  const navbarHeight = 50 // 导航栏高度
  const tabHeight = 40 // 标签栏高度

  contentHeight.value = windowHeight - statusBarHeight - navbarHeight - tabHeight
}

onMounted(() => {
  calculateContentHeight()
  // 默认加载综合搜索结果
  searchResultsData(1018).catch(error => {
    console.error('搜索结果加载失败:', error)
    apiError.value = true
  })
})
</script>

<style lang="scss" scoped>
.search-result-page {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
  background-color: white;
}

.debug-info {
  padding: 10px;
  background-color: #fff;
  border: 1px solid #ddd;
  margin: 10px;
  border-radius: 5px;

  text {
    display: block;
    font-size: 12px;
    color: #666;
    margin: 2px 0;
  }
}

.search-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 15px;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid #f0f0f0;

  .nav-left {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;

    .nav-icon {
      font-size: 20px;
      color: #333;
    }
  }

  .nav-center {
    flex: 1;
    margin: 0 15px;

    .search-input-container {
      display: flex;
      align-items: center;
      background-color: #f0f0f0;
      border-radius: 20px;
      padding: 8px 15px;

      .search-icon {
        font-size: 18px;
        color: #999;
        margin-right: 10px;
      }

      .search-input {
        flex: 1;
        font-size: 14px;
        color: #333;
        pointer-events: none;
      }
    }
  }
}

.category-tabs {
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;

  .tabs-scroll {
    white-space: nowrap;
    padding: 0 15px;

    .tabs-container {
      display: inline-flex;
      align-items: center;
      height: 40px;

      .tab-item {
        padding: 0 15px;
        height: 40px;
        display: flex;
        align-items: center;
        margin-right: 20px;
        position: relative;

        .tab-text {
          font-size: 14px;
          color: #999;
          writing-mode: horizontal-tb;
          text-orientation: mixed;
          white-space: nowrap;
        }

        &.active {
          .tab-text {
            color: #ec4141;
            font-weight: 500;
          }

          &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 2px;
            background-color: #ec4141;
            border-radius: 1px;
          }
        }
      }
    }
  }
}

.result-content {
  flex: 1;
  padding: 15px;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.result-section {
  margin-bottom: 20px;

  .section-header {
    margin-bottom: 15px;

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }

  .song-list {
    .song-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;

      .song-info {
        flex: 1;

        .song-name {
          display: block;
          font-size: 15px;
          color: #333;
          margin-bottom: 5px;
        }

        .song-artist {
          display: block;
          font-size: 13px;
          color: #999;
        }
      }

      .song-actions {
        .play-icon {
          font-size: 20px;
          color: #999;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .playlist-list {
    .playlist-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;

      .playlist-cover {
        width: 50px;
        height: 50px;
        border-radius: 5px;
        margin-right: 10px;
      }

      .playlist-info {
        flex: 1;

        .playlist-name {
          display: block;
          font-size: 15px;
          color: #333;
          margin-bottom: 5px;
        }

        .playlist-creator {
          display: block;
          font-size: 12px;
          color: #999;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .voice-list {
    .voice-item {
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;

      .voice-info {
        .voice-name {
          display: block;
          font-size: 15px;
          color: #333;
          margin-bottom: 5px;
        }

        .voice-desc {
          display: block;
          font-size: 13px;
          color: #999;
          margin-bottom: 3px;
        }

        .voice-creator {
          display: block;
          font-size: 12px;
          color: #666;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .album-list {
    .album-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;

      .album-cover {
        width: 50px;
        height: 50px;
        border-radius: 5px;
        margin-right: 10px;
      }

      .album-info {
        flex: 1;

        .album-name {
          display: block;
          font-size: 15px;
          color: #333;
          margin-bottom: 5px;
        }

        .album-artist {
          display: block;
          font-size: 12px;
          color: #999;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .radio-list {
    .radio-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;

      .radio-cover {
        width: 50px;
        height: 50px;
        border-radius: 5px;
        margin-right: 10px;
      }

      .radio-info {
        flex: 1;

        .radio-name {
          display: block;
          font-size: 15px;
          color: #333;
          margin-bottom: 5px;
        }

        .radio-creator {
          display: block;
          font-size: 12px;
          color: #999;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .video-list {
    .video-item {
      margin-bottom: 15px;

      .video-thumb {
        position: relative;
        width: 100%;
        height: 200px;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 10px;

        .video-cover {
          width: 100%;
          height: 100%;
        }

        .video-duration {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background-color: rgba(0, 0, 0, 0.6);
          color: #fff;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 10px;
        }
      }

      .video-info {
        .video-name {
          display: block;
          font-size: 15px;
          color: #333;
          margin-bottom: 5px;
        }

        .video-artist {
          display: block;
          font-size: 13px;
          color: #999;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .artist-list {
    .artist-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;

      .artist-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        margin-right: 10px;
      }

      .artist-info {
        flex: 1;

        .artist-name {
          display: block;
          font-size: 15px;
          color: #333;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .user-list {
    .user-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;

      .user-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        margin-right: 10px;
      }

      .user-info {
        flex: 1;

        .user-name {
          display: block;
          font-size: 15px;
          color: #333;
        }
      }
    }

    .view-all-btn {
      padding: 15px 0;
      text-align: center;

      .view-all-text {
        font-size: 14px;
        color: #999;
      }
    }
  }
}

.lyrics-list {
  .lyrics-item-wrapper {
    border-bottom: 1px solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .lyrics-item {
    display: flex;
    align-items: center;
    padding: 12px 0;

    .lyrics-info {
      flex: 1;

      .lyrics-name {
        display: block;
        font-size: 16px;
        color: #333;
        margin-bottom: 4px;
      }

      .lyrics-artist {
        display: block;
        font-size: 13px;
        color: #999;
        margin-bottom: 4px;
      }

      .lyrics-content {
        display: block;
        font-size: 13px;
        color: #666;
        line-height: 1.4;
      }
    }

    .lyrics-actions {
      margin-left: 10px;

      .play-icon {
        font-size: 20px;
        color: #999;
      }
    }
  }

  .view-all-btn {
    padding: 15px 0;
    text-align: center;

    .view-all-text {
      font-size: 14px;
      color: #999;
    }
  }

  .view-more-lyrics {
    padding: 15px 0;
    text-align: center;

    .view-more-text {
      font-size: 14px;
      color: #999;
    }

    .iconfont {
      font-size: 12px;
      color: #999;
      margin-left: 5px;
    }
  }
}

.loading {
  text-align: center;
  padding: 20px 0;

  .loading-text {
    font-size: 14px;
    color: #999;
  }
}

.empty-state {
  text-align: center;
  padding-top: 100px;

  .empty-text {
    font-size: 16px;
    color: #999;
  }
}

.error-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  .error-text {
    font-size: 16px;
    color: #999;
    text-align: center;
  }
}

// 底部播放控制条占位块（防止内容被遮挡）
.play-bar-placeholder {
  height: 120rpx;
}

// 底部播放控制条（固定定位）
.play-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}
</style>