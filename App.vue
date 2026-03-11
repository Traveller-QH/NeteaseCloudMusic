<script>
	import PlayBar from '@/components/PlayBar/PlayBar.vue'
	import { useUserStore } from '@/utils/userStore.js'
	
	export default {
		// 注册全局组件
		components: {
			PlayBar
		},
		onLaunch: function() {
			// 初始化用户状态
			const userStore = useUserStore()
			
			// 先尝试从本地存储恢复用户信息
			const restored = userStore.restoreLoginState()
			if (restored) {
				// console.log('[App] 从本地存储成功恢复用户信息')
				// 验证登录状态是否仍然有效
				userStore.validateLoginStatus().then((valid) => {
					if (valid) {
						// 登录有效，获取用户数据
						userStore.refreshUserData()
					}
				})
			} else {
				// console.log('[App] 本地无存储的用户信息，检查登录状态')
				// 没有本地存储信息，验证登录状态
				userStore.validateLoginStatus()
			}
			
			// 初始化全局弹窗管理器
			if (!globalThis.appModalManager) {
				globalThis.appModalManager = {
					modalCount: 0,
					showModal: () => {
						this.$nextTick(() => {
							if (globalThis.musicPlayerModalManager && typeof globalThis.musicPlayerModalManager.showModal === 'function') {
								globalThis.musicPlayerModalManager.showModal()
							}
						})
					},
					hideModal: () => {
						this.$nextTick(() => {
							if (globalThis.musicPlayerModalManager && typeof globalThis.musicPlayerModalManager.hideModal === 'function') {
								globalThis.musicPlayerModalManager.hideModal()
							}
						})
					}
				}
			}
		},
		onShow: function() {
		},
		onHide: function() {
		}
	}
</script>

<style lang="scss">
	/* 注意要写在第一行，注意不能引入至uni.scss，同时给style标签加入lang="scss"属性 */
	@import "@/uni_modules/uview-plus/index.scss";

  /* iconfont全局图标样式 */
  @import '@/static/iconfont/iconfont.css';
	
/* 全局公共样式 */
	page {
		background-color: #f5f5f5;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	/* 重置样式 */
	view, text {
		box-sizing: border-box;
	}
	
	/* 全局主题色 */
	.text-theme {
		color: #EC4141;
	}
	
	.bg-theme {
		background-color: #EC4141;
	}
	
	/* 渐变背景 */
	.bg-gradient-theme {
		background: linear-gradient(135deg, #EC4141, #FF6666);
	}
	
	/* 边框设置 */
	.border-theme {
		border-color: #EC4141;
	}
	
	/* 文字溢出省略 */
	.text-ellipsis {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	/* 多行文字溢出省略 */
	.text-ellipsis-2 {
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	
	/* flex布局 */
	.flex {
		display: flex;
	}
	
	.flex-center {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.flex-between {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	
	.flex-column {
		display: flex;
		flex-direction: column;
	}
	
	/* 安全区域填充 */
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom);
	}
	
	/* 彻底隐藏底部占位元素 */
	.bottom-space {
		display: none !important;
		visibility: hidden !important;
		height: 0 !important;
		width: 0 !important;
		margin: 0 !important;
		padding: 0 !important;
	}
</style>