<template>
  <view class="search-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

    <!-- 顶部导航栏 -->
    <view class="search-navbar">
      <view class="nav-left" @click="goBack">
        <i class="iconfont icon-arrow-left nav-icon" />
      </view>
      
      <view class="nav-center">
        <view class="search-input-container">
          <i class="iconfont icon-sousuo search-icon" />
          <input 
            class="search-input" 
            v-model="searchKeyword" 
            :placeholder="placeholderText"
            @confirm="performSearch"
            confirm-type="search"
            :focus="true"
          />
        </view>
      </view>
      
      <view class="nav-right" @click="performSearch">
        <text class="search-btn-text">搜索</text>
      </view>
    </view>
    
    <!-- 错误提示 -->
    <view v-if="apiError" class="error-message" @click="retryLoad">
      <text class="error-text">连接服务器超时，点击重试</text>
    </view>
    
    <!-- 搜索内容区域 -->
    <scroll-view 
      class="search-content" 
      scroll-y 
      :style="{ height: contentHeight + 'px' }"
      @scrolltolower="onScrollToLower"
      v-else
    >
      <!-- 搜索历史 -->
      <view class="search-history" v-if="searchHistory.length > 0">
        <view class="history-header">
          <text class="history-title">搜索历史</text>
          <view class="clear-history" @click="clearSearchHistory">
            <i class="iconfont icon-lajitong clear-icon" />
          </view>
        </view>
        
        <view class="history-list">
          <view 
            class="history-item" 
            v-for="(item, index) in searchHistory" 
            :key="index"
            @click="useSearchHistory(item)"
          >
            <text class="history-text">{{ item }}</text>
          </view>
        </view>
      </view>
      
      <!-- 热搜榜 -->
      <view class="hot-search">
        <view class="hot-header">
          <text class="hot-title">热搜榜</text>
        </view>
        
        <view class="hot-list">
          <view 
            class="hot-item" 
            v-for="(item, index) in hotSearchList" 
            :key="index"
            @click="useHotSearch(item.searchWord)"
          >
            <view class="hot-rank" :class="{ 'hot-top': index < 3 }">
              {{ index + 1 }}
            </view>
            <view class="hot-content">
              <view class="hot-word">
                <text class="hot-text">{{ item.searchWord }}</text>
                <text class="hot-score" v-if="item.score">{{ formatHotScore(item.score) }}</text>
              </view>
              <text class="hot-desc">{{ item.content || item.explain || '' }}</text>
            </view>
            <view class="hot-icon" v-if="item.iconUrl">
              <image :src="item.iconUrl" class="hot-image" mode="aspectFit" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { search, getSearchDefault, getSearchHot } from '@/utils/api.js'

// 数据
const searchKeyword = ref('')
const defaultKeyword = ref('')
const placeholderText = ref('')
const searchHistory = ref([])
const hotSearchList = ref([])
const contentHeight = ref(0)
const apiError = ref(false)

// 获取默认搜索关键词
const getDefaultKeyword = async () => {
  try {
    const res = await getSearchDefault()
    if (res && res.code === 200) {
      defaultKeyword.value = res.data?.realkeyword || ''
      // 将默认关键词设置为 placeholder
      placeholderText.value = defaultKeyword.value || '搜索歌曲、歌手、专辑'
    }
  } catch (error) {
    console.error('获取默认搜索关键词失败:', error)
    // 即使请求失败，也不影响页面基本功能
    placeholderText.value = '搜索歌曲、歌手、专辑'
  }
}

// 获取热搜列表
const getHotSearchList = async () => {
  try {
    const res = await getSearchHot()
    if (res && res.code === 200) {
      hotSearchList.value = res.data || []
    }
  } catch (error) {
    console.error('获取热搜列表失败:', error)
    // 即使请求失败，也不影响页面基本功能
  }
}

// 获取搜索历史
const getSearchHistory = () => {
  const history = uni.getStorageSync('searchHistory') || []
  searchHistory.value = history
}

// 保存搜索历史
const saveSearchHistory = (keyword) => {
  let history = uni.getStorageSync('searchHistory') || []
  // 移除重复项
  history = history.filter(item => item !== keyword)
  // 添加到开头
  history.unshift(keyword)
  // 只保留最近的20条
  history = history.slice(0, 20)
  uni.setStorageSync('searchHistory', history)
  searchHistory.value = history
}

