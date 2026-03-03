/**
 * 用户状态管理store
 * 支持扫码登录、短信验证码登录、手机号密码登录
 * 需要持久化存储 baoyueVersion 字段
 */

import { defineStore } from 'pinia'
import { getLoginStatus, loginByPhone, loginByCaptcha, sendCaptcha, getQrKey, getQrCreate, checkQrStatus } from '@/utils/api.js'

export const useUserStore = defineStore('user', {
  // 状态
  state: () => ({
    // 登录状态
    isLoggedIn: false,
    // 登录时间戳
    loginTimestamp: 0,
    // 登录方式: 'qr' | 'captcha' | 'password'
    loginMethod: '',
    // 用户基本信息
    userInfo: {
      userId: 0,
      nickname: '',
      avatarUrl: '',
      signature: '',
      gender: 0,
      birthday: 0,
      province: 0,
      city: 0,
      vipType: 0,
      userType: 0,
      authStatus: 0,
      accountStatus: 0,
      followeds: 0,
      follows: 0,
      playlistCount: 0
    },
    // 账户信息
    accountInfo: {
      id: 0,
      userName: '',
      type: 0,
      status: 0,
      whitelistAuthority: 0,
      createTime: 0,
      tokenVersion: 0,
      ban: 0,
      // 重点字段：包月版本
      baoyueVersion: 0,
      donateVersion: 0,
      vipType: 0,
      viptypeVersion: 0,
      anonimousUser: false,
      uninitialized: false
    },
    // 登录token
    token: '',
    // 完整的登录响应数据（用于调试）
    loginResponse: null,
    // 绑定信息
    bindings: [],
    // Cookie
    cookie: '',
    // 创建的歌单
    createdPlaylists: [],
    // 收藏的歌单
    collectedPlaylists: [],
    // 最近播放的歌曲
    recentSongs: []
  }),

  // 计算属性
  getters: {
    // 是否为VIP用户
    isVip: (state) => {
      return state.userInfo.vipType === 11 || state.userInfo.vipType === 10
    },
    
    // 是否登录
    isLogin: (state) => {
      return state.isLoggedIn && state.userInfo.userId > 0
    },
    
    // 用户显示名称
    displayName: (state) => {
      return state.userInfo.nickname || state.accountInfo.userName || '网易云用户'
    },
    
    // 用户头像
    avatar: (state) => {
      return state.userInfo.avatarUrl || '/static/default-avatar.png'
    },
    
    // 包月版本信息
    baoyueVersion: (state) => {
      return state.accountInfo.baoyueVersion
    }
  },

  // 动作
  actions: {
    /**
     * 设置登录状态 - 核心方法
     * @param {Object} loginData - 登录接口返回的完整数据
     */
    async setLoginState(loginData) {
      try {
        console.log('[UserStore] 设置登录状态，原始数据:', loginData)
        
        // 保存完整响应数据
        this.loginResponse = loginData
        
        // 处理不同登录方式的数据结构
        let profile = null
        let account = null
        let token = ''
        let bindings = []
        let cookie = ''
        
        // 扫码登录的数据结构
        if (loginData.code === 803 && loginData.profile) {
          profile = loginData.profile
          // 扫码登录时，cookie在响应体中
          cookie = loginData.cookie || ''
          console.log('[UserStore] 识别为扫码登录数据，profile:', profile, 'cookie:', cookie)
        }
        // 手机号登录/验证码登录的数据结构
        else if (loginData.code === 200 && loginData.profile) {
          profile = loginData.profile
          account = loginData.account
          token = loginData.token || ''
          bindings = loginData.bindings || []
          // cookie可能在响应体中，也可能在request.js中处理
          cookie = loginData.cookie || uni.getStorageSync('cookie') || ''
        }
        // getLoginStatus接口的数据结构
        else if (loginData.data?.code === 200 && loginData.data?.profile) {
          profile = loginData.data.profile
          account = loginData.data.account
          token = loginData.data.token || ''
          bindings = loginData.data.bindings || []
          cookie = loginData.data.cookie || uni.getStorageSync('cookie') || ''
        }
        
        if (!profile) {
          console.error('[UserStore] 无法解析用户信息')
          throw new Error('登录数据格式错误')
        }
        
        // 更新用户基本信息
        this.updateUserInfo(profile)
        
        // 更新账户信息（重点保存 baoyueVersion）
        if (account) {
          this.updateAccountInfo(account)
        }
        
        // 保存token
        if (token) {
          this.token = token
          uni.setStorageSync('token', token)
        }
        
        // 保存绑定信息
        if (bindings.length > 0) {
          this.bindings = bindings
          uni.setStorageSync('bindings', JSON.stringify(bindings))
        }
        
        // 保存 cookie
        if (cookie) {
          // 提取 MUSIC_U 部分
          let cookieValue = cookie
          if (cookie.includes('MUSIC_U=')) {
            const match = cookie.match(/MUSIC_U=[^;]+/)
            if (match) {
              cookieValue = match[0]
            }
          }
                  
          this.cookie = cookieValue
          uni.setStorageSync('cookie', cookieValue)
          console.log('[UserStore] Cookie 已保存:', cookieValue.substring(0, 50) + '...')
        }
        
        // 设置登录状态
        this.isLoggedIn = true
        this.loginTimestamp = Date.now()
        this.loginMethod = loginData.loginMethod || 'unknown'
        
        // 持久化存储关键信息
        this.persistLoginState()
        
        console.log('[UserStore] 登录状态设置成功')
        console.log('[UserStore] 用户信息:', this.userInfo)
        console.log('[UserStore] 账户信息:', this.accountInfo)
        console.log('[UserStore] 包月版本:', this.accountInfo.baoyueVersion)
        console.log('[UserStore] 完整状态:', {
          isLoggedIn: this.isLoggedIn,
          userId: this.userInfo.userId,
          baoyueVersion: this.accountInfo.baoyueVersion,
          nickname: this.userInfo.nickname
        })
        
        return true
      } catch (error) {
        console.error('[UserStore] 设置登录状态失败:', error)
        this.clearLoginState()
        throw error
      }
    },
    
    /**
     * 更新用户基本信息
     */
    updateUserInfo(profile) {
      this.userInfo = {
        userId: profile.userId || profile.id || 0,
        nickname: profile.nickname || '',
        avatarUrl: profile.avatarUrl || '',
        signature: profile.signature || '',
        gender: profile.gender || 0,
        birthday: profile.birthday || 0,
        province: profile.province || 0,
        city: profile.city || 0,
        vipType: profile.vipType || 0,
        userType: profile.userType || 0,
        authStatus: profile.authStatus || 0,
        accountStatus: profile.accountStatus || 0,
        followeds: profile.followeds || 0,
        follows: profile.follows || 0,
        playlistCount: profile.playlistCount || 0
      }
      
      // 持久化用户信息
      uni.setStorageSync('userInfo', JSON.stringify(this.userInfo))
      console.log('[UserStore] 用户信息已更新:', this.userInfo)
    },
    
    /**
     * 更新账户信息（重点保存 baoyueVersion）
     */
    updateAccountInfo(account) {
      this.accountInfo = {
        id: account.id || 0,
        userName: account.userName || '',
        type: account.type || 0,
        status: account.status || 0,
        whitelistAuthority: account.whitelistAuthority || 0,
        createTime: account.createTime || 0,
        tokenVersion: account.tokenVersion || 0,
        ban: account.ban || 0,
        // 重点字段：包月版本，必须保存
        baoyueVersion: account.baoyueVersion !== undefined ? account.baoyueVersion : -2,
        donateVersion: account.donateVersion || 0,
        vipType: account.vipType || 0,
        viptypeVersion: account.viptypeVersion || 0,
        anonimousUser: account.anonimousUser || false,
        uninitialized: account.uninitialized || false
      }
      
      // 持久化账户信息
      uni.setStorageSync('accountInfo', JSON.stringify(this.accountInfo))
      console.log('[UserStore] 账户信息已更新，baoyueVersion:', this.accountInfo.baoyueVersion)
    },
    
    /**
     * 持久化登录状态
     */
    persistLoginState() {
      try {
        uni.setStorageSync('isLoggedIn', this.isLoggedIn)
        uni.setStorageSync('loginTimestamp', this.loginTimestamp)
        uni.setStorageSync('loginMethod', this.loginMethod)
        
        console.log('[UserStore] 登录状态已持久化')
      } catch (error) {
        console.error('[UserStore] 持久化登录状态失败:', error)
      }
    },
    
    /**
     * 从本地存储恢复登录状态
     */
    async restoreLoginState() {
      try {
        console.log('[UserStore] 尝试从本地存储恢复登录状态')
        
        // 恢复基本状态
        this.isLoggedIn = uni.getStorageSync('isLoggedIn') || false
        this.loginTimestamp = uni.getStorageSync('loginTimestamp') || 0
        this.loginMethod = uni.getStorageSync('loginMethod') || ''
        
        // 恢复用户信息
        const userInfoStr = uni.getStorageSync('userInfo')
        if (userInfoStr) {
          this.userInfo = JSON.parse(userInfoStr)
        }
        
        // 恢复账户信息（包含 baoyueVersion）
        const accountInfoStr = uni.getStorageSync('accountInfo')
        if (accountInfoStr) {
          this.accountInfo = JSON.parse(accountInfoStr)
          console.log('[UserStore] 恢复账户信息，baoyueVersion:', this.accountInfo.baoyueVersion)
        }
        
        // 恢复token
        this.token = uni.getStorageSync('token') || ''
        
        // 恢复绑定信息
        const bindingsStr = uni.getStorageSync('bindings')
        if (bindingsStr) {
          this.bindings = JSON.parse(bindingsStr)
        }
        
        // 恢复cookie
        this.cookie = uni.getStorageSync('cookie') || ''
        
        // 如果标记为已登录，验证登录状态是否仍然有效
        if (this.isLoggedIn && this.userInfo.userId > 0) {
          const isValid = await this.validateLoginStatus()
          if (!isValid) {
            this.clearLoginState()
            return false
          }
        }
        
        console.log('[UserStore] 登录状态恢复完成，当前状态:', this.isLogin)
        return this.isLogin
      } catch (error) {
        console.error('[UserStore] 恢复登录状态失败:', error)
        this.clearLoginState()
        return false
      }
    },
    
    /**
     * 验证登录状态是否有效
     * 说明：为了提升用户体验，采用永久登录策略
     * 只有在接口调用明确返回登录失效时才会清除登录状态
     */
    async validateLoginStatus() {
      try {
        console.log('[UserStore] 验证登录状态有效性（永久登录模式）')
            
        // 不再检查登录时间，采用永久登录策略
        // 只有当 API 请求明确返回登录失效时才会触发重新登录
            
        // 调用接口验证登录状态
        const res = await getLoginStatus()
        if (res.data?.code === 200 && res.data?.profile?.userId) {
          // 更新用户信息
          await this.setLoginState(res)
          console.log('[UserStore] 登录状态验证通过')
          return true
        } else {
          console.log('[UserStore] 登录状态已失效')
          return false
        }
      } catch (error) {
        console.error('[UserStore] 验证登录状态失败:', error)
        // 网络错误等情况不直接判定为登录失效
        // 可以在后续 API 请求中继续尝试验证
        return true
      }
    },
    
    /**
     * 清除登录状态
     */
    clearLoginState() {
      console.log('[UserStore] 清除登录状态')
      
      // 清除状态
      this.isLoggedIn = false
      this.loginTimestamp = 0
      this.loginMethod = ''
      this.userInfo = {
        userId: 0,
        nickname: '',
        avatarUrl: '',
        signature: '',
        gender: 0,
        birthday: 0,
        province: 0,
        city: 0,
        vipType: 0,
        userType: 0,
        authStatus: 0,
        accountStatus: 0,
        followeds: 0,
        follows: 0,
        playlistCount: 0
      }
      this.accountInfo = {
        id: 0,
        userName: '',
        type: 0,
        status: 0,
        whitelistAuthority: 0,
        createTime: 0,
        tokenVersion: 0,
        ban: 0,
        baoyueVersion: -2,
        donateVersion: 0,
        vipType: 0,
        viptypeVersion: 0,
        anonimousUser: false,
        uninitialized: false
      }
      this.token = ''
      this.loginResponse = null
      this.bindings = []
      this.cookie = ''
      
      // 清除本地存储
      const keys = [
        'isLoggedIn',
        'loginTimestamp',
        'loginMethod',
        'userInfo',
        'accountInfo',
        'token',
        'bindings',
        'cookie'
      ]
      
      keys.forEach(key => {
        try {
          uni.removeStorageSync(key)
        } catch (error) {
          console.error(`[UserStore] 清除本地存储失败: ${key}`, error)
        }
      })
      
      console.log('[UserStore] 登录状态已清除')
    },
    
    /**
     * 退出登录
     */
    async logout() {
      try {
        console.log('[UserStore] 用户退出登录')
        
        // 清除登录状态
        this.clearLoginState()
        
        // 显示提示
        uni.showToast({
          title: '已退出登录',
          icon: 'success'
        })
        
        return true
      } catch (error) {
        console.error('[UserStore] 退出登录失败:', error)
        uni.showToast({
          title: '退出失败',
          icon: 'none'
        })
        return false
      }
    },
    
    /**
     * 手机号密码登录
     * @param {string} phone - 手机号
     * @param {string} password - 密码
     * @param {string} countrycode - 国家码，默认86
     */
    async loginByPassword(phone, password, countrycode = '86') {
      try {
        console.log('[UserStore] 手机号密码登录:', phone)
        
        uni.showLoading({ title: '登录中...' })
        
        const res = await loginByPhone(phone, password, countrycode)
        
        uni.hideLoading()
        
        if (res.code === 200) {
          // 标记登录方式
          res.loginMethod = 'password'
          await this.setLoginState(res)
          
          uni.showToast({
            title: '登录成功',
            icon: 'success'
          })
          
          return true
        } else {
          const errorMsg = res.message || res.msg || '登录失败'
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          })
          return false
        }
      } catch (error) {
        uni.hideLoading()
        console.error('[UserStore] 手机号密码登录失败:', error)
        const errorMsg = error?.data?.message || error?.message || '登录失败'
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        })
        return false
      }
    },
    
    /**
     * 手机号验证码登录
     * @param {string} phone - 手机号
     * @param {string} captcha - 验证码
     * @param {string} countrycode - 国家码，默认86
     */
    async loginByCaptcha(phone, captcha, countrycode = '86') {
      try {
        console.log('[UserStore] 手机号验证码登录:', phone)
        
        uni.showLoading({ title: '登录中...' })
        
        const res = await loginByCaptcha(phone, captcha, countrycode)
        
        uni.hideLoading()
        
        if (res.code === 200) {
          // 标记登录方式
          res.loginMethod = 'captcha'
          await this.setLoginState(res)
          
          uni.showToast({
            title: '登录成功',
            icon: 'success'
          })
          
          return true
        } else {
          const errorMsg = res.message || res.msg || '登录失败'
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          })
          return false
        }
      } catch (error) {
        uni.hideLoading()
        console.error('[UserStore] 手机号验证码登录失败:', error)
        const errorMsg = error?.data?.message || error?.message || '登录失败'
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        })
        return false
      }
    },
    
    /**
     * 发送验证码
     * @param {string} phone - 手机号
     * @param {string} countrycode - 国家码，默认86
     */
    async sendCaptchaCode(phone, countrycode = '86') {
      try {
        console.log('[UserStore] 发送验证码:', phone)
        
        uni.showLoading({ title: '发送中...' })
        
        const res = await sendCaptcha(phone, countrycode)
        
        uni.hideLoading()
        
        if (res.code === 200) {
          uni.showToast({
            title: '验证码已发送',
            icon: 'success'
          })
          return true
        } else {
          const errorMsg = res.message || res.msg || '发送失败'
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          })
          return false
        }
      } catch (error) {
        uni.hideLoading()
        console.error('[UserStore] 发送验证码失败:', error)
        const errorMsg = error?.data?.message || error?.message || '发送失败'
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        })
        return false
      }
    },
    
    /**
     * 扫码登录（由登录页面处理，这里提供状态检查）
     */
    async handleQrLogin(loginData) {
      try {
        console.log('[UserStore] 处理扫码登录')
        
        // 标记登录方式
        loginData.loginMethod = 'qr'
        await this.setLoginState(loginData)
        
        uni.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        return true
      } catch (error) {
        console.error('[UserStore] 扫码登录处理失败:', error)
        uni.showToast({
          title: '登录失败',
          icon: 'none'
        })
        return false
      }
    },
    
    /**
     * 获取二维码key
     */
    async getQrKey() {
      try {
        console.log('[UserStore] 获取二维码key')
        return await getQrKey()
      } catch (error) {
        console.error('[UserStore] 获取二维码key失败:', error)
        throw error
      }
    },
    
    /**
     * 生成二维码
     */
    async getQrCreate(key) {
      try {
        console.log('[UserStore] 生成二维码')
        return await getQrCreate(key)
      } catch (error) {
        console.error('[UserStore] 生成二维码失败:', error)
        throw error
      }
    },
    
    /**
     * 检查二维码状态
     */
    async checkQrStatus(key) {
      try {
        console.log('[UserStore] 检查二维码状态')
        return await checkQrStatus(key)
      } catch (error) {
        console.error('[UserStore] 检查二维码状态失败:', error)
        throw error
      }
    },
    
    /**
     * 获取用户信息（用于刷新）
     */
    async fetchUserInfo() {
      try {
        console.log('[UserStore] 获取用户信息')
        
        const res = await getLoginStatus()
        
        if (res.data?.code === 200 && res.data?.profile) {
          await this.setLoginState(res)
          return true
        }
        
        return false
      } catch (error) {
        console.error('[UserStore] 获取用户信息失败:', error)
        return false
      }
    },
    
    /**
     * 获取用户歌单
     */
    async fetchUserPlaylists() {
      try {
        console.log('[UserStore] 获取用户歌单')
        
        if (!this.isLogin || !this.userInfo.userId) {
          console.warn('[UserStore] 用户未登录，无法获取歌单')
          // 确保即使未登录也有默认空数组
          this.createdPlaylists = []
          this.collectedPlaylists = []
          return null
        }
        
        const { getUserPlaylist } = await import('@/utils/api.js')
        const res = await getUserPlaylist(this.userInfo.userId)
        
        if (res.code === 200) {
          // 分离创建的歌单和收藏的歌单
          const playlists = res.playlist || []
          const created = playlists.filter(item => item && item.creator && item.creator.userId === this.userInfo.userId)
          const collected = playlists.filter(item => item && item.creator && item.creator.userId !== this.userInfo.userId)
          
          // 更新状态
          this.createdPlaylists = created || []
          this.collectedPlaylists = collected || []
          
          console.log('[UserStore] 用户歌单获取成功，创建:', created.length, '个，收藏:', collected.length, '个')
          return { created, collected }
        } else {
          console.error('[UserStore] 获取用户歌单失败:', res)
          // 确保失败时也有默认空数组
          this.createdPlaylists = []
          this.collectedPlaylists = []
          return null
        }
      } catch (error) {
        console.error('[UserStore] 获取用户歌单异常:', error)
        // 确保异常时也有默认空数组
        this.createdPlaylists = []
        this.collectedPlaylists = []
        return null
      }
    },
    
    /**
     * 获取用户播放记录
     */
    async fetchRecentSongs() {
      try {
        console.log('[UserStore] 获取用户播放记录')
        
        if (!this.isLogin || !this.userInfo.userId) {
          console.warn('[UserStore] 用户未登录，无法获取播放记录')
          // 确保即使未登录也有默认空数组
          this.recentSongs = []
          return null
        }
        
        const { getUserRecord } = await import('@/utils/api.js')
        // 获取最近一周的播放记录
        const res = await getUserRecord(this.userInfo.userId, 1)
        
        if (res.code === 200) {
          let recentSongs = []
          
          // 根据不同的返回格式处理数据
          if (res.weekData) {
            // 如果是周数据格式
            recentSongs = res.weekData.map(item => item?.song).filter(song => song && song.id)
          } else if (res.allData) {
            // 如果是全部数据格式
            recentSongs = res.allData.map(item => item?.song).filter(song => song && song.id)
          } else if (Array.isArray(res)) {
            // 如果直接返回数组
            recentSongs = res.filter(song => song && song.id)
          }
          
          // 过滤无效数据
          recentSongs = recentSongs.filter(song => song && song.id)
          
          // 更新状态
          this.recentSongs = recentSongs.slice(0, 10) || [] // 只保留前10首
        
          console.log('[UserStore] 用户播放记录获取成功，共', recentSongs.length, '首')
          return recentSongs
        } else {
          console.error('[UserStore] 获取用户播放记录失败:', res)
          // 确保失败时也有默认空数组
          this.recentSongs = []
          return null
        }
      } catch (error) {
        console.error('[UserStore] 获取用户播放记录异常:', error)
        // 确保异常时也有默认空数组
        this.recentSongs = []
        return null
      }
    },
    
    /**
     * 获取所有用户数据（歌单和播放记录）
     */
    async fetchAllUserData() {
      try {
        console.log('[UserStore] 获取所有用户数据')
        
        // 并行获取歌单和播放记录
        const [playlistsResult, recordsResult] = await Promise.allSettled([
          this.fetchUserPlaylists(),
          this.fetchRecentSongs()
        ])
        
        const result = {
          playlists: playlistsResult.status === 'fulfilled' ? playlistsResult.value : null,
          records: recordsResult.status === 'fulfilled' ? recordsResult.value : null
        }
        
        console.log('[UserStore] 所有用户数据获取完成:', result)
        return result
      } catch (error) {
        console.error('[UserStore] 获取所有用户数据异常:', error)
        return null
      }
    },
    
    /**
     * 刷新用户数据
     */
    async refreshUserData() {
      try {
        console.log('[UserStore] 刷新用户数据')
        
        // 先获取最新用户信息
        await this.fetchUserInfo()
        
        // 然后获取用户数据
        const result = await this.fetchAllUserData()
        
        return result
      } catch (error) {
        console.error('[UserStore] 刷新用户数据异常:', error)
        return null
      }
    }
  }
})

// 导出store实例创建函数
export default useUserStore