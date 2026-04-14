import { createApp } from 'vue';
import App from './App.vue';
import { vHoldRepeat } from '@/lib';
import '@/lib/styles/reset.css';
import '@/lib/styles/tokens.css';
import './styles/base.css';
import './styles/theme-widgets.css';

createApp(App).directive('hold-repeat', vHoldRepeat).mount('#app');
