const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';
const ORG_NAME = 'Renetherite';

let versionsData = {};

try {
    if (fs.existsSync('versions.json')) {
        versionsData = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
    }
} catch (error) {
    console.log('No existing versions data found, starting fresh');
}


async function getLatestRelease(owner, repo) {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/latest`, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ReNetherite-Release-Tracker'
        }
    });
    
    if (!response.ok) {
        if (response.status === 404) {
            console.log(`No releases found for ${owner}/${repo}`);
            return null;
        }
        throw new Error(`Failed to fetch release for ${owner}/${repo}: ${response.statusText}`);
    }
    
    return await response.json();
}


function updateIndexHTML(plugins) {
}


async function checkAllPlugins() {
    console.log('Checking plugin releases...');
    
        const pluginsList = process.env.PLUGINS_LIST.split(',').map(p => p.trim());
    
    const updatedPlugins = [];
    let hasChanges = false;
    
    for (const pluginName of pluginsList) {
        const repository = `${ORG_NAME}/${pluginName}`;
        console.log(`Checking ${repository}...`);
        
        try {
            const release = await getLatestRelease(ORG_NAME, pluginName);
            
            if (release) {
                const version = release.tag_name.startsWith('v') 
                    ? release.tag_name.substring(1) 
                    : release.tag_name;
                
                const currentVersion = versionsData[repository];
                
                if (!currentVersion || currentVersion !== version) {
                    console.log(`New version found for ${pluginName}: ${version} (was: ${currentVersion || 'none'})`);
                    versionsData[repository] = version;
                    hasChanges = true;
                } else {
                    console.log(`${pluginName}: No new version (current: ${version})`);
                }
                
                updatedPlugins.push({
                    name: pluginName,
                    repository: repository,
                    version: version
                });
            } else {
                updatedPlugins.push({
                    name: pluginName,
                    repository: repository,
                    version: 'No releases'
                });
            }
        } catch (error) {
            console.error(`Error checking ${repository}:`, error.message);
            updatedPlugins.push({
                name: pluginName,
                repository: repository,
                version: 'Error checking'
            });
        }
    }
    
    if (hasChanges) {
        fs.writeFileSync('versions.json', JSON.stringify(versionsData, null, 2));
        console.log('Updated versions.json');
    }
    
    const pluginsData = {
        lastUpdated: new Date().toISOString(),
        plugins: updatedPlugins
    };
    
    fs.writeFileSync('plugins-data.json', JSON.stringify(pluginsData, null, 2));
    
    updateIndexHTML(updatedPlugins);
    console.log('Updated index.html');
    
    if (hasChanges) {
        console.log('Changes detected and saved');
    } else {
        console.log('No new releases found');
    }
}

checkAllPlugins().catch(error => {
    console.error('Error in main function:', error);
    process.exit(1);
});