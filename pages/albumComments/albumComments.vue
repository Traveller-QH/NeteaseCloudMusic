<template>
  <view class="comments-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="handleBack">
        <i class="iconfont icon-arrow-left nav-icon"/>
        <text class="comment-count">评论 ({{ commentCount }})</text>
      </view>
      <view class="nav-right" @click="handleShare">
        <i class="iconfont icon-fenxiang nav-icon"/>
      </view>
    </view>

    <!-- 专辑基础信息区域 -->
    <view class="album-info-bar" v-if="albumInfo" @click="goToAlbumDetail">
      <image class="album-cover" :src="albumInfo.picUrl || albumInfo.cover" mode="aspectFill"/>
      <view class="album-info">
        <text class="album-name">{{ albumInfo.name }}</text>
        <text class="album-artist">{{ formatArtists(albumInfo.artists || [albumInfo.artist]) }}</text>
      </view>
      <i class="iconfont icon-arrow-right arrow-icon"/>
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
    <scroll-view
      scroll-y
      class="comments-list-scroll"
      @scrolltolower="loadMoreComments"
      :lower-threshold="100"
    >
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
          <view class="like-btn" @click.stop="toggleLike(comment)">
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
        <view class="reply-btn-wrapper" v-if="comment.showFloorComment && comment.showFloorComment.showReplyCount" @click="openFloorComment(comment)">
          <text class="reply-btn-text">{{ comment.showFloorComment.replyCount || 0 }}条回复<i class="iconfont icon-arrow-right reply-btn-icon" /></text>
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
      <view class="no-more-wrapper" v-if="!hasMore && commentsList.length > 0">
        <text class="no-more-text">已经到底了</text>
      </view>

      <!-- 空状态 -->
      <view class="empty-wrapper" v-if="!loading && commentsList.length === 0">
        <text class="empty-text">暂无评论，快来抢沙发吧~</text>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 底部输入框 -->
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
          <text class="header-title">回复({{ floorReplyCount }})</text>
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
              <view class="like-btn" @click.stop="toggleLike(currentOwnerComment)">
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
import { getNewComment, likeComment, postNewComment, getAlbum, getFloorComment, deleteComment } from '@/utils/api.js'
import { useUserStore } from '@/utils/userStore.js'

// 专辑 ID
const albumId = ref('')
// 评论数量
const commentCount = ref(0)
// 专辑信息
const albumInfo = ref(null)
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

// 长按评论相关（保留用于兼容）
const showLongPressPopup = ref(false) // 是否显示长按弹窗
const longPressComment = ref(null) // 当前长按的评论
const popupPosition = ref({ top: 0, left: 0 }) // 弹窗位置
const isOwnComment = ref(false) // 是否为自己的评论

// 回复评论相关
const showReplyMask = ref(false) // 是否显示回复遮罩层
const replyTargetComment = ref(null) // 回复的目标评论
const replyTargetNickname = ref('') // 回复的目标用户昵称

// 楼层评论相关
const showFloorPopup = ref(false) // 是否显示楼层弹窗
const currentOwnerComment = ref(null) // 当前楼主评论
const floorCommentsList = ref([]) // 楼层回复列表
const floorReplyCount = ref(0) // 回复总数
const floorLoading = ref(false) // 加载状态
const floorHasMore = ref(true) // 是否还有更多
const floorParentCommentId = ref('') // 父评论 ID
const floorTime = ref(null) // 分页时间游标
const floorSortType = ref(1) // 排序方式：1-升序，2-倒序

// 格式化艺术家名称
const formatArtists = (artists) => {
  if (!artists) return '未知'
  return artists.map(artist => artist.name).join('/')
}

// 格式化评论时间
const formatCommentTime = (timestamp) => {
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
    }
  } catch (error) {
    console.error('获取专辑详情失败:', error)
  }
}

