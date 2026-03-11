<template>
  <view class="video-player-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

    <!-- 顶部导航栏 - 固定 -->
    <view class="top-navbar">
      <view class="nav-left" @click="handleBack">
        <i class="iconfont icon-arrow-left" />
      </view>
      <view class="nav-center">
        <text class="nav-title">视频播放</text>
      </view>
      <view class="nav-right" @click="handleShare">
        <i class="iconfont icon-fenxiang" />
      </view>
    </view>

    <!-- 视频播放区域 - 固定在导航栏下方 -->
    <view class="video-container-fixed">
      <video 
        id="myVideo" 
        class="video-player" 
        :src="videoUrl" 
        :controls="true"
        :autoplay="false"
        :loop="false"
        :muted="false"
        @play="onVideoPlay"
        @pause="onVideoPause"
        @ended="onVideoEnded"
        @error="onVideoError"
        object-fit="contain"
        v-if="videoUrl"
      ></video>
      
      <!-- 视频加载失败时的占位符 -->
      <view class="video-placeholder" v-else>
        <view class="placeholder-content">
          <i class="iconfont icon-shipin" style="font-size: 60px; color: #ccc;" />
          <text class="placeholder-text">视频加载失败</text>
          <text class="placeholder-subtext">请检查网络连接或稍后再试</text>
          <button class="refresh-btn" @click="refreshVideo">重新加载</button>
        </view>
      </view>
    </view>

    <!-- 主内容区域 - 可滚动 -->
    <scroll-view 
      class="main-content" 
      scroll-y
      @scrolltolower="loadMoreComments"
      :lower-threshold="100"
    >
      <!-- 视频信息区域 -->
      <view class="video-info">
        <text class="video-title">{{ mvDetail.name || videoInfo.title || videoInfo.name || 'MV 标题' }}</text>
        <view class="video-meta">
          <text class="video-artist">{{ mvDetail.artistName || videoInfo.creatorName || videoInfo.author || '未知艺术家' }}</text>
          <text class="video-play-count">{{ formatCount(mvDetail.playCount || videoInfo.playCount) }}次播放</text>
        </view>
      </view>

      <!-- 互动操作区域 -->
      <view class="video-actions">
        <!-- 点赞按钮 -->
        <view class="action-item" @click="toggleLike">
          <i class="iconfont" :class="liked ? 'icon-xihuan1 liked' : 'icon-xihuan'" />
          <text class="action-text">{{ liked ? '已点赞' : '点赞' }}</text>
          <text class="action-count">{{ formatCount(likeCount) }}</text>
        </view>

        <!-- 评论按钮 -->
        <view class="action-item" @click="focusCommentInput">
          <i class="iconfont icon-pinglun" />
          <text class="action-text">评论</text>
          <text class="action-count">{{ formatCount(commentCount) }}</text>
        </view>

        <!-- 转发按钮 -->
        <view class="action-item" @click="handleForward">
          <i class="iconfont icon-fenxiang1" />
          <text class="action-text">分享</text>
          <text class="action-count">{{ formatCount(forwardCount) }}</text>
        </view>
      </view>

      <!-- MV 百科信息 -->
      <view class="mv-wiki-section" v-if="mvWiki && mvWiki.desc">
        <view class="section-header">
          <text class="section-title">MV 简介</text>
        </view>
        <text class="wiki-content">{{ mvWiki.desc }}</text>
      </view>
      
      <!-- MV 详细信息 -->
      <view class="mv-detail-section" v-if="mvDetail && (mvDetail.mvName || mvDetail.artistRepVos || mvDetail.publishTime || mvDetail.desc)">
        <view class="section-header">
          <text class="section-title">详细信息</text>
        </view>
        <view class="detail-content">
          <view class="detail-row" v-if="mvDetail.mvName">
            <text class="label">MV 名称：</text>
            <text class="value">{{ mvDetail.mvName }}</text>
          </view>
          <view class="detail-row" v-if="mvDetail.artistRepVos && mvDetail.artistRepVos.length > 0">
            <text class="label">艺人：</text>
            <text class="value">{{ mvDetail.artistRepVos.map(artist => artist.artistName).join('/') }}</text>
          </view>
          <view class="detail-row" v-if="mvDetail.publishTime">
            <text class="label">发布时间：</text>
            <text class="value">{{ formatDate(mvDetail.publishTime) }}</text>
          </view>
          <view class="detail-row" v-if="mvDetail.desc">
            <text class="label">描述：</text>
            <text class="value">{{ mvDetail.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 评论区导航条 -->
      <view class="comments-nav">
        <text class="nav-title">评论区</text>
        <view class="nav-tabs">
          <text 
            class="tab-item" 
            :class="{ active: sortType === 1 }"
            @click="switchSort(1)"
          >推荐</text>
          <text 
            class="tab-item" 
            :class="{ active: sortType === 2 }"
            @click="switchSort(2)"
          >最热</text>
          <text 
            class="tab-item" 
            :class="{ active: sortType === 3 }"
            @click="switchSort(3)"
          >最新</text>
        </view>
      </view>

      <!-- 评论列表 -->
      <view class="comments-list">
        <view class="comment-item" v-for="comment in commentsList" :key="comment.commentId">
          <view class="comment-header">
            <image class="user-avatar" :src="comment.user?.avatarUrl || comment.user?.avatar" mode="aspectFill"/>
            <view class="user-info">
              <text class="user-name">{{ comment.user?.nickname || comment.user?.userName || '未知用户' }}</text>
              <text class="comment-time">{{ formatCommentTime(comment.time) }}</text>
            </view>
            <view class="comment-actions" v-if="comment.owner">
              <view class="action-btn delete-btn" @click.stop="deleteCommentFunc(comment)">
                <i class="iconfont icon-shanchu"/>
              </view>
            </view>
            <view class="like-btn" @click.stop="toggleCommentLike(comment)">
              <i class="iconfont" :class="comment.liked ? 'icon-dianzan liked' : 'icon-dianzan'"/>
              <text class="like-count">{{ comment.likedCount || 0 }}</text>
            </view>
          </view>
          <view class="comment-content" @click="handleCommentClick(comment)">
            <text class="content-text">{{ comment.content }}</text>
          </view>
          
          <!-- 回复评论显示 -->
          <view class="reply-info" v-if="comment.beReplied && comment.beReplied.length > 0">
            <view class="reply-item" v-for="reply in comment.beReplied" :key="reply.beRepliedCommentId">
              <text class="reply-user">@{{ reply.user?.nickname || reply.user?.userName || '未知用户' }}</text>
              <text class="reply-content">{{ reply.content }}</text>
            </view>
          </view>
          
          <!-- 回复按钮 -->
          <view class="reply-btn-wrapper" v-if="comment.showFloorComment?.replyCount > 0" @click="openFloorComment(comment)">
            <text class="reply-btn-text">{{ comment.showFloorComment?.replyCount || 0 }}条回复<i class="iconfont icon-arrow-right reply-btn-icon" /></text>
          </view>
        </view>

        <!-- 加载中状态 -->
        <view class="loading-wrapper" v-if="loading">
          <text class="loading-text">加载中...</text>
        </view>

        <!-- 加载更多状态 -->
        <view class="load-more-wrapper" v-if="!loading && hasMore && commentsList.length > 0">
          <text class="load-more-text">上拉加载更多</text>
        </view>

        <!-- 没有更多数据 -->
        <view class="no-more-wrapper" v-if="!hasMore && commentsList.length > 0">
          <text class="no-more-text">已经到底了</text>
        </view>

        <!-- 空状态 -->
        <view class="empty-wrapper" v-if="!loading && commentsList.length === 0">
          <text class="empty-text">暂无评论，快来抢沙发吧~</text>
        </view>

        <!-- 底部占位，避免内容被输入框遮挡 -->
        <view class="bottom-placeholder"></view>
      </view>
    </scroll-view>

    <!-- 底部固定输入框 -->
    <view class="input-bar" v-if="!showReplyMask">
      <input
        class="comment-input"
        type="text"
        placeholder="说点什么..."
        v-model="inputContent"
        :disabled="sending"
        @click.stop="handleInputClick"
      />
      <button class="send-btn" @click="sendComment" :disabled="sending || !inputContent.trim()">
        <text class="send-text">{{ sending ? '发送中...' : '发送' }}</text>
      </button>
    </view>
    
    <!-- 回复评论遮罩层 -->
    <view class="reply-mask" v-if="showReplyMask" @click="closeReplyMask">
      <view class="reply-mask-content">
        <view class="reply-input-bar">
          <input
            class="comment-input"
            type="text"
            :placeholder="`回复 @${replyTargetNickname}...`"
            v-model="inputContent"
            :disabled="sending"
            focus="true"
          />
          <button class="send-btn" @click="sendComment" :disabled="sending || !inputContent.trim()">
            <text class="send-text">{{ sending ? '发送中...' : '回复' }}</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 楼层评论弹窗 -->
    <view class="floor-comment-popup" v-if="showFloorPopup" @click="closeFloorComment">
      <view class="popup-mask"></view>
      <view class="popup-content" @click.stop>
        <!-- 顶部导航栏 -->
        <view class="popup-header">
          <view class="header-left" @click="closeFloorComment">
            <i class="iconfont icon-fanhui"/>
          </view>
          <text class="header-title">回复 ({{ floorReplyCount }})</text>
          <view class="header-right"></view>
        </view>

        <!-- 楼主评论 -->
        <view class="owner-comment-wrapper">
          <view class="owner-comment" v-if="currentOwnerComment">
            <view class="comment-header">
              <image class="user-avatar" :src="currentOwnerComment.user?.avatarUrl || currentOwnerComment.user?.avatar" mode="aspectFill"/>
              <view class="user-info">
                <text class="user-name">{{ currentOwnerComment.user?.nickname || '未知用户' }}</text>
                <text class="comment-time">{{ formatCommentTime(currentOwnerComment.time) }}</text>
              </view>
              <view class="like-btn" @click.stop="toggleCommentLike(currentOwnerComment)">
                <i class="iconfont" :class="currentOwnerComment.liked ? 'icon-dianzan liked' : 'icon-dianzan'"/>
                <text class="like-count">{{ currentOwnerComment.likedCount || 0 }}</text>
              </view>
            </view>
            <view class="comment-content" @click="handleCommentClick(currentOwnerComment)">
              <text class="content-text">{{ currentOwnerComment.content }}</text>
            </view>
            
            <!-- 回复显示 -->
            <view class="reply-info" v-if="currentOwnerComment.beReplied && currentOwnerComment.beReplied.length > 0">
              <view class="reply-item" v-for="reply in currentOwnerComment.beReplied" :key="reply.beRepliedCommentId">
                <text class="reply-user">@{{ reply.user?.nickname || reply.user?.userName || '未知用户' }}</text>
                <text class="reply-content">{{ reply.content }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 排序导航条 -->
        <view class="reply-sort-bar">
          <text class="sort-label">全部回复</text>
          <view class="sort-btn" @click="toggleFloorSort">
            <text class="sort-text">{{ floorSortType === 1 ? '按时间升序' : '按时间倒序' }}</text>
            <i class="iconfont" :class="floorSortType === 1 ? 'icon-shangsheng' : 'icon-xiangxia'"/>
          </view>
        </view>

        <!-- 回复列表 -->
        <scroll-view
          scroll-y
          class="floor-comments-list"
          @scrolltolower="loadMoreFloorComments"
          :lower-threshold="100"
        >
          <view class="floor-comment-item" v-for="comment in floorCommentsList" :key="comment.commentId">
            <view class="comment-header">
              <image class="user-avatar" :src="comment.user?.avatarUrl || comment.user?.avatar" mode="aspectFill"/>
              <view class="user-info">
                <text class="user-name">{{ comment.user?.nickname || '未知用户' }}</text>
                <text class="comment-time">{{ formatCommentTime(comment.time) }}</text>
              </view>
              <view class="comment-actions" v-if="comment.owner">
                <view class="action-btn delete-btn" @click.stop="deleteFloorCommentFunc(comment)">
                  <i class="iconfont icon-shanchu"/>
                </view>
              </view>
              <view class="like-btn" @click.stop="toggleFloorLike(comment)">
                <i class="iconfont" :class="comment.liked ? 'icon-dianzan liked' : 'icon-dianzan'"/>
                <text class="like-count">{{ comment.likedCount || 0 }}</text>
              </view>
            </view>
            <view class="comment-content" @click="handleCommentClick(comment)">
              <text class="content-text">{{ comment.content }}</text>
            </view>
            
            <!-- 回复显示 -->
            <view class="reply-info" v-if="comment.beReplied && comment.beReplied.length > 0">
              <view class="reply-item" v-for="reply in comment.beReplied" :key="reply.beRepliedCommentId">
                <text class="reply-user">@{{ reply.user?.nickname || reply.user?.userName || '未知用户' }}</text>
                <text class="reply-content">{{ reply.content }}</text>
              </view>
            </view>
          </view>

          <!-- 加载状态 -->
          <view class="loading-wrapper" v-if="floorLoading">
            <text class="loading-text">加载中...</text>
          </view>

          <view class="no-more-wrapper" v-if="!floorHasMore && floorCommentsList.length > 0">
            <text class="no-more-text">已经到底了</text>
          </view>
          
          <!-- 底部占位，避免内容被输入框遮挡 -->
          <view class="floor-bottom-placeholder"></view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMvUrl, getMvDetail, getMvDetailInfo, getMvWiki, toggleResourceLike, getNewComment, postNewComment, deleteComment as deleteCommentApi, getFloorComment } from '@/utils/api.js'
import { useUserStore } from '@/utils/userStore.js'

// 视频 ID
const videoId = ref('')
// 视频 URL
const videoUrl = ref('')
// 视频信息
const videoInfo = ref({})
// MV 详情
const mvDetail = ref({})
// MV 百科
const mvWiki = ref({})
// 点赞数
const likeCount = ref(0)
// 评论数
const commentCount = ref(0)
// 转发数
const forwardCount = ref(0)
// 是否已点赞
const liked = ref(false)
// 评论列表
const commentsList = ref([])
// 加载状态
const loading = ref(false)
// 是否还有更多数据
const hasMore = ref(true)
// 分页参数
const pageSize = 20
const currentPage = ref(1)
// 排序方式（1:推荐 2:热度 3:时间）
const sortType = ref(1)
// 分页游标（用于时间排序）
const cursor = ref(null)
// 输入内容
const inputContent = ref('')
// 发送状态
const sending = ref(false)

// 用户 store
const userStore = useUserStore()

// 回复评论相关
const showReplyMask = ref(false)
const replyTargetComment = ref(null)
const replyTargetNickname = ref('')

// 楼层评论相关
const showFloorPopup = ref(false)
const currentOwnerComment = ref(null)
const floorCommentsList = ref([])
const floorReplyCount = ref(0)
const floorLoading = ref(false)
const floorHasMore = ref(true)
const floorParentCommentId = ref('')
const floorTime = ref(null)
const floorSortType = ref(1)

// 格式化评论时间
const formatCommentTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

// 格式化数字显示
const formatCount = (count) => {
  if (!count) return '0'
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count.toString()
}

// 格式化时间
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  }
}

