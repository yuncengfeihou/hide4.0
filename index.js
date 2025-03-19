import { extension_settings, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
import { callPopup } from "../../../../script.js";
import { getContext } from "../../../extensions.js";
import { hideChatMessageRange } from "../../../chats.js";

const extensionName = "hide-helper";
const defaultSettings = {
    hideLastN: 0,
    advancedStart: -1,
    advancedEnd: -1,
    lastAppliedSettings: null
};

// Initialize extension settings
function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
}

// Create UI panel
function createUI() {
    const hideHelperPanel = document.createElement('div');
    hideHelperPanel.id = 'hide-helper-panel';
    hideHelperPanel.innerHTML = `
        <h4>隐藏助手</h4>
        <div class="hide-helper-section">
            <label for="hide-last-n">隐藏楼层:</label>
            <input type="number" id="hide-last-n" min="0" placeholder="隐藏最后N层之前的消息">
            <div class="hide-helper-buttons">
                <button id="hide-advanced-btn">高级设置</button>
                <button id="hide-apply-btn">应用</button>
            </div>
        </div>
        <button class="save-settings-btn" id="hide-save-settings-btn">保存当前设置</button>
    `;
    document.body.appendChild(hideHelperPanel);

    // Setup event listeners
    setupEventListeners();
}

// Setup event listeners for UI elements
function setupEventListeners() {
    // Last N hide input
    const hideLastNInput = document.getElementById('hide-last-n');
    hideLastNInput.value = extension_settings[extensionName].hideLastN || '';
    hideLastNInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 0;
        extension_settings[extensionName].hideLastN = value;
        saveSettingsDebounced();
    });

    // Advanced settings button
    document.getElementById('hide-advanced-btn').addEventListener('click', showAdvancedSettings);

    // Apply button
    document.getElementById('hide-apply-btn').addEventListener('click', applyHideSettings);

    // Save settings button
    document.getElementById('hide-save-settings-btn').addEventListener('click', saveCurrentSettings);

    // Listen for new messages to reapply settings if needed
    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        if (extension_settings[extensionName].lastAppliedSettings) {
            applyLastSettings();
        }
    });
}

// Show advanced settings popup
async function showAdvancedSettings() {
    const context = getContext();
    const chatLength = context.chat?.length || 0;
    const defaultStart = extension_settings[extensionName].advancedStart || -1;
    const defaultEnd = extension_settings[extensionName].advancedEnd || (chatLength + 1);

    const content = `
        <div>
            <p>设置要隐藏的消息范围 (会隐藏第X+1至Y-1条消息)</p>
            <div class="hide-advanced-panel">
                <input id="hide-start-idx" type="number" value="${defaultStart}" placeholder="开始位置">
                <input id="hide-end-idx" type="number" value="${defaultEnd}" placeholder="结束位置">
            </div>
        </div>
    `;

    const result = await callPopup(content, 'confirm');
    if (result) {
        const startIdx = parseInt(document.getElementById('hide-start-idx').value) || -1;
        const endIdx = parseInt(document.getElementById('hide-end-idx').value) || (chatLength + 1);
        
        extension_settings[extensionName].advancedStart = startIdx;
        extension_settings[extensionName].advancedEnd = endIdx;
        saveSettingsDebounced();
        
        // Apply advanced settings
        if (startIdx >= -1 && endIdx > startIdx) {
            applyAdvancedHideSettings(startIdx, endIdx);
        }
    }
}

// Apply hide settings based on "hide last N" option
async function applyHideSettings() {
    const context = getContext();
    const chatLength = context.chat?.length || 0;
    
    if (chatLength === 0) return;
    
    const hideLastN = extension_settings[extensionName].hideLastN || 0;
    
    if (hideLastN > 0 && hideLastN < chatLength) {
        const visibleStart = chatLength - hideLastN;
        // First unhide all messages
        await hideChatMessageRange(0, chatLength - 1, true);
        // Then hide the range we want to hide
        await hideChatMessageRange(0, visibleStart - 1, false);
        
        extension_settings[extensionName].lastAppliedSettings = {
            type: 'lastN',
            value: hideLastN
        };
        saveSettingsDebounced();
    } else if (hideLastN === 0) {
        // Unhide all messages
        await hideChatMessageRange(0, chatLength - 1, true);
        extension_settings[extensionName].lastAppliedSettings = null;
        saveSettingsDebounced();
    }
}

// Apply advanced hide settings
async function applyAdvancedHideSettings(startIdx, endIdx) {
    const context = getContext();
    const chatLength = context.chat?.length || 0;
    
    if (chatLength === 0) return;
    
    // First unhide all messages
    await hideChatMessageRange(0, chatLength - 1, true);
    
    // Then hide the specific range
    if (startIdx >= -1 && endIdx > startIdx && startIdx < chatLength - 1) {
        const actualStart = Math.max(0, startIdx + 1);
        const actualEnd = Math.min(chatLength - 1, endIdx - 1);
        
        await hideChatMessageRange(actualStart, actualEnd, false);
        
        extension_settings[extensionName].lastAppliedSettings = {
            type: 'advanced',
            start: startIdx,
            end: endIdx
        };
        saveSettingsDebounced();
    }
}

// Save current settings
function saveCurrentSettings() {
    const hideLastN = extension_settings[extensionName].hideLastN || 0;
    const advancedStart = extension_settings[extensionName].advancedStart || -1;
    const advancedEnd = extension_settings[extensionName].advancedEnd || -1;
    
    if (hideLastN > 0) {
        applyHideSettings();
    } else if (advancedStart >= -1 && advancedEnd > advancedStart) {
        applyAdvancedHideSettings(advancedStart, advancedEnd);
    }
    
    toastr.success('隐藏设置已保存并应用');
}

// Apply last saved settings
async function applyLastSettings() {
    const lastSettings = extension_settings[extensionName].lastAppliedSettings;
    
    if (!lastSettings) return;
    
    if (lastSettings.type === 'lastN') {
        await applyHideSettings();
    } else if (lastSettings.type === 'advanced') {
        await applyAdvancedHideSettings(lastSettings.start, lastSettings.end);
    }
}

// Initialize extension
jQuery(async () => {
    loadSettings();
    createUI();
    
    // Apply last settings if any
    if (extension_settings[extensionName].lastAppliedSettings) {
        setTimeout(applyLastSettings, 1000); // Slight delay to ensure chat is loaded
    }
});
