import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter({ out: 'build', fallback: 'index.html', strict: false }),
        alias: {
            $actions: 'src/lib/actions',
            $components: 'src/lib/components',
            $icons: 'src/lib/icons',
            $stores: 'src/lib/stores',
            $utils: 'src/lib/utils'
        }
    },
    preprocess: vitePreprocess(),
    onwarn: (warning, handler) => {
        if (warning.code.startsWith('a11y-')) {
            return;
        }
        handler(warning);
    },
    vitePlugin: {
        inspector: {
            holdMode: true,
            toggleKeyCombo: 'control-shift'
        }
    }
};

export default config;