// 清空搜索历史
const clearSearchHistory = () => {
  uni.removeStorageSync('searchHistory')
  searchHistory.value = []
}

// 格式化热搜分数
const formatHotScore = (score) => {
  if (score >= 100000000) {
    return `${(score / 100000000).toFixed(1)}亿`
  } else if (score >= 10000) {
    return `${Math.floor(score / 10000)}万`
  }
  return score.toString()
}

// 执行搜索
const performSearch = () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    // 如果没有输入关键词，使用默认关键词
    if (defaultKeyword.value) {
      doSearch(defaultKeyword.value)
    }
    return
  }
  
  doSearch(keyword)
}

// 实际搜索操作
const doSearch = (keyword) => {
  saveSearchHistory(keyword)
  // 跳转到搜索结果页面
  uni.navigateTo({
    url: `/pages/search/result?keyword=${encodeURIComponent(keyword)}`
  })
}

// 使用搜索历史
const useSearchHistory = (keyword) => {
  searchKeyword.value = keyword
  doSearch(keyword)
}

// 使用热搜
const useHotSearch = (keyword) => {
  searchKeyword.value = keyword
  doSearch(keyword)
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 计算内容区域高度
const calculateContentHeight = () => {
  const systemInfo = uni.getSystemInfoSync()
  const windowHeight = systemInfo.windowHeight
  const statusBarHeight = systemInfo.statusBarHeight || 0
  const navbarHeight = 50 // 导航栏高度
  
  contentHeight.value = windowHeight - statusBarHeight - navbarHeight
}

// 页面滚动到底部
const onScrollToLower = () => {
  // 这里可以实现加载更多功能
}

// 重试加载数据
const retryLoad = async () => {
  apiError.value = false
  await Promise.allSettled([
    getDefaultKeyword(),
    getHotSearchList()
  ])
}

onMounted(async () => {
  calculateContentHeight()
  
  // 并行加载数据
  const results = await Promise.allSettled([
    getDefaultKeyword(),
    getHotSearchList()
  ])
  
  // 检查是否有错误
  const hasErrors = results.some(result => result.status === 'rejected')
  if (hasErrors) {
    apiError.value = true
  }
  
  getSearchHistory()
})

onShow(() => {
  // 页面显示时重新获取搜索历史
  getSearchHistory()
})
</script>

<style lang="scss" scoped>
.search-page {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
  background-color: white;
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
      }
    }
  }

  .nav-right {
    .search-btn-text {
      font-size: 14px;
      color: #ec4141;
      font-weight: 500;
    }
  }
}

.search-content {
  flex: 1;
  padding: 15px;
  box-sizing: border-box;
}

.search-history {
  margin-bottom: 30px;

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;

    .history-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .clear-history {
      .clear-icon {
        font-size: 18px;
        color: #999;
      }
    }
  }

  .history-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 0 15px;
    
    .history-item {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      background-color: #f0f0f0;
      border-radius: 20px;
      white-space: nowrap;
      
      .history-text {
        font-size: 14px;
        color: #666;
        line-height: 1;
      }
    }
  }
}

.hot-search {
  .hot-header {
    .hot-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }

  .hot-list {
    margin-top: 15px;

    .hot-item {
      display: flex;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #f5f5f5;

      .hot-rank {
        width: 30px;
        font-size: 16px;
        font-weight: 600;
        color: #999;
        text-align: center;

        &.hot-top {
          color: #ec4141;
        }
      }

      .hot-content {
        flex: 1;
        margin: 0 10px;

        .hot-word {
          display: flex;
          align-items: center;
          margin-bottom: 5px;

          .hot-text {
            font-size: 16px;
            font-weight: 500;
            color: #333;
            margin-right: 10px;
          }

          .hot-score {
            font-size: 12px;
            color: #ec4141;
            background-color: #fef2f2;
            padding: 2px 6px;
            border-radius: 10px;
          }
        }

        .hot-desc {
          font-size: 13px;
          color: #999;
          line-height: 1.4;
        }
      }

      .hot-icon {
        .hot-image {
          width: 20px;
          height: 20px;
        }
      }
    }
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
</style>