// 初始化视频
const initVideo = async () => {
  console.log('开始初始化视频，视频 ID:', videoId.value)
  try {
    await Promise.all([
      loadVideoDetailInfo(),
      fetchComments()
    ])
    
    try {
      await loadVideoUrl()
    } catch (urlError) {
      console.warn('视频 URL 加载失败:', urlError)
    }
  } catch (error) {
    console.error('初始化视频失败:', error)
    uni.showToast({
      title: '加载视频信息失败',
      icon: 'none'
    })
  }
}

// 加载视频 URL
const loadVideoUrl = async () => {
  try {
    const numericId = Number(videoId.value)
    if (!isNaN(numericId)) {
      const res = await getMvUrl(numericId)
      if (res.code === 200 && res.data && res.data.url) {
        videoUrl.value = res.data.url
        return
      }
    }
    throw new Error('无法获取 MV 播放地址')
  } catch (error) {
    console.error('获取 MV URL 失败:', error)
    uni.showToast({
      title: '视频加载失败',
      icon: 'none'
    })
    throw error
  }
}

// 加载 MV 详情信息
const loadVideoDetailInfo = async () => {
  try {
    const mvDetailRes = await getMvDetail(videoId.value)
    if (mvDetailRes.code === 200) {
      mvDetail.value = mvDetailRes.data || {}
      videoInfo.value = mvDetailRes.data || {}
    }
  } catch (error) {
    console.log('获取 MV 详情失败:', error.message)
  }
  
  try {
    const mvInfoRes = await getMvDetailInfo(videoId.value)
    if (mvInfoRes.code === 200) {
      likeCount.value = mvInfoRes.subCount || mvInfoRes.data?.subCount || 0
      commentCount.value = mvInfoRes.commentCount || mvInfoRes.data?.commentCount || 0
      forwardCount.value = mvInfoRes.shareCount || mvInfoRes.data?.shareCount || 0
      liked.value = mvInfoRes.isSubed || mvInfoRes.data?.isSubed || false
    }
  } catch (error) {
    console.log('获取 MV 详情信息失败:', error.message)
  }
  
  try {
    const mvWikiRes = await getMvWiki(videoId.value)
    if (mvWikiRes.code === 200) {
      mvWiki.value = mvWikiRes.data || {}
    }
  } catch (error) {
    console.log('获取 MV 百科信息失败:', error.message)
  }
}

