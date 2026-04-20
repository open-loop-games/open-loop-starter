import { createApp } from '@/archetypes/producer';
import '@/lib/styles/reset.css';
import '@/lib/styles/tokens.css';
import './styles/base.css';
import './styles/theme-widgets.css';

const { mount } = createApp();
mount('#app');
