/**
 * 网络请求封装
 */
import config from './config.js'

// 请求拦截器
const requestInterceptor = (options) => {
	// 添加基础 URL
	if (!options.url.startsWith('http')) {
		options.url = config.baseUrl + options.url
	}
	
	// 添加请求头
	options.header = {
		...config.header,
		...options.header
	}
	
	// 添加超时时间
	options.timeout = options.timeout || config.timeout
	
	// 获取本地存储的 cookie
	const cookie = uni.getStorageSync('cookie')
	if (cookie) {
		// console.log('[Request] 本地 Cookie:', cookie.substring(0, 100) + '...')
		
		// 确保 cookie 是 MUSIC_U=xxx 格式
		let cookieValue = cookie
		if (!cookie.includes('MUSIC_U=')) {
			cookieValue = `MUSIC_U=${cookie}`
		}
		
		const encodedCookie = encodeURIComponent(cookieValue)
		
		// 对于 GET 请求，将 cookie 和 realIP 添加到 URL 中
		if (options.method === 'GET') {
			options.url += `${options.url.includes('?') ? '&' : '?'}cookie=${encodedCookie}`
			if (config.realIP) {
				options.url += `&realIP=${config.realIP}`
			}
			// console.log('[Request] Cookie 和 realIP 已添加到 URL')
		} 
		// 对于 POST 请求，添加到 data 中
		else {
			if (!options.data) {
				options.data = {}
			}
			options.data.cookie = encodedCookie
			if (config.realIP && !options.data.realIP) {
				options.data.realIP = config.realIP
			}
			// console.log('[Request] Cookie 和 realIP 通过 data 传递')
		}
	}
	
	return options
}

// 响应拦截器
const responseInterceptor = (response) => {
	const { statusCode, data } = response
	
	if (statusCode === 200) {
		// 保存 cookie - 优先从响应体中获取（网易云 API 的登录接口会返回 cookie 字段）
		if (data && data.cookie) {
			// 提取 MUSIC_U 部分
			let cookieValue = data.cookie
			if (cookieValue.includes('MUSIC_U=')) {
				const match = cookieValue.match(/MUSIC_U=[^;]+/)
				if (match) {
					cookieValue = match[0]
				}
			}
			uni.setStorageSync('cookie', cookieValue)
			// console.log('[Request] Cookie 已保存（从 body）:', cookieValue.substring(0, 50) + '...')
		}
		// 其次从响应头中获取
		else if (response.cookies && response.cookies.length) {
			const cookieStr = response.cookies.join('; ')
			// 提取 MUSIC_U 部分
			const match = cookieStr.match(/MUSIC_U=[^;]+/)
			if (match) {
				uni.setStorageSync('cookie', match[0])
				// console.log('[Request] Cookie 已保存（从 header）:', match[0].substring(0, 50) + '...')
			}
		}
		return data
	} else {
		return Promise.reject({
			code: statusCode,
			message: data.message || '请求失败'
		})
	}
}

// 封装请求方法
const request = (options) => {
	options = requestInterceptor(options)
	
	// console.log('=== 请求参数 ===')
	// console.log('最终options:', options)
	// console.log('=== 请求参数结束 ===')
	
	return new Promise((resolve, reject) => {
		uni.request({
			...options,
			success: (res) => {
				try {
					const data = responseInterceptor(res)
					resolve(data)
				} catch (error) {
					reject(error)
				}
			},
			fail: (error) => {
				reject({
					code: -1,
					message: error.errMsg || '网络请求失败'
				})
			}
		})
	})
}

// GET 请求
export const get = (url, params = {}) => {
	let fullUrl = url;

	if (params._rawQuery !== undefined) {
		const rawQuery = params._rawQuery;
		delete params._rawQuery;
		fullUrl = rawQuery ? `${url}?${rawQuery}` : url;
	} else {
		const queryString = Object.keys(params).map(key =>
			`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
		).join('&');
		fullUrl = queryString ? `${url}?${queryString}` : url;
	}

	// console.log('GET 请求完整 URL:', fullUrl);

	return request({ url: fullUrl, method: 'GET' });
};

// POST请求
export const post = (url, data = {}) => {
	// console.log('POST请求URL:', url)
	// console.log('数据:', data)
	
	return request({
		url,
		method: 'POST',
		data
	})
}

export default {
	get,
	post,
	request
}