// 获取评论
const fetchComments = async (isLoadMore = false) => {
  if (loading.value) return

  if (!isLoadMore) {
    currentPage.value = 1
    commentsList.value = []
    hasMore.value = true
    cursor.value = null
  }

  if (!hasMore.value && isLoadMore) return

  loading.value = true
  try {
    const params = {
      id: parseInt(videoId.value),
      type: 1, // 1 表示 MV
      pageNo: currentPage.value,
      pageSize: pageSize,
      sortType: sortType.value
    }

    if (sortType.value === 3 && cursor.value) {
      params.cursor = cursor.value
    }

    const res = await getNewComment(params)
    
    if (res.code === 200 && res.data) {
      const newComments = res.data.comments || []
      
      if (newComments.length > 0) {
        if (isLoadMore) {
          commentsList.value.push(...newComments)
        } else {
          commentsList.value = newComments
        }

        currentPage.value++
        
        if (sortType.value === 3 && newComments.length > 0) {
          cursor.value = newComments[newComments.length - 1].time
        }

        if (newComments.length < pageSize) {
          hasMore.value = false
        }
      } else {
        hasMore.value = false
      }
    }
  } catch (error) {
    console.error('获取评论失败:', error)
    uni.showToast({
      title: '加载评论失败',
      icon: 'none'
    })
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 加载更多评论
const loadMoreComments = () => {
  if (hasMore.value && !loading.value) {
    fetchComments(true)
  }
}

// 切换排序方式
const switchSort = (type) => {
  if (sortType.value !== type) {
    sortType.value = type
    fetchComments(false)
  }
}

// 刷新视频
const refreshVideo = async () => {
  uni.showLoading({
    title: '加载中...'
  })
  try {
    await loadVideoUrl()
    uni.hideLoading()
    if (videoUrl.value) {
      uni.showToast({
        title: '视频加载成功',
        icon: 'success'
      })
    }
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: '视频加载失败',
      icon: 'none'
    })
  }
}

