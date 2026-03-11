/**
 * 网易云音乐API服务
 * 基于 NeteaseCloudMusicApi Enhanced
 */
import { get, post } from './request.js'

// ==================== 首页相关接口 ====================

/**
 * 获取轮播图
 * @param {Number} type - 资源类型 0:PC 1:Android 2:iPhone 3:iPad
 */
export const getBanner = (type = 0) => {
	return get('/banner', { type })
}

/**
 * 获取推荐歌单
 * @param {Number} limit - 返回数量
 */
export const getPersonalized = (limit = 30) => {
	return get('/personalized', { limit })
}

/**
 * 获取每日推荐歌曲（需登录）
 */
export const getRecommendSongs = () => {
	return get('/recommend/songs')
}

/**
 * 获取每日推荐歌单（需登录）
 */
export const getRecommendResource = () => {
	return get('/recommend/resource')
}

/**
 * 获取新歌速递
 * @param {Number} type - 地区类型 0:全部 7:华语 96:欧美 8:日本 16:韩国
 */
export const getNewSongs = (type = 0) => {
	return get('/top/song', { type })
}

/**
 * 获取热门歌单分类
 */
export const getHotPlaylistCategory = () => {
	return get('/playlist/hot')
}

// ==================== 漫游/私人FM相关接口 ====================

/**
 * 获取私人FM
 */
export const getPersonalFm = () => {
	return get('/personal_fm')
}

/**
 * 获取推荐电台
 */
export const getRecommendDjprogram = () => {
	return get('/personalized/djprogram')
}

/**
 * 获取推荐新音乐
 */
export const getRecommendNewSong = (limit = 10) => {
	return get('/personalized/newsong', { limit })
}

// ==================== 用户相关接口 ====================

import md5 from './md5.js'

/**
 * 发送验证码
 * @param {String} phone - 手机号
 * @param {String} ctcode - 国家区号，默认86
 */
export const sendCaptcha = (phone, ctcode = '86') => {
	return post('/captcha/sent', { phone, ctcode })
}

/**
 * 手机号登录(密码)
 * 使用md5加密密码，避免明文传输
 * @param {String} phone - 手机号
 * @param {String} password - 密码
 * @param {String} countrycode - 国家码，默认86(中国)
 */
export const loginByPhone = (phone, password, countrycode = '86') => {
	const md5Password = md5(password)
	return post('/login/cellphone', { phone, md5_password: md5Password, countrycode })
}

/**
 * 手机号登录(验证码)
 * @param {String} phone - 手机号
 * @param {String} captcha - 验证码
 * @param {String} countrycode - 国家码，默认86(中国)
 */
export const loginByCaptcha = (phone, captcha, countrycode = '86') => {
	return post('/login/cellphone', { phone, captcha, countrycode })
}

/**
 * 二维码登录 - 生成key
 */
export const getQrKey = () => {
	return get('/login/qr/key', { timestamp: Date.now() })
}

/**
 * 二维码登录 - 生成二维码
 */
export const getQrCreate = (key) => {
	return get('/login/qr/create', { key, qrimg: true, timestamp: Date.now() })
}

/**
 * 二维码登录 - 检查扫码状态
 */
export const checkQrStatus = (key) => {
	return get('/login/qr/check', { key, timestamp: Date.now() })
}

/**
 * 获取登录状态
 * 使用POST请求确保cookie参数正确传递
 */
export const getLoginStatus = () => {
	return post('/login/status', { timestamp: Date.now() })
}

/**
 * 退出登录
 */
export const logout = () => {
	return post('/logout')
}

/**
 * 获取用户详情
 */
export const getUserDetail = (uid) => {
	return get('/user/detail', { uid })
}

/**
 * 获取用户歌单
 */
export const getUserPlaylist = (uid, limit = 30, offset = 0) => {
	return get('/user/playlist', { uid, limit, offset })
}

/**
 * 获取用户播放记录
 * @param {Number} type - 1:最近一周 0:所有时间
 */