// 获取评论
const fetchComments = async (isLoadMore = false) => {
  if (loading.value) return

  // 如果不是加载更多，重置参数
  if (!isLoadMore) {
    currentPage.value = 1
    commentsList.value = []
    hasMore.value = true
    cursor.value = null
  }

  // 如果没有更多数据，直接返回
  if (!hasMore.value && isLoadMore) return

  loading.value = true
  try {
    const params = {
      id: parseInt(albumId.value), // 转换为数字
      type: 3, // 专辑类型
      pageNo: currentPage.value,
      pageSize: pageSize,
      sortType: sortType.value
    }

    // 时间排序时需要传入 cursor
    if (sortType.value === 3 && cursor.value) {
      params.cursor = cursor.value
    }

    const res = await getNewComment(params)
    
    if (res.code === 200 && res.data) {
      const data = res.data
      
      // 获取评论列表
      const newComments = data.comments || []
      
      if (newComments.length > 0) {
        // 追加评论到列表
        if (isLoadMore) {
          commentsList.value.push(...newComments)
        } else {
          commentsList.value = newComments
        }

        // 更新分页参数
        currentPage.value++
        
        // 更新时间排序的 cursor
        if (sortType.value === 3 && newComments.length > 0) {
          const lastComment = newComments[newComments.length - 1]
          cursor.value = lastComment.time
        }

        // 判断是否还有更多数据
        if (newComments.length < pageSize) {
          hasMore.value = false
        }
      } else {
        hasMore.value = false
      }
    } else {
      uni.showToast({
        title: res.msg || '加载评论失败',
        icon: 'none'
      })
      hasMore.value = false
    }
  } catch (error) {
    uni.showToast({
      title: error.msg || error.message || '加载评论失败',
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

// 点赞/取消点赞评论
const toggleLike = async (comment) => {
  try {
    const t = comment.liked ? 0 : 1 // 1 为点赞，0 为取消点赞
    const res = await likeComment(albumId.value, comment.commentId, t, 3)
    if (res.code === 200) {
      // 更新点赞状态和数量
      comment.liked = !comment.liked
      comment.likedCount = (comment.likedCount || 0) + (comment.liked ? 1 : -1)
      
      // 显示提示效果
      uni.showToast({
        title: comment.liked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1500
      })
    } else {
      uni.showToast({
        title: res.message || '操作失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 发送评论
const sendComment = async () => {
  if (!inputContent.value.trim()) return
  
  sending.value = true
  try {
    // 判断是在楼层弹窗内还是回复模式
    const isInFloor = showFloorPopup.value
    const isReply = showReplyMask.value
    
    // t: 1 发送，2 回复
    const t = isReply ? 2 : 1
    const commentId = isReply ? replyTargetComment.value?.commentId : null
    
    const res = await postNewComment(t, 3, albumId.value, inputContent.value.trim(), commentId)
    if (res.code === 200) {
      uni.showToast({
        title: isReply ? '回复成功' : '评论成功',
        icon: 'success'
      })
      
      // 清空输入框
      inputContent.value = ''
      
      // 如果是回复模式，关闭遮罩
      if (showReplyMask.value) {
        closeReplyMask()
      }
      
      // 重新加载评论列表
      fetchComments(false)
      
      // 如果在楼层弹窗中，也刷新楼层评论
      if (showFloorPopup.value) {
        await fetchFloorComments()
      }
    }
  } catch (error) {
    console.error('发送评论失败:', error)
    uni.showToast({
      title: '发送失败',
      icon: 'none'
    })
  } finally {
    sending.value = false
  }
}

// 处理输入框点击（防止冒泡）
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

// 打开楼层评论
const openFloorComment = async (comment) => {
  currentOwnerComment.value = comment
  floorParentCommentId.value = comment.commentId
  // 从 showFloorComment.replyCount 获取回复数
  floorReplyCount.value = comment.showFloorComment?.replyCount || 0
  showFloorPopup.value = true
  
  // 重置参数
  floorTime.value = null
  floorCommentsList.value = []
  floorHasMore.value = true
  
  // 加载楼层评论
  await fetchFloorComments()
}

// 关闭楼层评论
const closeFloorComment = () => {
  showFloorPopup.value = false
  currentOwnerComment.value = null
  floorCommentsList.value = []
}

// 切换排序方式
const toggleFloorSort = () => {
  floorSortType.value = floorSortType.value === 1 ? 2 : 1
  // 重置参数并重新获取数据，保证数据实时性
  floorTime.value = null
  floorCommentsList.value = []
  floorHasMore.value = true
  fetchFloorComments()
}

// 按时间排序楼层评论
const sortFloorCommentsByTime = () => {
  if (floorCommentsList.value.length === 0) return
  
  // 创建新数组避免响应式问题
  const sortedList = [...floorCommentsList.value]
  
  // 根据 floorSortType 进行排序：1-升序（从旧到新），2-倒序（从新到旧）
  sortedList.sort((a, b) => {
    const timeA = a.time || 0
    const timeB = b.time || 0
    
    if (floorSortType.value === 1) {
      // 升序：从旧到新
      return timeA - timeB
    } else {
      // 倒序：从新到旧
      return timeB - timeA
    }
  })
  
  // 更新列表
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
      id: parseInt(albumId.value),
      type: 3, // 专辑类型
      limit: 20
    }
    
    // 时间分页时需要传入 time
    if (floorTime.value) {
      params.time = floorTime.value
    }
    
    const res = await getFloorComment(params)
    
    if (res.code === 200 && res.data) {
      const data = res.data
      const newComments = data.comments || []
      
      // 更新回复总数（从接口获取 totalCount）
      if (data.totalCount !== undefined) {
        floorReplyCount.value = data.totalCount
      } else if (data.showFloorComment && data.showFloorComment.replyCount !== undefined) {
        floorReplyCount.value = data.showFloorComment.replyCount
      }
      
      if (newComments.length > 0) {
        floorCommentsList.value.push(...newComments)
        
        // 更新分页参数
        if (newComments.length > 0) {
          const lastComment = newComments[newComments.length - 1]
          floorTime.value = lastComment.time
        }
        
        // 判断是否还有更多数据
        if (newComments.length < 20 || !data.hasMore) {
          floorHasMore.value = false
        }
        
        // 加载完成后应用排序
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

// 点赞/取消点赞楼层评论
const toggleFloorLike = async (comment) => {
  try {
    const t = comment.liked ? 0 : 1 // 1 为点赞，0 为取消点赞
    const res = await likeComment(parseInt(albumId.value), comment.commentId, t, 3)
    if (res.code === 200) {
      // 更新点赞状态和数量
      comment.liked = !comment.liked
      comment.likedCount = (comment.likedCount || 0) + (comment.liked ? 1 : -1)
      
      // 显示提示效果
      uni.showToast({
        title: comment.liked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1500
      })
    } else {
      uni.showToast({
        title: res.message || '操作失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 删除主评论
const deleteCommentFunc = async (comment) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await deleteComment(0, 3, parseInt(albumId.value), comment.commentId)
          if (deleteRes.code === 200) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            // 重新加载评论列表
            await fetchComments(false)
          } else {
            uni.showToast({
              title: deleteRes.message || '删除失败',
              icon: 'none'
            })
          }
        } catch (error) {
          console.error('删除评论失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 删除楼层评论
const deleteFloorCommentFunc = async (comment) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条回复吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await deleteComment(0, 3, parseInt(albumId.value), comment.commentId)
          if (deleteRes.code === 200) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            
            // 判断当前回复数量
            const remainingCount = floorCommentsList.value.length - 1
            
            // 如果只剩楼主的评论（回复数为 0），直接关闭弹窗
            if (remainingCount <= 0) {
              closeFloorComment()
              // 刷新主评论列表
              await fetchComments(false)
            } else {
              // 重新加载楼层评论，保证数据实时性
              floorTime.value = null
              floorCommentsList.value = []
              floorHasMore.value = true
              await fetchFloorComments()
              // 同时刷新主评论列表
              await fetchComments(false)
            }
          } else {
            uni.showToast({
              title: deleteRes.message || '删除失败',
              icon: 'none'
            })
          }
        } catch (error) {
          console.error('删除回复失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 分享
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

// 跳转到专辑详情
const goToAlbumDetail = () => {
  uni.navigateTo({
    url: `/pages/album/album?id=${albumId.value}`
  })
}

// 返回上一页
const handleBack = () => {
  uni.navigateBack()
}

// 页面加载
onMounted(async () => {
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || currentPage.$page?.options || {}

  if (options.id) {
    albumId.value = options.id
    commentCount.value = parseInt(options.commentCount || 0)
    
    // 获取专辑详情
    await fetchAlbumDetail(options.id)
    // 获取第一页评论
    fetchComments(false)
  }
})
</script>

<style lang="scss" scoped>
@import '@/static/iconfont/iconfont.css';

.comments-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

// 顶部导航
.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #f0f0f0;

  .nav-left {
    display: flex;
    align-items: center;
    
    .nav-icon {
      font-size: 44rpx;
      color: #333;
    }

    .comment-count {
      font-size: 28rpx;
      color: #333;
      margin-left: 12rpx;
      font-weight: bold;
    }
  }

  .nav-right {
    .nav-icon {
      font-size: 44rpx;
      color: #333;
    }
  }
}

// 专辑基础信息区域
.album-info-bar {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #f0f0f0;

  .album-cover {
    width: 100rpx;
    height: 100rpx;
    border-radius: 12rpx;
  }

  .album-info {
    flex: 1;
    margin-left: 24rpx;

    .album-name {
      display: block;
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
      margin-bottom: 8rpx;
    }

    .album-artist {
      display: block;
      font-size: 24rpx;
      color: #999;
    }
  }

  .arrow-icon {
    font-size: 40rpx;
    color: #999;
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
.comments-list-scroll {
  flex: 1;
  height: 0;

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

/* 楼层评论弹窗 */
.floor-comment-popup {
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
  height: 85vh;
  background-color: #f5f5f5;
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

.owner-comment {
  /* 移除额外样式，复用外部评论样式 */
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

// 底部输入框
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
    // 不设置 pointer-events，让点击事件能穿透到遮罩层
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

// 长按评论弹窗（保留用于兼容，但不再使用）
.longpress-popup {
  display: none;
}

.popup-content-wrapper {
  display: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