// 返回上一页
const handleBack = () => {
  uni.navigateBack()
}

// 聚焦评论输入框
const focusCommentInput = () => {
  uni.createSelectorQuery().select('.comments-nav').boundingClientRect(rect => {
    if (rect) {
      uni.pageScrollTo({
        scrollTop: rect.top,
        duration: 300
      })
    }
  }).exec()
}

// 处理输入框点击
const handleInputClick = (e) => {
  e.stopPropagation()
}

// 处理评论点击（进入回复模式）
const handleCommentClick = (comment) => {
  replyTargetComment.value = comment
  replyTargetNickname.value = comment.user?.nickname || '未知用户'
  showReplyMask.value = true
}

// 关闭回复遮罩
const closeReplyMask = () => {
  showReplyMask.value = false
  replyTargetComment.value = null
  replyTargetNickname.value = ''
  inputContent.value = ''
}

// 发送评论
const sendComment = async () => {
  if (!inputContent.value.trim()) return
  
  sending.value = true
  try {
    const isReply = showReplyMask.value
    const t = isReply ? 2 : 1
    const commentId = isReply ? replyTargetComment.value?.commentId : null
    
    const res = await postNewComment(t, 1, videoId.value, inputContent.value.trim(), commentId)
    if (res.code === 200) {
      uni.showToast({
        title: isReply ? '回复成功' : '评论成功',
        icon: 'success'
      })
      
      inputContent.value = ''
      
      if (showReplyMask.value) {
        closeReplyMask()
      }
      
      fetchComments(false)
      
      if (showFloorPopup.value) {
        await fetchFloorComments()
      }
    }
  } catch (error) {
    uni.showToast({
      title: '发送失败',
      icon: 'none'
    })
  } finally {
    sending.value = false
  }
}