export const getUserRecord = (uid, type = 1) => {
	return get('/user/record', { uid, type })
}

// ==================== 歌单相关接口 ====================

/**
 * 获取歌单详情
 */
export const getPlaylistDetail = (id) => {
	return get('/playlist/detail', { id })
}

/**
 * 获取歌单所有歌曲
 */
export const getPlaylistTrackAll = (id, limit = 20, offset = 0) => {
	return get('/playlist/track/all', { id, limit, offset })
}

/**
 * 获取精品歌单
 */
export const getTopPlaylist = (cat = '全部', limit = 20, before) => {
	return get('/top/playlist/highquality', { cat, limit, before })
}

/**
 * 获取专辑动态信息
 * @param {Number} id - 专辑 id
 */
export const getAlbumDetailDynamic = (id) => {
	return get('/album/detail/dynamic', { id })
}

/**
 * 收藏/取消收藏专辑
 * @param {Number} id - 专辑 id
 * @param {Number} t - 1 为收藏，其他为取消收藏
 */
export const toggleAlbumSub = (id, t = 1) => {
	return get('/album/sub', { id, t })
}

/**
 * 获取专辑简要百科信息
 * @param {Number} id - 专辑 id
 */
export const getUgcAlbum = (id) => {
	return get('/ugc/album/get', { id })
}

/**
 * 获取专辑评论
 * @param {Number} id - 专辑 id
 * @param {Number} limit - 评论数量，默认 20
 * @param {Number} offset - 偏移量，默认 0
 */
export const getAlbumComment = (id, limit = 20, offset = 0) => {
	return get('/comment/album', { id, limit, offset })
}

/**
 * 新版评论接口
 * @param {Object} params - 请求参数
 * @param {Number} params.id - 资源 id
 * @param {Number} params.type - 资源类型（0:歌曲 1:MV 2:歌单 3:专辑 4:电台节目 5:视频 6:动态 7:电台）
 * @param {Number} params.pageNo - 页码，默认 1
 * @param {Number} params.pageSize - 每页数量，默认 20
 * @param {Number} params.sortType - 排序方式（1:推荐 2:热度 3:时间）
 * @param {Number} params.cursor - 分页游标
 */
export const getNewComment = (params) => {
	const { id, type = 3, pageNo = 1, pageSize = 20, sortType = 1, cursor = null } = params
	const queryParams = { id, type, pageNo, pageSize, sortType }
	if (cursor) queryParams.cursor = cursor
	return get('/comment/new', queryParams)
}

/**
 * 楼层评论接口
 * @param {Object} params - 请求参数
 * @param {Number} params.parentCommentId - 父评论 ID
 * @param {Number} params.id - 资源 id
 * @param {Number} params.type - 资源类型（0:歌曲 1:MV 2:歌单 3:专辑 4:电台节目 5:视频 6:动态 7:电台）
 * @param {Number} params.limit - 取出评论数量，默认 20
 * @param {Number} params.time - 分页参数，取上一页最后一项的 time
 */
export const getFloorComment = (params) => {
	const { parentCommentId, id, type = 3, limit = 20, time = null } = params
	const queryParams = { parentCommentId, id, type, limit }
	if (time) queryParams.time = time
	return get('/comment/floor', queryParams)
}

/**
 * 给评论点赞
 * @param {Number} id - 资源 id
 * @param {Number} cid - 评论 id
 * @param {Number} t - 是否点赞（1:点赞，0:取消点赞）
 * @param {Number} type - 资源类型（0:歌曲 1:MV 2:歌单 3:专辑 4:电台节目 5:视频 6:动态 7:电台）
 */
export const likeComment = (id, cid, t = 1, type = 3) => {
	return get('/comment/like', { id, cid, t, type })
}

// ==================== 专辑相关接口 ====================

/**
 * 获取专辑详情
 * @param {Number} id - 专辑 id
 */
export const getAlbum = (id) => {
	return get('/album', { id })
}

/**
 * 获取专辑所有歌曲
 * @param {Number} id - 专辑 id
 */
