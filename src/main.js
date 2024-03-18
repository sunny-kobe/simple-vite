import { createApp } from 'vue' // vue 来自于 node_modules 不是一个正常的 '../' 路径
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