// 切换点赞状态（MV）
const toggleLike = async () => {
  try {
    const tValue = liked.value ? 0 : 1
    const res = await toggleResourceLike(1, tValue, videoId.value)
    if (res.code === 200) {
      liked.value = !liked.value
      likeCount.value = liked.value ? likeCount.value + 1 : Math.max(0, likeCount.value - 1)
      uni.showToast({
        title: liked.value ? '已点赞' : '已取消点赞',
        icon: 'none'
      })
    }
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 点赞/取消点赞评论
const toggleCommentLike = async (comment) => {
  try {
    const t = comment.liked ? 0 : 1
    const res = await toggleResourceLike(2, t, videoId.value, comment.commentId)
    if (res.code === 200) {
      comment.liked = !comment.liked
      comment.likedCount = (comment.likedCount || 0) + (comment.liked ? 1 : -1)
      uni.showToast({
        title: comment.liked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1500
      })
    }
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 删除评论
const deleteCommentFunc = async (comment) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const commentId = comment.commentId || comment.id
          const deleteRes = await deleteCommentApi(0, 1, videoId.value, commentId)
          if (deleteRes.code === 200) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            await fetchComments(false)
          }
        } catch (error) {
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 打开楼层评论
const openFloorComment = async (comment) => {
  currentOwnerComment.value = comment
  floorParentCommentId.value = comment.commentId
  floorReplyCount.value = comment.showFloorComment?.replyCount || 0
  showFloorPopup.value = true
  
  floorTime.value = null
  floorCommentsList.value = []
  floorHasMore.value = true
  
  await fetchFloorComments()
}

// 关闭楼层评论
const closeFloorComment = () => {
  showFloorPopup.value = false
  currentOwnerComment.value = null
  floorCommentsList.value = []
}

// 切换楼层排序
const toggleFloorSort = () => {
  floorSortType.value = floorSortType.value === 1 ? 2 : 1
  floorTime.value = null
  floorCommentsList.value = []
  floorHasMore.value = true
  fetchFloorComments()
}

// 按时间排序楼层评论
const sortFloorCommentsByTime = () => {
  if (floorCommentsList.value.length === 0) return
  
  const sortedList = [...floorCommentsList.value]
  sortedList.sort((a, b) => {
    const timeA = a.time || 0
    const timeB = b.time || 0
    
    if (floorSortType.value === 1) {
      return timeA - timeB
    } else {
      return timeB - timeA
    }
  })
  
  floorCommentsList.value = sortedList
}

// 获取楼层评论
const fetchFloorComments = async () => {
  if (floorLoading.value) return
  if (!floorHasMore.value && floorTime.value !== null) return
  
  floorLoading.value = true
  try {
    const params = {
      parentCommentId: floorParentCommentId.value,
      id: parseInt(videoId.value),
      type: 1,
      limit: 20
    }
    
    if (floorTime.value) {
      params.time = floorTime.value
    }
    
    const res = await getFloorComment(params)
    
    if (res.code === 200 && res.data) {
      const data = res.data
      const newComments = data.comments || []
      
      if (data.totalCount !== undefined) {
        floorReplyCount.value = data.totalCount
      } else if (data.showFloorComment && data.showFloorComment.replyCount !== undefined) {
        floorReplyCount.value = data.showFloorComment.replyCount
      }
      
      if (newComments.length > 0) {
        floorCommentsList.value.push(...newComments)
        
        if (newComments.length > 0) {
          const lastComment = newComments[newComments.length - 1]
          floorTime.value = lastComment.time
        }
        
        if (newComments.length < 20 || !data.hasMore) {
          floorHasMore.value = false
        }
        
        sortFloorCommentsByTime()
      } else {
        floorHasMore.value = false
      }
    }
  } catch (error) {
    console.error('获取楼层评论失败:', error)
  } finally {
    floorLoading.value = false
  }
}

// 加载更多楼层评论
const loadMoreFloorComments = () => {
  if (floorHasMore.value && !floorLoading.value) {
    fetchFloorComments()
  }
}

// 点赞楼层评论
const toggleFloorLike = async (comment) => {
  try {
    const t = comment.liked ? 0 : 1
    const res = await toggleResourceLike(2, t, videoId.value, comment.commentId)
    if (res.code === 200) {
      comment.liked = !comment.liked
      comment.likedCount = (comment.likedCount || 0) + (comment.liked ? 1 : -1)
      uni.showToast({
        title: comment.liked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1500
      })
    }
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 删除楼层评论
const deleteFloorCommentFunc = async (comment) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条回复吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await deleteCommentApi(0, 1, videoId.value, comment.commentId)
          if (deleteRes.code === 200) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            
            const remainingCount = floorCommentsList.value.length - 1
            
            if (remainingCount <= 0) {
              closeFloorComment()
              await fetchComments(false)
            } else {
              floorTime.value = null
              floorCommentsList.value = []
              floorHasMore.value = true
              await fetchFloorComments()
              await fetchComments(false)
            }
          }
        } catch (error) {
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 处理转发
const handleForward = () => {
  uni.showActionSheet({
    itemList: ['微博', 'QQ 空间', '朋友圈', '复制链接'],
    success: (res) => {
      if (res.tapIndex === 3) {
        uni.setClipboardData({
          data: `https://music.163.com/mv/${videoId.value}`,
          success: () => {
            uni.showToast({
              title: '链接已复制',
              icon: 'success'
            })
          }
        })
      }
    }
  })
}

// 处理分享
const handleShare = () => {
  uni.showShareMenu({
    withShareTicket: true,
    showShareItems: ['wechatFriends', 'wechatMoment']
  })
  uni.showToast({
    title: '分享功能开发中',
    icon: 'none'
  })
}

// 视频事件处理
const onVideoPlay = () => {
  console.log('视频开始播放')
}

const onVideoPause = () => {
  console.log('视频暂停')
}

const onVideoEnded = () => {
  console.log('视频播放结束')
}

const onVideoError = (e) => {
  console.error('视频播放错误:', e)
  uni.showToast({
    title: '视频播放失败，请稍后再试',
    icon: 'none'
  })
}

// 页面加载
onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || currentPage.$page?.options || {}

  if (options.id) {
    videoId.value = options.id
    console.log('接收到的视频 ID:', videoId.value, '类型:', typeof videoId.value)
    console.log('当前用户状态:', userStore.state)
    await initVideo()
  }
})
</script>

<style lang="scss" scoped>
@import '@/static/iconfont/iconfont.css';

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
  background-color: white;
}

.video-player-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  // 顶部导航栏
  .top-navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 20rpx;
    background-color: #fff;
    border-bottom: 1rpx solid #f0f0f0;
    flex-shrink: 0;

    .nav-left {
      display: flex;
      align-items: center;
      
      .iconfont {
        font-size: 44rpx;
        color: #333;
      }
    }

    .nav-center {
      flex: 1;
      text-align: center;
      
      .nav-title {
        font-size: 32rpx;
        font-weight: 500;
        color: #333;
      }
    }

    .nav-right {
      .iconfont {
        font-size: 44rpx;
        color: #333;
      }
    }
  }

  // 视频播放区域 - 固定（在 scroll-view 外部）
  .video-container-fixed {
    width: 100%;
    height: 240px;
    background-color: #000;
    position: fixed;
    top: calc(var(--status-bar-height) + 88rpx); // 状态栏 + 导航栏高度
    left: 0;
    right: 0;
    z-index: 100;
    flex-shrink: 0;

    .video-player {
      width: 100%;
      height: 100%;
    }
    
    .video-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #000;
      
      .placeholder-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #ccc;
        text-align: center;
        
        .placeholder-text {
          font-size: 16px;
          margin-top: 10px;
        }
        
        .placeholder-subtext {
          font-size: 12px;
          margin-top: 5px;
          color: #999;
        }
        
        .refresh-btn {
          margin-top: 15px;
          padding: 8px 20px;
          background-color: #ec4141;
          color: #fff;
          border-radius: 20px;
          font-size: 14px;
          border: none;
        }
      }
    }
  }

  // 主内容区域 - 需要添加上边距避免被固定的视频遮挡
  .main-content {
    flex: 1;
    overflow-y: auto;
    padding-top: 240px; // 视频播放器高度
    
    // 视频信息区域
    .video-info {
      padding: 15px;
      background-color: #fff;
      margin-bottom: 10px;

      .video-title {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
        line-height: 1.4;
      }

      .video-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #999;
        font-size: 14px;
      }
    }

    // 互动操作区域
    .video-actions {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 15px 0;
      background-color: #fff;
      margin-bottom: 10px;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;

      .action-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;

        .iconfont {
          font-size: 24px;
          color: #666;
          margin-bottom: 5px;
          
          &.liked {
            color: #EC4141;
          }
        }

        .action-text {
          font-size: 12px;
          color: #666;
          margin-bottom: 3px;
        }

        .action-count {
          font-size: 10px;
          color: #999;
        }
      }
    }

    // 通用区块样式
    .section-header {
      padding: 15px 15px 10px;
      background-color: #fff;
      
      .section-title {
        font-size: 16px;
        font-weight: bold;
        color: #333;
      }
    }

    // MV 百科信息
    .mv-wiki-section {
      background-color: #fff;
      margin-bottom: 10px;
      
      .wiki-content {
        display: block;
        padding: 0 15px 15px;
        font-size: 14px;
        color: #666;
        line-height: 1.6;
        background-color: #fff;
      }
    }
    
    // MV 详细信息
    .mv-detail-section {
      background-color: #fff;
      margin-bottom: 10px;
      
      .detail-content {
        padding: 0 15px 15px;
        
        .detail-row {
          display: flex;
          margin-bottom: 8px;
          font-size: 14px;
          
          .label {
            color: #999;
            min-width: 70px;
          }
          
          .value {
            color: #666;
            flex: 1;
            line-height: 1.4;
          }
        }
      }
    }

    // 评论区导航条
    .comments-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24rpx 30rpx;
      background-color: #fff;
      border-bottom: 1rpx solid #f0f0f0;

      .nav-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }

      .nav-tabs {
        display: flex;
        align-items: center;

        .tab-item {
          font-size: 26rpx;
          color: #999;
          margin-left: 30rpx;
          padding: 8rpx 16rpx;
          border-radius: 20rpx;

          &.active {
            color: #EC4141;
            background-color: rgba(236, 65, 65, 0.1);
            font-weight: 500;
          }
        }
      }
    }

    // 评论列表
    .comments-list {
      .comment-item {
        padding: 30rpx;
        background-color: #fff;
        border-bottom: 1rpx solid #f5f5f5;

        .comment-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16rpx;

          .user-avatar {
            width: 80rpx;
            height: 80rpx;
            border-radius: 50%;
            margin-right: 20rpx;
          }

          .user-info {
            flex: 1;

            .user-name {
              display: block;
              font-size: 28rpx;
              color: #333;
              margin-bottom: 8rpx;
            }

            .comment-time {
              display: block;
              font-size: 22rpx;
              color: #999;
            }
          }

          .like-btn {
            display: flex;
            flex-direction: column;
            align-items: center;

            .iconfont {
              font-size: 36rpx;
              color: #999;
              
              &.liked {
                color: #EC4141;
              }
            }

            .like-count {
              font-size: 20rpx;
              color: #999;
              margin-top: 4rpx;
            }
          }

          .comment-actions {
            display: flex;
            align-items: center;
            margin-right: 20rpx;

            .action-btn {
              display: flex;
              align-items: center;
              justify-content: center;

              .iconfont {
                font-size: 36rpx;
                color: #999;
              }
            }

            .delete-btn {
              &:active {
                opacity: 0.6;
              }
            }
          }
        }

        .comment-content {
          margin-left: 100rpx;

          .content-text {
            display: block;
            font-size: 28rpx;
            color: #333;
            line-height: 1.6;
          }
        }

        .reply-info {
          margin-top: 20rpx;
          margin-left: 100rpx;
          padding: 20rpx;
          background-color: #f9f9f9;
          border-radius: 8rpx;

          .reply-item {
            .reply-user {
              font-size: 24rpx;
              color: #666;
              margin-right: 8rpx;
            }

            .reply-content {
              font-size: 26rpx;
              color: #333;
            }
          }
        }

        /* 回复按钮 */
        .reply-btn-wrapper {
          margin-top: 20rpx;
          margin-left: 100rpx;
          padding: 16rpx 0;
        }

        .reply-btn-text {
          font-size: 24rpx;
          color: #1e80ff;
          line-height: 1.5;
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

  // 空状态
  .empty-wrapper {
    padding: 120rpx;
    text-align: center;

    .empty-text {
      font-size: 28rpx;
      color: #999;
    }
  }

  // 底部占位
  .bottom-placeholder {
    height: 120rpx;
  }
}

/* 底部固定输入框 */
.input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;

  .comment-input {
    flex: 1;
    height: 72rpx;
    background-color: #f5f5f5;
    border-radius: 36rpx;
    padding: 0 30rpx;
    font-size: 28rpx;
    color: #333;
  }

  .send-btn {
    margin-left: 20rpx;
    padding: 0 40rpx;
    height: 72rpx;
    line-height: 72rpx;
    background-color: #EC4141;
    border-radius: 36rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    &[disabled] {
      background-color: #ccc;
    }

    .send-text {
      font-size: 28rpx;
      color: #fff;
      font-weight: 500;
    }
  }
}

