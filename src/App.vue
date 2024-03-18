<template>
  <h1>hello wn</h1>
  <h2>
    <span>count is {{count}}</span>
    <button @click="count++">点我</button>
  </h2>
  <div class="desc">
    <p>{{desc}}</p>
  </div>
</template>

<script>
import { ref } from 'vue'
export default  {
  setup() {
    const count = ref(1)

    const desc = ref('一个幽默风趣的帅哥...')  // 测试热更新

    return { count, desc }
  }
}

</script>

<style lang="css" scoped>
h1{
  color: red;
}
</style>