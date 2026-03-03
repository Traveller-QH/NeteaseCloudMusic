<template>
	<view class="login-page">
    <!-- 状态栏占位块 -->
    <view class="status_bar" />

		<!-- 顶部导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<i class="iconfont icon-fanhui"></i>
			</view>
			<text class="nav-title">登录</text>
			<view class="nav-placeholder"></view>
		</view>
		
		<!-- 登录内容区 -->
		<view class="login-content">
			<!-- Logo区域 -->
			<view class="logo-section">
				<view class="logo-placeholder">
					<i class="iconfont icon-yinle" style="font-size: 48px; color: #fff;" />
				</view>
				<text class="app-name">网易云音乐</text>
			</view>
			
			<!-- 登录方式切换 -->
			<view class="login-tabs">
				<view 
					class="tab-item" 
					:class="{ active: currentTab === 'password' }"
					@click="switchTab('password')"
				>
					密码登录
				</view>
				<view 
					class="tab-item" 
					:class="{ active: currentTab === 'captcha' }"
					@click="switchTab('captcha')"
				>
					验证码登录
				</view>
				<view 
					class="tab-item" 
					:class="{ active: currentTab === 'qr' }"
					@click="switchTab('qr')"
				>
					扫码登录
				</view>
			</view>
			
			<!-- 登录表单 -->
			<view class="login-form" v-if="currentTab !== 'qr'">
				<!-- 国家区号选择 -->
				<view class="form-item" v-if="showCountryCode">
					<view class="country-selector" @click="showCountryPicker = true">
						<text class="country-text">+{{ selectedCountry.code }}</text>
						<text class="country-name">{{ selectedCountry.name }}</text>
						<i class="iconfont icon-xiajiantou arrow-icon"></i>
					</view>
				</view>
				
				<!-- 手机号输入 -->
				<view class="form-item">
					<input 
						class="input-field" 
						type="number" 
						v-model="formData.phone"
						placeholder="请输入手机号"
						maxlength="11"
					/>
				</view>
				
				<!-- 密码输入 -->
				<view class="form-item" v-if="currentTab === 'password'">
					<input 
						class="input-field" 
						:type="showPassword ? 'text' : 'password'"
						v-model="formData.password"
						placeholder="请输入密码"
					/>
					<view class="input-icon" @click="togglePassword">
						<i class="iconfont" :class="showPassword ? 'icon-yanjing' : 'icon-yanjing1'"></i>
					</view>
				</view>
				
				<!-- 验证码输入 -->
				<view class="form-item" v-if="currentTab === 'captcha'">
					<input 
						class="input-field" 
						type="number"
						v-model="formData.captcha"
						placeholder="请输入验证码"
						maxlength="6"
					/>
					<view class="captcha-btn" :class="{ disabled: captchaDisabled }" @click="sendCaptcha">
						{{ captchaText }}
					</view>
				</view>
				
				<!-- 登录按钮 -->
				<button 
					class="login-btn" 
					:class="{ disabled: !canLogin }"
					@click="handleLogin"
				>
					登录
				</button>
			</view>
			
			<!-- 二维码登录 -->
			<view class="qr-section" v-if="currentTab === 'qr'">
				<view class="qr-container" v-if="qrCode">
					<image class="qr-image" :src="qrCode" mode="aspectFit"></image>
					<view class="qr-tip-container">
						<text class="qr-tip">请使用</text>
						<text class="qr-tip-highlight">网易云音乐</text>
						<text class="qr-tip">APP扫码登录</text>
					</view>
				</view>
				<view class="qr-loading" v-else>
					<u-loading-icon mode="circle"></u-loading-icon>
					<text class="loading-text">正在生成二维码...</text>
				</view>
				
				<!-- 二维码状态提示 -->
				<view class="qr-status" v-if="qrStatus">
					<text class="status-text">{{ qrStatus }}</text>
				</view>
			</view>
		</view>
		
		<!-- 国家选择弹窗 -->
		<u-action-sheet 
			:show="showCountryPicker" 
			:actions="countryList"
			title="选择国家/地区"
			@close="showCountryPicker = false"
			@select="selectCountry"
		></u-action-sheet>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/utils/userStore.js'

const userStore = useUserStore()

// 登录方式
const currentTab = ref('password')

// 表单数据
const formData = ref({
	phone: '',
	password: '',
	captcha: ''
})

// 国家区号
const showCountryCode = computed(() => currentTab.value !== 'qr')
const selectedCountry = ref({ code: '86', name: '中国' })
const showCountryPicker = ref(false)

// 常用国家列表
const countryList = ref([
	{ name: '中国', code: '86' },
	{ name: '美国', code: '1' },
	{ name: '英国', code: '44' },
	{ name: '法国', code: '33' },
	{ name: '德国', code: '49' },
	{ name: '日本', code: '81' },
	{ name: '韩国', code: '82' },
	{ name: '澳大利亚', code: '61' },
	{ name: '加拿大', code: '1' },
	{ name: '俄罗斯', code: '7' }
])