export const getAlbumSongs = (id) => {
	return get('/album/track/all', { id })
}

// ==================== 电台(DJ)相关接口 ====================

/**
 * 获取电台详情
 * @param {Number} rid - 电台id
 */
export const getDjRadio = (rid) => {
	return get('/dj/radio', { id: rid })
}

/**
 * 获取电台节目列表
 * @param {Number} rid - 电台id
 * @param {Number} limit - 限制数量
 * @param {Number} offset - 偏移量
 */
export const getDjProgram = (rid, limit = 100, offset = 0) => {
	return get('/dj/program', { radioId: rid, limit, offset })
}

// ==================== 歌曲相关接口 ====================

/**
 * 获取歌曲详情
 */
export const getSongDetail = (ids) => {
	return get('/song/detail', { ids: Array.isArray(ids) ? ids.join(',') : ids })
}

/**
 * 获取歌曲URL
 */
export const getSongUrl = (id, level = 'standard') => {
	return get('/song/url/v1', { id, level })
}

/**
 * 获取歌词
 */
export const getLyric = (id) => {
	return get('/lyric', { id })
}

/**
 * 获取歌曲红心数量
 * @param {Number} id - 歌曲 id
 */
export const getSongRedCount = (id) => {
	return get('/song/red/count', { id })
}

/**
 * 喜欢音乐
 * @param {Number} id - 歌曲 id
 * @param {Boolean} like - true: 喜欢，false: 取消喜欢，默认 true
 */
export const toggleSongLike = (id, like = true) => {
	return get('/like', { id, like })
}

/**
 * 检查歌曲是否被喜爱
 * @param {Array|Number} ids - 歌曲 id 或 id 数组
 */
export const checkSongLike = (ids) => {
	// 如果是单个数字，转为数组
	const idsArray = Array.isArray(ids) ? ids : [ids]
	return get('/song/like/check', { ids: JSON.stringify(idsArray) })
}

// ==================== 搜索相关接口 ====================

/**
 * 搜索
 * @param {String} keywords - 关键词
 * @param {Number} type - 1:单曲 10:专辑 100:歌手 1000:歌单 1002:用户
 */
export const search = (keywords, type = 1, limit = 30, offset = 0) => {
	return get('/search', { keywords, type, limit, offset })
}

/**
 * 获取默认搜索关键词
 */
export const getSearchDefault = () => {
	return get('/search/default')
}

/**
 * 获取热搜列表
 */
export const getSearchHot = () => {
	return get('/search/hot/detail')
}

/**
 * 获取搜索建议
 */
export const getSearchSuggest = (keywords) => {
	return get('/search/suggest', { keywords })
}

// ==================== 排行榜相关接口 ====================

/**
 * 获取所有榜单
 */
export const getToplistDetail = () => {
	return get('/toplist/detail')
}

/**
 * 获取榜单内容
 */
export const getToplist = (id) => {
	return get('/playlist/detail', { id })
}

// ==================== 社区/动态相关接口 ====================

/**
 * 获取动态消息
 */
export const getEvent = (pagesize = 20, lasttime = -1) => {
	return get('/event', { pagesize, lasttime })
}

/**
 * 获取热门话题
 */
export const getHotTopic = (limit = 20, offset = 0) => {
	return get('/hot/topic', { limit, offset })
}

/**
 * 获取云村热评
 */
export const getHotComment = () => {
	return get('/comment/hotwall/list')
}

// ==================== 评论相关接口 ====================

/**
 * 获取歌曲评论
 */
export const getSongComment = (id, limit = 20, offset = 0) => {
	return get('/comment/music', { id, limit, offset })
}

/**
 * 获取歌单评论
 */
export const getPlaylistComment = (id, limit = 20, offset = 0) => {
	return get('/comment/playlist', { id, limit, offset })
}

// ==================== 视频相关接口 ====================

/**
 * 获取视频播放地址
 * @param {Number} id - 视频id
 */
