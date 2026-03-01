// API基础配置
const config = {
	// 后端API地址
	// 本地环境
	// baseUrl: 'http://localhost:3000',
	// 线上环境
	baseUrl: 'https://miraitowa.cloud/netease-cloud-music-api/',
	
	// 请求超时时间
	timeout: 15000,
	
	// 请求头
	header: {
		'Content-Type': 'application/json'
	}
}

export default config
