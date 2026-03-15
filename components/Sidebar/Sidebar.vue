<template>
	<!-- 侧边栏遮罩 -->
	<view class="sidebar-mask" v-if="show" @click="$emit('close')"></view>
	
	<!-- 侧边栏 -->
	<view class="sidebar" :class="{ 'sidebar-show': show }">
		<view class="sidebar-header">
			<image class="sidebar-logo" src="/static/favicon.ico" mode="aspectFit"></image>
			<text class="sidebar-title">网易云音乐</text>
		</view>
		<view class="sidebar-menu">
      <!--<view class="menu-item">
        <i class="iconfont icon-shezhi" />
        <text class="menu-text">设置</text>
      </view>
      <view class="menu-item">
        <i class="iconfont icon-shensemoshi" />
        <text class="menu-text">深色模式</text>
        <up-switch size="20" activeColor="#EC4141"></up-switch>
      </view>
      <view class="menu-item">
        <i class="iconfont icon-xiaoxi" />
        <text class="menu-text">消息中心</text>
      </view>-->
      <view class="menu-item">
        <i class="iconfont icon-zengqiangduijiangyinzhi" />
        <text class="menu-text">全局音质</text>
      </view>
			<view class="menu-item">
        <i class="iconfont icon-dingshiguanbi" />
				<text class="menu-text">定时关闭</text>
			</view>
      <!--<view class="menu-item">
        <i class="iconfont icon-jiashimoshi" />
        <text class="menu-text">驾驶模式</text>
      </view>-->
		</view>
		<view class="sidebar-footer">
			<view class="footer-item">
        <i class="iconfont icon-bangzhuyufankui" />
				<text class="footer-text">帮助与反馈</text>
			</view>
			<view class="footer-item">
        <i class="iconfont icon-guanyu" />
				<text class="footer-text">关于</text>
			</view>
			<!-- 退出登录 -->
			<view class="footer-item logout-item" v-if="isLogin" @click="handleLogout">
				<text class="logout-icon">⏻</text>
				<text class="footer-text logout-text">退出登录</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/utils/userStore.js'

const userStore = useUserStore()

defineProps({
	show: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['close'])

// 是否已登录
const isLogin = computed(() => userStore.isLogin)

// 退出登录
const handleLogout = () => {
	// 先通知播放控制器降低层级，然后关闭侧边栏，再显示确认弹窗
	if (globalThis.appModalManager && typeof globalThis.appModalManager.showModal === 'function') {
		globalThis.appModalManager.showModal()
	}
	emit('close')
	// 使用 setTimeout 确保侧边栏完全关闭后再显示弹窗
	setTimeout(() => {
		uni.showModal({
			title: '提示',
			content: '确定要退出登录吗？',
			success: async (res) => {
				if (res.confirm) {
					console.log('[Sidebar] 用户确认退出登录')
					await userStore.logout()
					console.log('[Sidebar] 退出登录完成')
					uni.showToast({
						title: '已退出登录',
						icon: 'success'
					})
					// 退出登录后跳转到发现页面
					uni.reLaunch({
						url: '/pages/discovery/discovery'
					})
				}
				// 隐藏弹窗后恢复播放控制器层级
				if (globalThis.appModalManager && typeof globalThis.appModalManager.hideModal === 'function') {
					globalThis.appModalManager.hideModal()
				}
			},
			fail: () => {
				// 弹窗失败也需要恢复播放控制器层级
				if (globalThis.appModalManager && typeof globalThis.appModalManager.hideModal === 'function') {
					globalThis.appModalManager.hideModal()
				}
			}
		})
	}, 300) // 延迟时间应与侧边栏关闭动画时间匹配
}
</script>

<style lang="scss" scoped>
// 侧边栏遮罩
.sidebar-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 9999;
}

// 侧边栏
.sidebar {
	position: fixed;
	top: 0;
	left: -540rpx;
	width: 540rpx;
	height: 100vh;
	background: #fff;
	z-index: 10000;
	transition: left 0.3s ease;
	display: flex;
	flex-direction: column;
	
	&.sidebar-show {
		left: 0;
	}
	
	.sidebar-header {
		display: flex;
		align-items: center;
		padding: 80rpx 30rpx 40rpx;
		border-bottom: 1rpx solid #eee;
		
		.sidebar-logo {
			width: 60rpx;
			height: 60rpx;
			border-radius: 12rpx;
		}
		
		.sidebar-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
			margin-left: 20rpx;
		}
	}
	
	.sidebar-menu {
		flex: 1;
		padding: 20rpx 0;
		
		.menu-item {
			display: flex;
			align-items: center;
			padding: 30rpx;
			
			.menu-text {
				flex: 1;
				font-size: 28rpx;
				color: #333;
				margin-left: 24rpx;
			}
		}
	}
	
	.sidebar-footer {
		padding: 30rpx;
		border-top: 1rpx solid #eee;
		
		.footer-item {
			display: flex;
			align-items: center;
			padding: 20rpx 0;
			
			.footer-text {
				font-size: 24rpx;
				color: #999;
				margin-left: 16rpx;
			}
		}
		
		// 退出登录按钮样式
		.logout-item {
			margin-top: 20rpx;
			padding-top: 30rpx;
			border-top: 1rpx solid #eee;
			
			.logout-icon {
				font-size: 32rpx;
				color: #EC4141;
			}
			
			.logout-text {
				color: #EC4141;
			}
		}
	}
}
</style>