export const getVideoUrl = (id) => {
	return get('/video/url', { id })
}

/**
 * 获取视频详情信息（点赞、转发、评论数）
 * @param {Number} vid - 视频id
 */
export const getVideoDetailInfo = (vid) => {
	return get('/video/detail/info', { vid })
}

/**
 * 资源点赞（MV、电台、视频）
 * @param {Number} type - 资源类型（0:歌曲 1:MV 2:歌单 3:专辑 4:电台节目 5:视频 6:动态 7:电台）
 * @param {Number} t - 操作类型（1:点赞，其他:取消点赞）
 * @param {Number} id - 资源id
 */
export const toggleResourceLike = (type, t, id) => {
	return get('/resource/like', { type, t, id })
}

/**
 * 获取视频评论
 * @param {Number} id - 资源id
 * @param {Number} type - 资源类型（0:歌曲 1:MV 2:歌单 3:专辑 4:电台 5:视频 6:动态）
 * @param {Number} pageNo - 页码
 * @param {Number} pageSize - 每页数量
 */
export const getVideoComments = (id, type = 5, pageNo = 1, pageSize = 20) => {
	return get('/comment/new', { id, type, pageNo, pageSize })
}

/**
 * 发送/回复评论
 * @param {Number} t - 操作类型（1:发送，2:回复）
 * @param {Number} type - 资源类型（0:歌曲 1:MV 2:歌单 3:专辑 4:电台 5:视频 6:动态）
 * @param {Number} id - 资源id
 * @param {String} content - 评论内容
 * @param {Number} commentId - 回复的评论id（回复时必填）
 */
export const postNewComment = (t, type, id, content, commentId = null) => {
	const params = { t, type, id, content }
	if (commentId) params.commentId = commentId
	return post('/comment', params)
}

/**
 * 删除评论
 * @param {Number} t - 操作类型（0:删除）
 * @param {Number} type - 资源类型（0:歌曲 1:MV 2:歌单 3:专辑 4:电台节目 5:视频 6:动态 7:电台）
 * @param {Number} id - 资源id
 * @param {Number} commentId - 评论id
 */
export const deleteComment = (t, type, id, commentId) => {
	return get('/comment', { t, type, id, commentId })
}

/**
 * 获取MV评论
 * @param {Number} id - MV id
 * @param {Number} limit - 评论数量，默认20
 * @param {Number} offset - 偏移量，默认0
 * @param {Number} before - 分页参数
 */
export const getMvComments = (id, limit = 20, offset = 0, before = null) => {
	const params = { id, limit, offset }
	if (before) params.before = before
	return get('/comment/mv', params)
}

/**
 * 将Mlog ID转为视频ID
 * @param {String} id - Mlog id
 */
export const convertMlogToVideo = (id) => {
	return get('/mlog/to/video', { id })
}

/**
 * 获取Mlog播放地址
 * @param {String} id - Mlog id
 * @param {Number} res - 分辨率，默认1080
 */
export const getMlogUrl = (id, res = 1080) => {
	return get('/mlog/url', { id, res })
}

/**
 * 获取MV播放地址
 * @param {Number} id - MV id
 * @param {String} r - 分辨率，默认1080
 */
export const getMvUrl = (id, r = '1080') => {
	return get('/mv/url', { id, r })
}

/**
 * 获取MV数据
 * @param {Number} mvid - MV id
 */
export const getMvDetail = (mvid) => {
	return get('/mv/detail', { mvid })
}

/**
 * 获取MV点赞转发评论数数据
 * @param {Number} mvid - MV id
 */
export const getMvDetailInfo = (mvid) => {
	return get('/mv/detail/info', { mvid })
}

/**
 * 获取MV简要百科信息
 * @param {Number} id - MV id
 */
export const getMvWiki = (id) => {
	return get('/ugc/mv/get', { id })
}

// ==================== 歌手相关接口 ====================

/**
 * 获取歌手详情
 * @param {Number} id - 歌手 id
 */
export const getArtistDetail = (id) => {
	return get('/artist/detail', { id })
}