// 回复评论遮罩层
.reply-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  
  .reply-mask-content {
    width: 100%;
  }
  
  .reply-input-bar {
    display: flex;
    align-items: center;
    padding: 20rpx 30rpx;
    background-color: #fff;
    border-top: 1rpx solid #f0f0f0;
    padding-bottom: constant(safe-area-inset-bottom);
    padding-bottom: env(safe-area-inset-bottom);
    
    .comment-input {
      flex: 1;
      height: 72rpx;
      background-color: #f5f5f5;
      border-radius: 36rpx;
      padding: 0 30rpx;
      font-size: 28rpx;
      color: #333;
    }

    .send-btn {
      margin-left: 20rpx;
      padding: 0 40rpx;
      height: 72rpx;
      line-height: 72rpx;
      background-color: #EC4141;
      border-radius: 36rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      &[disabled] {
        background-color: #ccc;
      }

      .send-text {
        font-size: 28rpx;
        color: #fff;
        font-weight: 500;
      }
    }
  }
}

/* 楼层评论弹窗 */
.floor-comment-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
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
  height: 55vh;
  background-color: #f5f5f5;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* 弹窗顶部导航栏 */
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

.header-left .iconfont {
  font-size: 40rpx;
  color: #333;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

/* 楼主评论区域 */
.owner-comment-wrapper {
  padding: 24rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #e0e0e0;
  flex-shrink: 0;
}

/* 排序导航条 */
.reply-sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e0e0e0;
  flex-shrink: 0;
}

