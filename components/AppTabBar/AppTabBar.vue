<template>
  <view class="custom-tabbar">
    <view
        v-for="(item, index) in tabItems"
        :key="item.name"
        class="tab-item"
        :class="{ active: currentPage === item.name }"
        @click="onItemClick(item.name)"
    >
      <i :class="['iconfont', item.icon]" />
      <text>{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({ currentPage: String })
const emit = defineEmits(['tabChange'])
const tabItems = [
  { name: 'discovery', icon: 'icon-faxian', text: '发现' },
  { name: 'roam', icon: 'icon-yinle1', text: '漫游' },
  { name: 'my', icon: 'icon-wode1', text: '我的' },
  { name: 'community', icon: 'icon-duihua3', text: '云村' }
]
const onItemClick = (name) => {
  if (name === props.currentPage) return
  emit('tabChange', name)
  uni.reLaunch({ url: `/pages/${name}/${name}` })
}
</script>

<style lang="scss" scoped>
.custom-tabbar {
  display: flex;
  height: 100rpx;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 20rpx;
    color: #999;
    i {
      font-size: 40rpx;
      margin-bottom: 4rpx;
    }
    &.active {
      color: $theme-color;
    }
  }
}
</style>