/**
 * 获取歌手描述
 * @param {Number} id - 歌手 id
 */
export const getArtistDesc = (id) => {
	return get('/artist/desc', { id })
}

/**
 * 获取歌手全部歌曲
 * @param {Number} id - 歌手 id
 * @param {String} order - hot: 热门，time: 时间排序
 * @param {Number} limit - 取出数量，默认 50
 * @param {Number} offset - 偏移量，用于分页
 */
export const getArtistSongs = (id, order = 'hot', limit = 50, offset = 0) => {
	return get('/artist/songs', { id, order, limit, offset })
}

/**
 * 获取歌手专辑
 * @param {Number} id - 歌手 id
 * @param {Number} limit - 取出数量，默认 30
 * @param {Number} offset - 偏移量，用于分页
 */
export const getArtistAlbum = (id, limit = 30, offset = 0) => {
	return get('/artist/album', { id, limit, offset })
}

/**
 * 获取歌手 MV
 * @param {Number} id - 歌手 id
 * @param {Number} limit - 取出数量，默认 30
 * @param {Number} offset - 偏移量，用于分页
 */
export const getArtistMv = (id, limit = 30, offset = 0) => {
	return get('/artist/mv', { id, limit, offset })
}

/**
 * 获取歌手粉丝数量
 * @param {Number} id - 歌手 id
 * @param {Number} limit - 取出粉丝数量，默认 20
 * @param {Number} offset - 偏移量，用于分页
 */
export const getArtistFollowCount = (id, limit = 20, offset = 0) => {
	return get('/artist/follow/count', { id, limit, offset })
}

/**
 * 获取歌手简要百科信息
 * @param {Number} id - 歌手 id
 */
export const getUgcArtist = (id) => {
	return get('/ugc/artist/get', { id })
}

/**
 * 获取歌手详情动态
 * @param {Number} id - 歌手 id
 */
export const getArtistDetailDynamic = (id) => {
	return get('/artist/detail/dynamic', { id })
}

export default {
	// 首页
	getBanner,
	getPersonalized,
	getRecommendSongs,
	getRecommendResource,
	getNewSongs,
	getHotPlaylistCategory,
	// 漫游
	getPersonalFm,
	getRecommendDjprogram,
	getRecommendNewSong,
	// 用户
	sendCaptcha,
	loginByPhone,
	loginByCaptcha,
	getQrKey,
	getQrCreate,
	checkQrStatus,
	getLoginStatus,
	logout,
	getUserDetail,
	getUserPlaylist,
	getUserRecord,
	// 歌单
	getPlaylistDetail,
	getPlaylistTrackAll,
	getTopPlaylist,
	// 专辑
	getAlbum,
	getAlbumSongs,
	getAlbumDetailDynamic,
	toggleAlbumSub,
	getUgcAlbum,
	// 电台
	getDjRadio,
	getDjProgram,
	// 歌曲
	getSongDetail,
	getSongUrl,
	getLyric,
	getSongRedCount,
	toggleSongLike,
	checkSongLike,
	// 搜索
	search,
	getSearchDefault,
	getSearchHot,
	getSearchSuggest,
	// 排行榜
	getToplistDetail,
	getToplist,
	// 社区
	getEvent,
	getHotTopic,
	getHotComment,
	// 评论
	getSongComment,
	getPlaylistComment,
	getAlbumComment,
	getNewComment,
	likeComment,
	postNewComment,
	deleteComment,
	// 视频
	getVideoUrl,
	getVideoDetailInfo,
	toggleResourceLike,
	getVideoComments,
	getMvComments,
	convertMlogToVideo,
	getMlogUrl,
	getMvUrl,
	getMvDetail,
	getMvDetailInfo,
	getMvWiki,
	// 歌手
	getArtistDetail,
	getArtistDesc,
	getArtistSongs,
	getArtistAlbum,
	getArtistMv,
	getArtistFollowCount,
	getUgcArtist,
	getArtistDetailDynamic
}