.sort-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 32rpx;
}

.sort-text {
  font-size: 24rpx;
  color: #666;
}

.sort-btn .iconfont {
  font-size: 24rpx;
  color: #666;
}

.reply-btn-icon {
  font-size: 24rpx;
}

/* 楼层评论列表 */
.floor-comments-list {
  flex: 1;
  overflow-y: auto;
}

.floor-comment-item {
  padding: 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

/* 复用外部评论的样式 */
.floor-comment-item .comment-header,
.owner-comment .comment-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.floor-comment-item .user-avatar,
.owner-comment .user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.floor-comment-item .user-info,
.owner-comment .user-info {
  flex: 1;
}

.floor-comment-item .user-name,
.owner-comment .user-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.floor-comment-item .comment-time,
.owner-comment .comment-time {
  display: block;
  font-size: 22rpx;
  color: #999;
}

.floor-comment-item .like-btn,
.owner-comment .like-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.floor-comment-item .like-btn .iconfont,
.owner-comment .like-btn .iconfont {
  font-size: 36rpx;
  color: #999;
  
  &.liked {
    color: #EC4141;
  }
}

.floor-comment-item .like-btn .like-count,
.owner-comment .like-btn .like-count {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}

.floor-comment-item .comment-content,
.owner-comment .comment-content {
  margin-left: 100rpx;
}

.floor-comment-item .comment-content .content-text,
.owner-comment .comment-content .content-text {
  display: block;
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.floor-comment-item .reply-info,
.owner-comment .reply-info {
  margin-top: 20rpx;
  margin-left: 100rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
}

.floor-comment-item .reply-info .reply-item .reply-user,
.owner-comment .reply-info .reply-item .reply-user {
  font-size: 24rpx;
  color: #666;
  margin-right: 8rpx;
}

.floor-comment-item .reply-info .reply-item .reply-content,
.owner-comment .reply-info .reply-item .reply-content {
  font-size: 26rpx;
  color: #333;
}

// 底部占位，避免内容被输入框遮挡
.floor-bottom-placeholder {
  height: 120rpx;
}
</style>