// 密码显示控制
const showPassword = ref(false)

// 验证码相关
const captchaDisabled = ref(false)
const captchaCountdown = ref(0)
const captchaTimer = ref(null)

// 二维码相关
const qrCode = ref('')
const qrKey = ref('')
const qrTimer = ref(null)
const qrStatus = ref('')

// 计算属性
const canLogin = computed(() => {
	if (currentTab.value === 'password') {
		return formData.value.phone && formData.value.password
	} else if (currentTab.value === 'captcha') {
		return formData.value.phone && formData.value.captcha
	}
	return false
})

const captchaText = computed(() => {
	if (captchaCountdown.value > 0) {
		return `${captchaCountdown.value}秒后重发`
	}
	return '获取验证码'
})

// 切换登录方式
const switchTab = (tab) => {
	currentTab.value = tab
	resetForm()
	
	if (tab === 'qr') {
		generateQrCode()
	} else {
		stopQrPolling()
	}
}

// 重置表单
const resetForm = () => {
	formData.value = {
		phone: '',
		password: '',
		captcha: ''
	}
	qrCode.value = ''
	qrStatus.value = ''
	stopCaptchaCountdown()
}

// 选择国家
const selectCountry = (country) => {
	selectedCountry.value = country
	showCountryPicker.value = false
}

// 切换密码显示
const togglePassword = () => {
	showPassword.value = !showPassword.value
}

// 发送验证码
const sendCaptcha = async () => {
	if (captchaDisabled.value || !formData.value.phone) return
	
	const success = await userStore.sendCaptchaCode(
		formData.value.phone, 
		selectedCountry.value.code
	)
	
	if (success) {
		startCaptchaCountdown()
	}
}

// 验证码倒计时
const startCaptchaCountdown = () => {
	captchaCountdown.value = 60
	captchaDisabled.value = true
	
	captchaTimer.value = setInterval(() => {
		captchaCountdown.value--
		if (captchaCountdown.value <= 0) {
			stopCaptchaCountdown()
		}
	}, 1000)
}

const stopCaptchaCountdown = () => {
	if (captchaTimer.value) {
		clearInterval(captchaTimer.value)
		captchaTimer.value = null
	}
	captchaCountdown.value = 0
	captchaDisabled.value = false
}

// 生成二维码
const generateQrCode = async () => {
	try {
		// 获取二维码key
		const keyRes = await userStore.getQrKey()
		if (keyRes.code === 200) {
			qrKey.value = keyRes.data.unikey
			
			// 生成二维码
			const qrRes = await userStore.getQrCreate(qrKey.value)
			if (qrRes.code === 200) {
				qrCode.value = qrRes.data.qrimg
				startQrPolling()
			}
		}
	} catch (error) {
		console.error('生成二维码失败:', error)
		uni.showToast({
			title: '二维码生成失败',
			icon: 'none'
		})
	}
}

// 开始二维码轮询
const startQrPolling = () => {
	stopQrPolling()
	qrTimer.value = setInterval(async () => {
		try {
			const res = await userStore.checkQrStatus(qrKey.value)
			handleQrStatus(res)
		} catch (error) {
			console.error('二维码状态检查失败:', error)
		}
	}, 1000)
}

// 处理二维码状态
const handleQrStatus = (res) => {
	switch (res.code) {
		case 800:
			// 二维码过期
			qrStatus.value = '二维码已过期，请重新生成'
			stopQrPolling()
			break
		case 801:
			// 等待扫码
			qrStatus.value = '请使用网易云音乐APP扫码'
			break
		case 802:
			// 待确认
			qrStatus.value = '请在手机上确认登录'
			break
		case 803:
			// 授权登录成功
			qrStatus.value = '登录成功'
			stopQrPolling()
			// 处理登录成功
			userStore.handleQrLogin(res)
			// 登录成功后获取用户数据
			setTimeout(async () => {
				await userStore.refreshUserData()
				goBack()
			}, 1000)
			break
	}
}

// 停止二维码轮询
const stopQrPolling = () => {
	if (qrTimer.value) {
		clearInterval(qrTimer.value)
		qrTimer.value = null
	}
}

// 处理登录
const handleLogin = async () => {
	if (!canLogin.value) return
	
	uni.showLoading({ title: '登录中...' })
	
	try {
		let success = false
		
		if (currentTab.value === 'password') {
			success = await userStore.loginByPassword(
				formData.value.phone,
				formData.value.password,
				selectedCountry.value.code
			)
		} else if (currentTab.value === 'captcha') {
			success = await userStore.loginByCaptcha(
				formData.value.phone,
				formData.value.captcha,
				selectedCountry.value.code
			)
		}
		
		if (success) {
			// 登录成功后获取用户数据
			await userStore.refreshUserData()
			setTimeout(() => {
				goBack()
			}, 1000)
		}
	} catch (error) {
		console.error('登录失败:', error)
	} finally {
		uni.hideLoading()
	}
}

