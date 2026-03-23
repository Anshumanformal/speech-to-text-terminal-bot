const { exec } = require('child_process');

const APPS = {
    youtube: {
        name: 'YouTube',
        package: 'com.google.android.youtube',
        activity: 'com.google.android.apps.youtube.app.WatchActivity'
    },
    youtubeMusic: {
        name: 'YouTube Music',
        package: 'com.google.android.apps.youtube.music',
        activity: 'com.google.android.apps.youtube.music.activity.MainActivity'
    },
    spotify: {
        name: 'Spotify',
        package: 'com.spotify.music',
        activity: 'com.spotify.music.MainActivity'
    },
    settings: {
        name: 'Settings',
        package: 'com.android.settings',
        activity: 'com.android.settings.SettingsActivity'
    },
    chrome: {
        name: 'Chrome',
        package: 'com.android.chrome',
        activity: 'com.google.android.apps.chrome.Main'
    },
    whatsapp: {
        name: 'WhatsApp',
        package: 'com.whatsapp',
        activity: 'com.whatsapp.Main'
    },
    files: {
        name: 'Files',
        package: 'com.android.documentsui',
        activity: 'com.android.documentsui.FilesActivity'
    }
};

function openApp(appKey) {
    return new Promise((resolve, reject) => {
        const app = APPS[appKey.toLowerCase()];
        
        if (!app) {
            reject(new Error(`Unknown app: ${appKey}. Available: ${Object.keys(APPS).join(', ')}`));
            return;
        }

        const command = `am start --user 0 -n ${app.package}/${app.activity}`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Failed to open ${app.name}:`, error.message);
                reject(error);
                return;
            }
            console.log(`✅ Opened ${app.name}`);
            resolve(true);
        });
    });
}

function openAppWithUrl(appKey, url) {
    return new Promise((resolve, reject) => {
        const app = APPS[appKey.toLowerCase()];
        
        if (!app) {
            reject(new Error(`Unknown app: ${appKey}`));
            return;
        }

        const command = `am start --user 0 -a android.intent.action.VIEW -d "${url}" -n ${app.package}/${app.activity}`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Failed to open ${app.name} with URL:`, error.message);
                reject(error);
                return;
            }
            console.log(`✅ Opened ${app.name} with URL`);
            resolve(true);
        });
    });
}

function getAvailableApps() {
    return Object.keys(APPS);
}

function listApps() {
    console.log('📱 Available apps to launch:');
    Object.entries(APPS).forEach(([key, app]) => {
        console.log(`   ${key.padEnd(15)} - ${app.name}`);
    });
}

module.exports = {
    openApp,
    openAppWithUrl,
    getAvailableApps,
    listApps,
    APPS
};