// 返回上一页
const goBack = () => {
	uni.navigateBack()
}

// 生命周期
onMounted(() => {
	// 页面加载时初始化
})

onUnmounted(() => {
	// 清理定时器
	stopCaptchaCountdown()
	stopQrPolling()
})
</script>

<style lang="scss" scoped>
.login-page {
	min-height: 100vh;
	background: linear-gradient(180deg, #EC4141 0%, #FF6666 100%);
	padding-top: var(--status-bar-height);
}

.status_bar {
  height: var(--status-bar-height);
  width: 100%;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 44px;
	padding: 0 16px;
	
	.nav-back {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		
		.iconfont {
			font-size: 20px;
			color: #fff;
		}
	}
	
	.nav-title {
		font-size: 18px;
		font-weight: 500;
		color: #fff;
	}
	
	.nav-placeholder {
		width: 44px;
	}
}

.login-content {
	padding: 40px 24px 0;
	
	.logo-section {
		text-align: center;
		margin-bottom: 40px;
				
		.logo-placeholder {
			width: 80px;
			height: 80px;
			background: rgba(255, 255, 255, 0.2);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			margin: 0 auto 16px;
		}
				
		.app-name {
			font-size: 24px;
			font-weight: bold;
			color: #fff;
		}
	}
	
	.login-tabs {
		display: flex;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 24px;
		padding: 4px;
		margin-bottom: 32px;
		
		.tab-item {
			flex: 1;
			text-align: center;
			padding: 12px 0;
			border-radius: 20px;
			font-size: 16px;
			color: rgba(255, 255, 255, 0.7);
			transition: all 0.3s;
			
			&.active {
				background: #fff;
				color: #EC4141;
				font-weight: 500;
			}
		}
	}
	
	.login-form {
		.form-item {
			margin-bottom: 20px;
			position: relative;
			
			.input-field {
				width: 90%;
				height: 50px;
				background: rgba(255, 255, 255, 0.9);
				border-radius: 25px;
				padding: 0 20px;
				font-size: 16px;
				color: #333;
				border: none;
				outline: none;
				
				&::placeholder {
					color: #999;
				}
			}
			
			.input-icon {
				position: absolute;
				right: 20px;
				top: 50%;
				transform: translateY(-50%);
				width: 24px;
				height: 24px;
				display: flex;
				align-items: center;
				justify-content: center;
				
				.iconfont {
					font-size: 20px;
					color: #999;
				}
			}
			
			.captcha-btn {
				position: absolute;
				right: 8px;
				top: 8px;
				height: 34px;
				padding: 0 16px;
				background: #EC4141;
				border-radius: 17px;
				font-size: 14px;
				color: #fff;
				display: flex;
				align-items: center;
				justify-content: center;
				
				&.disabled {
					background: #ccc;
				}
			}
		}
		
		.country-selector {
			display: flex;
			align-items: center;
			height: 50px;
			background: rgba(255, 255, 255, 0.9);
			border-radius: 25px;
			padding: 0 20px;
			
			.country-text {
				font-size: 16px;
				color: #333;
				margin-right: 8px;
			}
			
			.country-name {
				font-size: 16px;
				color: #666;
				flex: 1;
			}
			
			.arrow-icon {
				font-size: 16px;
				color: #999;
			}
		}
		
		.login-btn {
			width: 100%;
			height: 50px;
			background: #fff;
			border-radius: 25px;
			font-size: 18px;
			font-weight: 500;
			color: #EC4141;
			margin-top: 20px;
			
			&.disabled {
				background: rgba(255, 255, 255, 0.5);
				color: rgba(236, 65, 65, 0.5);
			}
		}
	}
	
	.qr-section {
		text-align: center;
		padding: 40px 0;
		
		.qr-container {
			.qr-image {
				width: 240px;
				height: 240px;
				background: #fff;
				border-radius: 12px;
				padding: 16px;
				margin-bottom: 20px;
			}
			
			.qr-tip-container {
				display: flex;
				justify-content: center;
				align-items: center;
				flex-wrap: wrap;
				gap: 4px;
			}
			
			.qr-tip {
				font-size: 16px;
				color: rgba(255, 255, 255, 0.9);
			}
			
			.qr-tip-highlight {
				font-size: 16px;
				font-weight: bold;
				color: #fff;
				background: linear-gradient(90deg, #EC4141, #FF6666);
				padding: 4px 8px;
				border-radius: 12px;
			}
		}
		
		.qr-loading {
			.loading-text {
				display: block;
				margin-top: 16px;
				font-size: 16px;
				color: rgba(255, 255, 255, 0.7);
			}
		}
		
		.qr-status {
			margin-top: 20px;
			
			.status-text {
				font-size: 16px;
				color: #fff;
				padding: 8px 16px;
				background: rgba(255, 255, 255, 0.2);
				border-radius: 16px;
			}
		}
	}
}
</style>